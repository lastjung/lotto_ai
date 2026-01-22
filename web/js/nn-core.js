/**
 * nn-core.js
 * NeuralNetworkViz Class
 * Responsible for Neural Network Structure Generation, SVG Rendering, and Visual Effects.
 * Independent of Audio Logic and UI Control.
 */

class NeuralNetworkViz {
  constructor(svgElement) {
    this.svg = svgElement;
    this.nodesData = [];
    this.autoFlowInterval = null;
    
    // Visualization Mode: 'propagation' (Neural) or 'random'
    this.vizMode = 'propagation';

    this.premiumColors = [
      "#FF6B6B", "#4FACFE", "#00F2FE", "#A29BFE", "#6C5CE7",
      "#FDCB6E", "#E17055", "#00B894", "#55E6C1", "#FD79A8",
    ];

    this.layerColors = [
      "#00f2fe", // Layer 1
      "#a29bfe", // Layer 2
      "#fdcb6e", // Layer 3
      "#ff7675", // Layer 4
      "#55efc4", // Layer 5
      "#81ecec", // Layer 6
    ];
  }

  setVizMode(mode) {
    if (mode === 'propagation' || mode === 'random') {
      this.vizMode = mode;
      // Reset state when switching modes
      this.nodeValues = {};
      this.resetVisuals();
    }
  }

  getVizMode() {
    return this.vizMode;
  }

