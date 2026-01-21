# Task: Encapsulate Visualization Logic in NeuralNetworkViz

## Status

- [ ] Implement `updateFromAudioData(audioData)` in `web/js/nn-core.js`
- [ ] Add `resetVisuals()` method to `web/js/nn-core.js`
- [ ] Simplify `web/js/neural-viz.js` to delegate rendering logic
- [ ] Verify functionality

## Details

1. **Update `nn-core.js`**:
   - Add `updateFromAudioData({ data, sampleRate, fftSize })` method.
   - Move the calculation logic (bin calculation, threshold check, DOM updates for lines and nodes) from `neural-viz.js` to this method.
   - Add `resetVisuals()` method to cleaner helper to reset node/line styles to default state (used when stopping music).

2. **Update `neural-viz.js`**:
   - In `animateViz()`, remove all drawing logic. Just call `nnViz.updateFromAudioData(audioData)`.
   - In `stopMusicVisualizer()`, call `nnViz.resetVisuals()` instead of manually selecting DOM elements.

3. **Outcome**:
   - `nn-core.js` owns the SVG; only it can change the strokes and fills.
   - `neural-viz.js` becomes a thin controller layer.
