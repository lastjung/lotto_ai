# Task: Refactor Audio Engine to Class

## Status

- [ ] Create `web/js/audio-engine.js` with `NeuralAudioEngine` class
- [ ] Update `web/index.html` to include new script
- [ ] Refactor `web/js/neural-viz.js` to use `NeuralAudioEngine`
- [ ] Verify music sync functionality

## Details

1. **Create `audio-engine.js`**:
   - encapsulated class `NeuralAudioEngine`.
   - Handle `AudioContext` creation (handling browser policies).
   - Methods:
     - `loadFromUrl(url)`: Fetch and decode audio.
     - `loadFromFile(file)`: Read and decode user file.
     - `play()`: Start buffer source.
     - `stop()`: Stop and disconnect source.
     - `getFrequencyData()`: Return current frequency data array.
     - `cleanup()`: Close context if needed.

2. **Update `neural-viz.js`**:
   - Remove direct `AudioContext`, `AnalyserNode` logic.
   - Instantiate `const audio = new NeuralAudioEngine()`.
   - In `animateViz` loop, call `audio.getFrequencyData()` to drive the visualization.

3. **Wiring**:
   - Ensure `neural-viz.js` acts as the bridge:
     - User clicks Play -> `neural-viz` calls `audio.load...`.
     - Animation Loop -> `neural-viz` pulls data from `audio` -> pushes to `nnViz`.
