# Task: Refactor Neural Network Core to Class

## Status

- [ ] Refactor `web/js/nn-core.js` into `NeuralNetworkViz` class
- [ ] Update `web/js/neural-viz.js` to initialize and use `NeuralNetworkViz` class
- [ ] Verify functionality (rendering, random color, auto flow)

## Details

1. **Refactor `nn-core.js`**:
   - Wrap existing functions (`renderNetwork`, `randomizeConnectionColors`, `toggleAutoFlow`) and variables (`premiumColors`, `layerColors`, `nodesData`) into a class.
   - Constructor should accept the SVG element ID or reference.
   - Remove direct dependencies on global variables like `nnStructureInput`, `nnAutoBtn`. Pass necessary values as arguments or maintain internal state if appropriate.
   - Expose methods: `render(structure)`, `randomizeColors()`, `startAutoFlow(speed)`, `stopAutoFlow()`.
   - Handle `updateViz` logic if presents (currently `animateViz` deals with visual updates based on audio, we might need to expose a method to update node/line state from external data).

2. **Update `neural-viz.js`**:
   - Instantiate `const nnViz = new NeuralNetworkViz('nnSvg');` inside `initNN`.
   - Replace direct function calls with method calls (e.g., `nnViz.render(structure)`, `nnViz.randomizeColors()`).
   - Pass necessary DOM elements or values to the class methods.
