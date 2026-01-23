/**
 * js/viz/nn-effects.js
 * Responsible for visual effects like auto-flow, color randomization, and rewiring.
 */
class NeuralEffects {
    constructor(svgElement, renderer) {
        this.svg = svgElement;
        this.renderer = renderer;
        this.autoFlowInterval = null;
        this.premiumColors = [
            "#00f2fe", "#4facfe", "#8b5cf6", "#f472b6", "#38bdf8",
            "#a78bfa", "#22d3ee", "#818cf8", "#c084fc", "#fb7185",
        ];
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

        if (speedVal === undefined || speedVal === null) speedVal = 500;

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
        }
    }

    rewireWeights(nodesData) {
        if (!nodesData || nodesData.length === 0) return;

        for (let i = 0; i < nodesData.length - 1; i++) {
            const currentLayer = nodesData[i];
            const nextLayer = nodesData[i + 1];

            currentLayer.forEach(srcNode => {
                let rawWeights = nextLayer.map(() => Math.random());
                const total = rawWeights.reduce((a, b) => a + b, 0);

                nextLayer.forEach((dstNode, idx) => {
                    const weight = total > 0 ? (rawWeights[idx] / total) : (1 / nextLayer.length);
                    const lineId = `line-${srcNode.id}-${dstNode.id}`;
                    const line = document.getElementById(lineId);
                    if (line) {
                        line.setAttribute("data-target-weight", weight.toFixed(4));
                    }
                });
            });
        }
    }
}
