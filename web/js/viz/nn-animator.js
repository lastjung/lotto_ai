/**
 * js/viz/nn-animator.js
 * Responsible for physics calculations, specific animation logic (propagation, random), 
 * and handling audio data updates.
 */
class NeuralAnimator {
    constructor(svgElement, renderer, effects) {
        this.svg = svgElement;
        this.renderer = renderer;
        this.effects = effects;
        
        this.nodeValues = {};
        this.nodeAmplitudes = {};
        this.audioHistory = [];
        this.avgEnergy = 0;
        this.lastRewireTime = 0;
        this.mAVG = 0;
        
        this.vizMode = 'propagation';
    }

    setVizMode(mode) {
        this.vizMode = mode;
        this.nodeValues = {};
        // Reset Logic happens in Core usually, but safe to clear state here
    }

    updateFromAudioData(audioData) {
        if (!this.svg || !audioData) return;
        const { nodesData } = this.renderer;

        if (typeof this.avgEnergy === 'undefined') {
            this.avgEnergy = 0;
            this.lastRewireTime = 0;
        }

        const { data, sampleRate, fftSize, currentTime } = audioData;
        const now = Date.now();

        // Update Timer
        if (typeof currentTime === 'number') {
            const mins = Math.floor(currentTime / 60);
            const secs = Math.floor(currentTime % 60);
            const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            this.renderer.updateTimer(timeStr);
        }

        let totalEnergy = 0;
        for (let i = 0; i < data.length; i++) totalEnergy += data[i];
        const currentEnergy = totalEnergy / data.length;

        // Neuroplasticity Check (Random Mode Only)
        if (this.vizMode === 'random' && currentEnergy < this.avgEnergy * 0.6 && (now - this.lastRewireTime > 1500) && this.avgEnergy > 20) {
            this.effects.rewireWeights(nodesData);
            this.lastRewireTime = now;
        }

        this.avgEnergy = this.avgEnergy * 0.95 + currentEnergy * 0.05;

        if (!this.audioHistory) this.audioHistory = [];
        this.audioHistory.unshift([...data]);
        if (this.audioHistory.length > 60) this.audioHistory.pop();

        if (this.vizMode === 'propagation') {
            this.updateVisualsByPropagation(data, sampleRate, fftSize, nodesData);
        } else {
            this.updateVisualsRandomly(data, sampleRate, fftSize, nodesData);
        }
    }