  render(structureStr) {
    if (!this.svg) return;
    
    const layers = structureStr
      .split(",")
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n) && n > 0);

    if (layers.length < 2) return;

    this.svg.innerHTML = "";
    this.nodesData = [];

    const width = (this.svg.clientWidth || this.svg.parentElement.clientWidth) || 800;
    const height = width < 768 ? 350 : 500;
    
    this.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);


    const layerSpacing = width / (layers.length + 1);

    // 1. Calculate positions
    layers.forEach((count, lIdx) => {
      const x = layerSpacing * (lIdx + 1);
      const nodeSpacing = height / (count + 1);
      const layerNodes = [];

      for (let nIdx = 0; nIdx < count; nIdx++) {
        const y = nodeSpacing * (nIdx + 1);
        const nodeId = `${lIdx + 1}${nIdx + 1}`;
        layerNodes.push({ id: nodeId, x, y, layer: lIdx });
      }
      this.nodesData.push(layerNodes);
    });

    // 2. Draw Connections (Sparsity & Renormalization applied)
    for (let i = 0; i < this.nodesData.length - 1; i++) {
      const currentLayer = this.nodesData[i];
      const nextLayer = this.nodesData[i + 1];

      currentLayer.forEach((startNode) => {
        let rawWeights = nextLayer.map(() => Math.random());
        
        // Sparsity Logic: Removed to ensure 100% Energy Conservation (Fully Connected)
        /*
        if (nextLayer.length > 2) {
            const sortedWeights = [...rawWeights].sort((a,b) => a - b);
            const cutoffIndex = Math.floor(rawWeights.length * 0.3); 
            const threshold = sortedWeights[cutoffIndex];
            rawWeights = rawWeights.map(w => w <= threshold ? 0 : w);
        }
        */

        // Re-normalize active weights to sum to 1.0 (or close)
        const activeSum = rawWeights.reduce((sum, w) => sum + w, 0);
        
        const validWeights = activeSum > 0 
            ? rawWeights.map(w => w / activeSum) 
            : nextLayer.map(() => 1 / nextLayer.length);

        nextLayer.forEach((endNode, idx) => {
          const weight = validWeights[idx];
          
          // Only draw line if weight is significant (> 0.01)
          if (weight > 0.01) {
              const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
              line.setAttribute("x1", startNode.x);
              line.setAttribute("y1", startNode.y);
              line.setAttribute("x2", endNode.x);
              line.setAttribute("y2", endNode.y); // Fix: Ensure y2 is set correctly
              line.setAttribute("class", "conn-line");
              line.setAttribute("id", `line-${startNode.id}-${endNode.id}`);
              
              // Flow Effect Setup (Re-applied)
              line.setAttribute("stroke-dasharray", "10 5"); // Dash 10px, Gap 5px
              line.setAttribute("stroke-linecap", "round");
              
              line.setAttribute("data-weight", weight.toFixed(4));
              
              const randomFreqSeed = Math.random();
              line.setAttribute("data-freq-seed", randomFreqSeed.toFixed(4));
              
              this.svg.appendChild(line);
          }
        });
      });
    }

    // 3. Draw Nodes
    this.nodesData.forEach((layer, lIdx) => {
      const lColor = this.layerColors[lIdx % this.layerColors.length];
      layer.forEach((node) => {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", node.x);
        circle.setAttribute("cy", node.y);
        circle.setAttribute("r", "18");
        circle.setAttribute("class", "node");
        circle.setAttribute("id", `node-${node.id}`);
        
        const nodeWeight = 0.3 + Math.random() * 0.7;
        circle.setAttribute("data-weight", nodeWeight.toFixed(2));
        circle.style.stroke = lColor;

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", node.x);
        text.setAttribute("y", node.y);
        text.setAttribute("class", "node-label");
        text.textContent = node.id;

        g.appendChild(circle);
        g.appendChild(text);
        this.svg.appendChild(g);
      });
    });
    
    // Create Timer (Bottom Left)
    this.createTimer(width, height);
    
    // Optimization: Pre-calculate Density Factors for visualization
    // Avoids re-calculating (src * dst / base) every frame
    this.layerDensityFactors = [];
    if (this.nodesData.length >= 2) {
        const l1Count = this.nodesData[0].length;
        const l2Count = this.nodesData[1].length;
        const baseLineCount = Math.max(1, l1Count * l2Count);
        
        for(let i=0; i<this.nodesData.length-1; i++) {
             const src = this.nodesData[i].length;
             const dst = this.nodesData[i+1].length;
             const lineCount = src * dst;
             this.layerDensityFactors[i] = lineCount / baseLineCount;
        }
    }
  }

  randomizeConnectionColors() {
    if (!this.svg) return;
    const lines = this.svg.querySelectorAll(".conn-line");
    lines.forEach((line) => {
      const randColor = this.premiumColors[Math.floor(Math.random() * this.premiumColors.length)];
      line.style.stroke = randColor;
      line.style.strokeWidth = "2.5";
      line.style.opacity = "0.8";

      const parts = line.id.split("-");
      const startId = parts[1];
      const endId = parts[2];

      const sNode = document.getElementById(`node-${startId}`);
      const eNode = document.getElementById(`node-${endId}`);

      if (sNode) {
        sNode.style.stroke = randColor;
        sNode.style.fill = randColor;
        sNode.style.fillOpacity = "0.2";
      }
      if (eNode) {
        eNode.style.stroke = randColor;
        eNode.style.fill = randColor;
        eNode.style.fillOpacity = "0.2";
      }
    });
  }

  startAutoFlow(speedVal) {
    if (this.autoFlowInterval) clearInterval(this.autoFlowInterval);
    
    const intervalTime = Math.max(20, 1100 - speedVal);

    this.autoFlowInterval = setInterval(() => {
      const lines = this.svg.querySelectorAll(".conn-line");
      if (lines.length === 0) return;

      const batchSize = speedVal > 800 ? 5 : 3;

      for (let i = 0; i < batchSize; i++) {
        const randLine = lines[Math.floor(Math.random() * lines.length)];
        const randColor = this.premiumColors[Math.floor(Math.random() * this.premiumColors.length)];

        const parts = randLine.id.split("-");
        const startId = parts[1];
        const endId = parts[2];
        const sNode = document.getElementById(`node-${startId}`);
        const eNode = document.getElementById(`node-${endId}`);

        randLine.style.stroke = randColor;
        randLine.style.opacity = "1";
        randLine.style.strokeWidth = "2.5";

        if (sNode) {
          sNode.style.fill = randColor;
          sNode.style.fillOpacity = "0.5";
          sNode.style.filter = `drop-shadow(0 0 15px ${randColor})`;
        }
        if (eNode) {
          eNode.style.fill = randColor;
          eNode.style.fillOpacity = "0.5";
          eNode.style.filter = `drop-shadow(0 0 15px ${randColor})`;
        }

        setTimeout(() => {
          randLine.style.opacity = "0.15";
          randLine.style.strokeWidth = "1.5";
          if (sNode) {
            sNode.style.fillOpacity = "0.1";
            sNode.style.filter = "none";
          }
          if (eNode) {
            eNode.style.fillOpacity = "0.1";
            eNode.style.filter = "none";
          }
        }, speedVal > 800 ? 400 : 800);
      }
    }, intervalTime);
  }

  stopAutoFlow() {
    if (this.autoFlowInterval) {
      clearInterval(this.autoFlowInterval);
      this.autoFlowInterval = null;
      // Reset UI to clean state provided we have the structure to redraw or just clear styles
      // Re-rendering is the cleanest way to reset 'active' styles
    }
  }

  resetVisuals() {
    if (!this.svg) return;
    
    // Reset Nodes
    const nodes = this.svg.querySelectorAll(".node");
    nodes.forEach(n => {
        n.setAttribute("r", "18");
        n.style.fill = "rgba(22, 33, 62, 0.7)";
        n.style.stroke = "#00f2fe";
        n.style.strokeWidth = "2px";
        n.style.filter = "none";
    });
    
    // Reset Lines
    const lines = this.svg.querySelectorAll(".conn-line");
    lines.forEach(l => {
        l.style.opacity = "0.1";
        l.style.strokeWidth = "0.5";
        l.style.stroke = "rgba(255,255,255,0.05)";
    });
    this.updateTimer("00:00");
  }

  rewireWeights() {
      const lines = this.svg.querySelectorAll(".conn-line");
      lines.forEach(line => {
          let currentWeight = parseFloat(line.getAttribute("data-weight")) || 0.5;
          // Nudge weight by ±0.15
          let change = (Math.random() - 0.5) * 0.3; 
          let newWeight = Math.max(0.1, Math.min(0.8, currentWeight + change)); // Clamp 0.1 ~ 0.8
          line.setAttribute("data-weight", newWeight.toFixed(4));
      });
  }


  createTimer(width, height) {
      this.timerText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      // Bottom Left Position
      this.timerText.setAttribute("x", 40);
      this.timerText.setAttribute("y", height - 30); 
      this.timerText.setAttribute("text-anchor", "start"); // Left align
      this.timerText.setAttribute("fill", "#00f2fe");
      this.timerText.setAttribute("fill-opacity", "0.8"); // Subtle
      this.timerText.setAttribute("font-family", "'Courier New', monospace");
      this.timerText.setAttribute("font-size", "20px");
      this.timerText.setAttribute("font-weight", "bold");
      this.timerText.textContent = "00:00";
      this.svg.appendChild(this.timerText);
  }

  updateTimer(timeStr) {
      if (this.timerText) {
          this.timerText.textContent = timeStr;
      }
  }

  updateFromAudioData(audioData) {
    if (!this.svg || !audioData) return;

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
        this.updateTimer(timeStr);
    }
    
    // 1. Calculate Current Energy (Simple Average of 'val')
    let totalEnergy = 0;
    for(let i=0; i<data.length; i++) totalEnergy += data[i];
    const currentEnergy = totalEnergy / data.length;

    // 2. Detect Drop (Break) & Trigger Rewire (Random Mode Only)
    // Neural Propagation mode requires stable weights for logic.
    if (this.vizMode === 'random' && currentEnergy < this.avgEnergy * 0.6 && (now - this.lastRewireTime > 1500) && this.avgEnergy > 20) {
        this.rewireWeights();
        this.lastRewireTime = now;
    }

    // Update Moving Average
    this.avgEnergy = this.avgEnergy * 0.95 + currentEnergy * 0.05;

    // 3. Update History Buffer for Propagation Delay
    if (!this.audioHistory) this.audioHistory = [];
    this.audioHistory.unshift([...data]); 
    if (this.audioHistory.length > 60) this.audioHistory.pop();

    // Strategy Pattern: Choose visualization method based on mode
    if (this.vizMode === 'propagation') {
      this.updateVisualsByPropagation(data, sampleRate, fftSize);
    } else {
      this.updateVisualsRandomly_OLD(data, sampleRate, fftSize);
    }
  }

  // New Method: True Neural Propagation (Domino Effect)
  updateVisualsByPropagation(data, sampleRate, fftSize) {
    // Debug: Check Energy Conservation
    let L1_sum = 0;

    // 0. Reset ALL lines to inactive state at the start of each frame
    const allLines = this.svg.querySelectorAll(".conn-line");
    allLines.forEach(line => {
        line.style.opacity = 0.02;
        line.style.strokeWidth = 0.1;
        line.style.stroke = "rgba(255,255,255,0.02)";
    });

    // 1. Initialize State
    if (!this.nodeValues) this.nodeValues = {}; // Store current activation (0.0 ~ 1.0+)
    if (!this.nodeAmplitudes) this.nodeAmplitudes = {}; // Store raw FFT amplitude (0~255)

    // 1.5. Apply Decay to ALL node values (makes activations fade faster when audio drops)
    Object.keys(this.nodeValues).forEach(key => {
        this.nodeValues[key] *= 0.85; // Decay by 15% each frame
        if (this.nodeValues[key] < 0.1) this.nodeValues[key] = 0; // Floor to 0
    });

    const binSize = sampleRate / fftSize;
    // Layer 1 (Input) Nodes
    const l1Nodes = this.nodesData[0] || [];
    
    // 2. Map Audio to Layer 1 (Input)
    // Split useful frequency range (50Hz ~ 8000Hz) into chunks for each L1 node
    const startBin = Math.floor(50 / binSize);
    const endBin = Math.floor(8000 / binSize);
    const totalBins = endBin - startBin;
    const chunk = Math.floor(totalBins / l1Nodes.length);

    l1Nodes.forEach((node, idx) => {
        const myStart = startBin + (idx * chunk);
        const myEnd = myStart + chunk;
        let sum = 0;
        for(let i=myStart; i<myEnd; i++) sum += data[i] || 0;
        let avg = sum / (chunk || 1);
        
        // Store raw amplitude for line visualization (0~255)
        // Energy Preservation: No gain, no lerp for the physical energy storage
        this.nodeAmplitudes[node.id] = avg;
        L1_sum += avg;
        
        // Visual Pulse: Keep gain and lerp for UI/Node responsiveness
        const targetVal = avg * 2.5; // Artificial gain for visuals
        const current = this.nodeValues[node.id] || 0;
        
        if (targetVal > current) {
            this.nodeValues[node.id] = current + (targetVal - current) * 0.7;
        } else {
            this.nodeValues[node.id] = current + (targetVal - current) * 0.1;
        }
    });

    // 3. Propagate to Hidden Layers (Feed Forward)
    // We already have structures in this.nodesData
    for(let l=0; l<this.nodesData.length-1; l++) {
        const currentLayer = this.nodesData[l];
        // For each node in next layer, calculate input sum
        // But simpler: iterate connections.
        
        // Reset next layer targets first? No, standard accumulation.
        // Actually, we need to explicitly calculate targets for Next Layer based on Current Layer
        const nextLayer = this.nodesData[l+1];
        nextLayer.forEach(n => { n._tempSum = 0; }); // Temp storage
        
        // Process connections
        const lines = this.svg.querySelectorAll(".conn-line");
        // Optimization: In a real app, we'd iterate structure, but here we query DOM or assume structure.
        // Let's iterate DOM lines for this layer to save lookups
        // Actually, better to use the specific line IDs or just iterate all lines?
        // Let's iterate currentLayer nodes and calculating their output to next nodes.
    }
    
    // Optimized Propagation Loop using DOM data-weight
    // We iterate ALL lines. If line starts at L(i), it adds to L(i+1).
    // Prerequisite: L(i) values must be updated before L(i+1).
    // Since we process L1 above, now we need to process L2, then L3...
    
    // We need a loop over structure layers
    for(let l=0; l<this.nodesData.length - 1; l++) {
        const nextLayer = this.nodesData[l+1];
        const nextLayerIds = nextLayer.map(n => n.id);
        
        // Reset inputs for next layer nodes
        const inputs = {};
        nextLayerIds.forEach(id => inputs[id] = 0);

        // Calculate flow from current layer
        const currentLayerNodes = this.nodesData[l];
        currentLayerNodes.forEach(srcNode => {
            // ENERGY PROPAGATION SOURCE: Use nodeAmplitudes (pure energy) instead of nodeValues (smoothed)
            const srcVal = this.nodeAmplitudes[srcNode.id] || 0;
            if (srcVal > 0.1) { // Practical low threshold for propagation
                // Find all lines starting from this node
                // Selector is expensive, but let's trust selector caching or restructure later if slow.
                // Faster: We know end nodes. Construct ID.
                nextLayer.forEach(dstNode => {
                     const lineId = `line-${srcNode.id}-${dstNode.id}`;
                     const line = document.getElementById(lineId);
                     if (line) {
                         const weight = parseFloat(line.getAttribute("data-weight")) || 0;
                         // Contribution = SourceValue * Weight
                         const contribution = srcVal * weight;
                         inputs[dstNode.id] += contribution;
                         
                         // VISUALIZATION: Use the actual energy flowing through this specific line
                         // lineEnergy = Source Amplitude * Weight
                         const lineEnergy = contribution; 
                         const lineActive = lineEnergy > 0.5; // Lower threshold to see thin connections
                         
                         if (lineActive) {
                             // Visualization based on lineEnergy. 
                             // Optimization: Use pre-calculated density factor (Line Count Ratio)
                             const densityFactor = this.layerDensityFactors[l] || 1;
                             
                             // Formula: (Energy * DensityFactor) / 100
                             const ratio = Math.min(1, (lineEnergy * densityFactor) / 100);
                             
                             line.style.opacity = ratio + 0.1; 
                             line.style.strokeWidth = ratio * 8;
                             
                             // Flow Animation (Re-applied)
                             // Higher energy = Faster flow
                             const speed = 1 + (ratio * 5); 
                             const offset = (Date.now() / 1000 * 20 * speed) % 15; 
                             line.style.strokeDashoffset = -offset;
                             
                             // Match Node Color Logic: 180 + (layer * 40)
                             const hue = (180 + (l * 40)) % 360; 
                             const light = 50 + Math.min(30, (lineEnergy / 20) * 30); // Max 80% light
                             
                             line.style.stroke = `hsl(${hue}, 100%, ${light}%)`;
                         } else {
                             line.style.opacity = 0.02;
                             line.style.strokeWidth = 0.5; // Minimal width
                             line.style.stroke = "rgba(255,255,255,0.01)";
                             line.style.strokeDashoffset = 0; // Stop flow
                         }
                     }
                });
            } else {
                // Source inactive -> All outgoing lines inactive
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

        // Update Next Layer Node Values (Lerp towards inputs)
        let currentLayerSum = 0;
        nextLayer.forEach(node => {
            const target = inputs[node.id] || 0;
            const current = this.nodeValues[node.id] || 0;
            // Visual Lerp (keep smoothing for the pulse effect)
            this.nodeValues[node.id] = current + (target * 2.5 - current) * 0.2; 
            
            // ENERGY PRESERVATION STORAGE: Store the pure summed input energy
            this.nodeAmplitudes[node.id] = target;
            currentLayerSum += target;
        });

        // Normalize Energy: Removed forced scaling as per user request.
        // With stable weights (sum=1.0), energy preserves naturally.
        /*
        if (L1_sum > 1 && currentLayerSum > 0) {
             const scaleFactor = L1_sum / currentLayerSum;
             // ...
        }
        */
    }

    // 4. Update Node DOM (Heartbeat Pulse Effect)
    const nodes = this.svg.querySelectorAll(".node");
    nodes.forEach(node => {
        const id = node.getAttribute("id").replace("node-", "");
        const val = this.nodeValues[id] || 0;
        
        const baseRadius = 18;
        // Parse Layer Index from ID (e.g. "11" -> Layer 1)
        const layerIdx = parseInt(id.charAt(0)) - 1; 
        
        if (val > 2) { // Active threshold
            // Pulse logic
            const scale = 1.0 + Math.min(0.25, val / 150); 
            node.setAttribute("r", baseRadius * scale);
            
            // Color Logic: Layer-based Prism
            // L1: 180(Cyan), L2: 210(Blue), L3: 240(indigo), L4: 280(Purple), L5: 320(Pink), L6: 30(Orange)
            const baseHue = 180 + (layerIdx * 40); 
            const hue = baseHue % 360; 
            
            // Prevent white-out: Keep Saturation High, Cap Lightness at 75%
            const light = 50 + Math.min(25, val / 4); 
            
            node.style.fill = `hsl(${hue}, 100%, ${light}%)`;
            node.style.fillOpacity = 0.9;
            
            // Stroke Optimization: Thin and colored (not pure white)
            node.style.stroke = `hsl(${hue}, 100%, 75%)`; 
            node.style.strokeWidth = 1 + Math.min(1.5, val / 50); // Max 2.5px
            
            // Halo Glow Effect
            node.style.filter = `drop-shadow(0 0 ${Math.min(20, val/4)}px hsl(${hue}, 100%, 50%))`;
        } else {
            // Resting state
            node.setAttribute("r", baseRadius);
            node.style.fill = "rgba(22, 33, 62, 0.5)";
            node.style.fillOpacity = 0.3;
            node.style.stroke = "rgba(0, 242, 254, 0.2)";
            node.style.strokeWidth = 1;
            node.style.filter = "none";
        }
    });
  }

  // Deprecated: Update Visuals Randomly
  updateVisualsRandomly_OLD(data, sampleRate, fftSize) {
    const lines = this.svg.querySelectorAll(".conn-line");
    const totalLines = lines.length;
    const lineActivations = {}; 
    const binSize = sampleRate / fftSize;
    const startBin = Math.floor(500 / binSize);
    const endBin = Math.floor(6500 / binSize);
    const usefulRange = endBin - startBin;
    
    lines.forEach((line, idx) => {
        const lineId = line.getAttribute("id");
        // line id format: line-startNodeId-endNodeId (e.g., line-11-21)
        const parts = lineId.split("-");
        const startNodeId = parts[1];
        const targetNodeId = parts[2];
        
        // Determine Layer Index for Delay
        // Node ID format "L N" (e.g. 11 is Layer 1, Node 1. 21 is Layer 2, Node 1)
        // We use startNode's layer to determine delay.
        // Layer 1 starts at index 0. Layer 2 starts at index 1...
        const layerIdx = parseInt(startNodeId.charAt(0)) - 1; 
        
        // Calculate Delay: 2 frames per layer (tighter sync)
        const delay = Math.min(this.audioHistory.length - 1, layerIdx * 2);
        const delayedData = this.audioHistory[delay] || data; // Fallback to current if history empty

        const seed = parseFloat(line.getAttribute("data-freq-seed")) || 0;
        const binIdx = startBin + Math.floor(seed * usefulRange);
        const val = delayedData[binIdx] || 0; // Use delayed data

        let weight = parseFloat(line.getAttribute("data-weight")) || 0.5;
        weight = Math.min(weight, 0.5); 

        const effectiveVal = val * weight; 
        const hue = 200 + ((idx / totalLines) * 160); 
        
        if (!lineActivations[targetNodeId]) {
            lineActivations[targetNodeId] = { sum: 0, maxHue: 0, count: 0 };
        }
        
        if (effectiveVal > 15) {
            line.style.opacity = Math.min(1, (effectiveVal / 100) + 0.2);
            const lightness = 50 + (effectiveVal / 100) * 25;
            line.style.stroke = `hsl(${hue}, 100%, ${lightness}%)`; 
            // Cap thickness to max 4px
            line.style.strokeWidth = Math.min(4, 1.0 + (effectiveVal / 100) * 3);

            lineActivations[targetNodeId].sum += effectiveVal;
            lineActivations[targetNodeId].maxHue = Math.max(lineActivations[targetNodeId].maxHue, hue);
            lineActivations[targetNodeId].count++;
        } else {
            // Inactive state
            line.style.opacity = 0.05;
            line.style.strokeWidth = 0.2;
            line.style.stroke = "rgba(255,255,255,0.02)";
        }
    });

    // Update Nodes based on incoming lines
    const nodes = this.svg.querySelectorAll(".node");
    nodes.forEach((node) => {
        const nodeId = node.getAttribute("id").replace("node-", ""); 
        const incoming = lineActivations[nodeId];
        const baseRadius = 18;
        if (incoming && incoming.count > 0) {
             const sizeFactor = Math.min(1.6, 1.0 + (incoming.sum / 600)); 
             node.setAttribute("r", baseRadius * sizeFactor);
             const avgActivation = incoming.sum / incoming.count;
             
             // Visual Flair for Active Nodes
             const nodeLightness = 50 + (avgActivation / 255) * 20;
             const nodeHue = incoming.maxHue; 
             node.style.fill = `hsl(${nodeHue}, 100%, ${nodeLightness}%)`;
             node.style.fillOpacity = "0.7"; // Slightly more opaque
             node.style.filter = `drop-shadow(0 0 10px hsl(${nodeHue}, 100%, 60%))`;
             node.style.stroke = "#fff";
             node.style.strokeWidth = "2px";
        } else {
            node.setAttribute("r", baseRadius);
            node.style.fill = "rgba(22, 33, 62, 0.5)";
            node.style.fillOpacity = "0.3";
            node.style.filter = "none";
            node.style.stroke = "rgba(0, 242, 254, 0.3)";
            node.style.strokeWidth = "1px";
        }
    });
  }
}
