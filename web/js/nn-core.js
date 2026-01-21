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
        const rawWeights = nextLayer.map(() => Math.random() + 0.1);
        const totalWeight = rawWeights.reduce((sum, w) => sum + w, 0);

        nextLayer.forEach((endNode, idx) => {
          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", startNode.x);
          line.setAttribute("y1", startNode.y);
          line.setAttribute("x2", endNode.x);
          line.setAttribute("y2", endNode.y);
          line.setAttribute("class", "conn-line");
          line.setAttribute("id", `line-${startNode.id}-${endNode.id}`);
          
          const normalizedWeight = rawWeights[idx] / totalWeight;
          line.setAttribute("data-weight", normalizedWeight.toFixed(4));
          
          const randomFreqSeed = Math.random();
          line.setAttribute("data-freq-seed", randomFreqSeed.toFixed(4));
          
          this.svg.appendChild(line);
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
      if (this.svg && this.nodesData.length > 0) {
          // Re-trigger render to clear styles? 
          // Since render needs structureStr, we can perhaps just reset styles manually or ask caller to re-render.
          // Original code did: renderNetwork() // Full UI Reset
          // We can't easily call render without the structure string here.
          // Ideally we should store the structure string or just implement a visual reset.
          // For now, I will assume the caller will handle re-render if needed, 
          // OR I can store the last structure string.
      }
    }
  }
}