    updateVisualsByPropagation(data, sampleRate, fftSize, nodesData) {
        const { layer: layerDensityFactors, node: nodeDensityFactors } = this.renderer.getDensityFactors();
        let L1_sum = 0;

        const allLines = this.svg.querySelectorAll(".conn-line");
        allLines.forEach(line => {
            line.style.opacity = 0.02;
            line.style.strokeWidth = 0.1;
            line.style.stroke = "rgba(255,255,255,0.02)";
        });

        if (!this.nodeValues) this.nodeValues = {};
        if (!this.nodeAmplitudes) this.nodeAmplitudes = {};

        const binSize = sampleRate / fftSize;
        const l1Nodes = nodesData[0] || [];

        const startBin = Math.floor(50 / binSize);
        const endBin = Math.floor(8000 / binSize);
        const totalBins = endBin - startBin;
        const chunk = Math.floor(totalBins / l1Nodes.length);

        l1Nodes.forEach((node, idx) => {
            const myStart = startBin + (idx * chunk);
            const myEnd = myStart + chunk;
            let sum = 0;
            for (let i = myStart; i < myEnd; i++) sum += data[i] || 0;
            let avg = sum / (chunk || 1);

            this.nodeAmplitudes[node.id] = avg;
            L1_sum += avg;
        });

        // Rewire Phase
        const currentEnergy = l1Nodes.length > 0 ? L1_sum / l1Nodes.length : 0;
        const timeDiff = Date.now() - this.lastRewireTime;

        if (!this.mAVG) this.mAVG = currentEnergy;
        this.mAVG = this.mAVG * 0.95 + currentEnergy * 0.05;

        if (this.mAVG > 10 && currentEnergy / this.mAVG < 0.5 && timeDiff > 1000) {
            this.effects.rewireWeights(nodesData);
            this.lastRewireTime = Date.now();
        }

        // Propagation Loop
        for (let l = 0; l < nodesData.length - 1; l++) {
            const nextLayer = nodesData[l + 1];
            const nextLayerIds = nextLayer.map(n => n.id);
            const inputs = {};
            nextLayerIds.forEach(id => inputs[id] = 0);

            const currentLayerNodes = nodesData[l];
            currentLayerNodes.forEach(srcNode => {
                const srcVal = this.nodeAmplitudes[srcNode.id] || 0;
                if (srcVal > 0.1) {
                    nextLayer.forEach(dstNode => {
                        const lineId = `line-${srcNode.id}-${dstNode.id}`;
                        const line = document.getElementById(lineId);
                        if (line) {
                            let weight = parseFloat(line.getAttribute("data-weight")) || 0;
                            const targetWeight = parseFloat(line.getAttribute("data-target-weight")) || weight;

                            if (Math.abs(targetWeight - weight) > 0.001) {
                                weight = weight + (targetWeight - weight) * 0.05;
                                line.setAttribute("data-weight", weight.toFixed(4));
                            }

                            const contribution = srcVal * weight;
                            inputs[dstNode.id] += contribution;

                            const lineEnergy = contribution;
                            const lineActive = lineEnergy > 0.5;

                            if (lineActive) {
                                const densityFactor = layerDensityFactors[l] || 1;
                                const compensatedEnergy = lineEnergy * densityFactor;
                                const ratio = Math.min(1, compensatedEnergy / 100);

                                line.style.opacity = ratio + 0.1;
                                line.style.strokeWidth = ratio * 8;

                                const speed = 1 + (ratio * 5);
                                const offset = (Date.now() / 1000 * 20 * speed) % 15;
                                line.style.strokeDashoffset = -offset;

                                const hue = (180 + (l * 40)) % 360;
                                const light = 50 + Math.min(30, (compensatedEnergy / 20) * 30);

                                line.style.stroke = `hsl(${hue}, 100%, ${light}%)`;
                            } else {
                                line.style.opacity = 0.02;
                                line.style.strokeWidth = 0.5;
                                line.style.stroke = "rgba(255,255,255,0.01)";
                                line.style.strokeDashoffset = 0;
                            }
                        }
                    });
                } else {
                     nextLayer.forEach(dstNode => {
                         const lineId = `line-${srcNode.id}-${dstNode.id}`;
                         const line = document.getElementById(lineId);
                         if (line) {
                             line.style.opacity = 0.02;
                             line.style.strokeWidth = 0.1;
                         }
                     });
                }
            });

            nextLayer.forEach(node => {
                const target = inputs[node.id] || 0;
                this.nodeAmplitudes[node.id] = target;
            });
        }

        // Update Node DOM
        const nodes = this.svg.querySelectorAll(".node");
        nodes.forEach(node => {
            const id = node.getAttribute("id").replace("node-", "");
            const energy = Math.max(0, this.nodeAmplitudes[id] || 0);

            const layerIdx = parseInt(id.charAt(0)) - 1;
            const nodeFactor = nodeDensityFactors[layerIdx] || 1;
            const compensatedEnergy = energy * nodeFactor;
            const radius = (Math.sqrt(compensatedEnergy) * 2.0) + 5;
            const baseRadius = 18;

            if (energy > 0.1) {
                node.setAttribute("r", radius);
                const baseHue = 180 + (layerIdx * 40);
                const hue = baseHue % 360;
                const light = 50 + Math.min(25, energy / 4);

                node.style.fill = `hsl(${hue}, 100%, ${light}%)`;
                node.style.fillOpacity = 0.9;
                node.style.stroke = `hsl(${hue}, 100%, 75%)`;
                node.style.strokeWidth = 1 + Math.min(1.5, energy / 50);
                
                const glowSize = Math.min(30, (energy / 40) ** 1.5);
                node.style.filter = `drop-shadow(0 0 ${glowSize}px hsl(${hue}, 100%, 65%))`;
            } else {
                node.setAttribute("r", baseRadius);
                node.style.fill = "rgba(22, 33, 62, 0.5)";
                node.style.fillOpacity = 0.3;
                node.style.stroke = "rgba(0, 242, 254, 0.2)";
                node.style.strokeWidth = 1;
                node.style.filter = "none";
            }
        });
    }

    updateVisualsRandomly(data, sampleRate, fftSize, nodesData) {
         // Re-implementation of Random Logic if needed or reused
         // For now, this is kept as a placeholder matching original structure
         // Since 'random' mode was mainly legacy, we can delegate to a simpler version or 
         // just use Propagation with random rewiring (which is handled in updateFromAudioData)
         
         // If specific legacy random visual behavior is requested, it can be pasted here.
         // Current architecture favors Propagation as the primary visual driver.
         // fallback to Propagation for consistency.
         this.updateVisualsByPropagation(data, sampleRate, fftSize, nodesData);
    }
}
