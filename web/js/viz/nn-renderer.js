/**
 * js/viz/nn-renderer.js
 * Responsible for rendering SVG elements, nodes, lines, and managing the DOM structure.
 */
class NeuralRenderer {
    constructor(svgElement) {
        this.svg = svgElement;
        this.nodesData = [];
        this.layerColors = [
            "#22d3ee", // Cyan
            "#818cf8", // Indigo
            "#c084fc", // Purple
            "#f472b6", // Pink
            "#38bdf8", // Sky
            "#4ade80", // Emerald (High Energy Layer)
        ];
        this.timerText = null;
        this.layerDensityFactors = [];
        this.nodeDensityFactors = [];
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

        // 2. Draw Connections
        for (let i = 0; i < this.nodesData.length - 1; i++) {
            const currentLayer = this.nodesData[i];
            const nextLayer = this.nodesData[i + 1];

            currentLayer.forEach((startNode) => {
                let rawWeights = nextLayer.map(() => Math.random());
                const activeSum = rawWeights.reduce((sum, w) => sum + w, 0);

                const validWeights = activeSum > 0
                    ? rawWeights.map(w => w / activeSum)
                    : nextLayer.map(() => 1 / nextLayer.length);

                nextLayer.forEach((endNode, idx) => {
                    const weight = validWeights[idx];

                    if (weight > 0.01) {
                        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                        line.setAttribute("x1", startNode.x);
                        line.setAttribute("y1", startNode.y);
                        line.setAttribute("x2", endNode.x);
                        line.setAttribute("y2", endNode.y);
                        line.setAttribute("class", "conn-line");
                        line.setAttribute("id", `line-${startNode.id}-${endNode.id}`);

                        line.setAttribute("stroke-dasharray", "10 5");
                        line.setAttribute("stroke-linecap", "round");

                        line.setAttribute("data-weight", weight.toFixed(4));
                        line.setAttribute("data-target-weight", weight.toFixed(4));

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

        this.createTimer(width, height);
        this.calculateDensityFactors();
        
        return this.nodesData; // Return data for other modules
    }

    createTimer(width, height) {
        this.timerText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        this.timerText.setAttribute("x", 40);
        this.timerText.setAttribute("y", height - 30);
        this.timerText.setAttribute("text-anchor", "start");
        this.timerText.setAttribute("fill", "#00f2fe");
        this.timerText.setAttribute("fill-opacity", "0.8");
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

    resetVisuals() {
        if (!this.svg) return;

        const nodes = this.svg.querySelectorAll(".node");
        nodes.forEach(n => {
            n.setAttribute("r", "18");
            n.style.fill = "rgba(22, 33, 62, 0.7)";
            n.style.stroke = "#00f2fe";
            n.style.strokeWidth = "2px";
            n.style.filter = "none";
        });

        const lines = this.svg.querySelectorAll(".conn-line");
        lines.forEach(l => {
            l.style.opacity = "0.1";
            l.style.strokeWidth = "0.5";
            l.style.stroke = "rgba(255,255,255,0.05)";
        });
        this.updateTimer("00:00");
    }

    calculateDensityFactors() {
        this.layerDensityFactors = [];
        this.nodeDensityFactors = [];

        if (this.nodesData.length >= 2) {
            const l1Count = this.nodesData[0].length;
            const l2Count = this.nodesData[1].length;
            const baseLineCount = Math.max(1, l1Count * l2Count);

            for (let i = 0; i < this.nodesData.length - 1; i++) {
                const src = this.nodesData[i].length;
                const dst = this.nodesData[i + 1].length;
                const lineCount = src * dst;
                this.layerDensityFactors[i] = Math.max(0.7, lineCount / baseLineCount);
            }

            for (let i = 0; i < this.nodesData.length; i++) {
                this.nodeDensityFactors[i] = this.nodesData[i].length / l1Count;
            }
        }
    }
    
    getDensityFactors() {
        return {
            layer: this.layerDensityFactors,
            node: this.nodeDensityFactors
        };
    }
}
