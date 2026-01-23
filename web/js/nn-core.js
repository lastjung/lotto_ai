/**
 * nn-core.js
 * NeuralNetworkViz Orchestrator
 * Coordinates Renderer, Animator, and Effects modules.
 */

class NeuralNetworkViz {
  constructor(svgElement) {
    this.svg = svgElement;
    
    // Initialize Sub-modules
    // Note: Dependencies must be loaded in index.html before this file
    this.renderer = new NeuralRenderer(this.svg);
    this.effects = new NeuralEffects(this.svg, this.renderer);
    this.animator = new NeuralAnimator(this.svg, this.renderer, this.effects);
    
    this.vizMode = 'propagation';
  }

  setVizMode(mode) {
    if (mode === 'propagation' || mode === 'random') {
      this.vizMode = mode;
      this.animator.setVizMode(mode);
      this.resetVisuals();
    }
  }

  getVizMode() {
    return this.vizMode;
  }

  render(structureStr) {
     this.renderer.render(structureStr);
  }

  resetVisuals() {
     this.renderer.resetVisuals();
  }
  
  // Delegated Methods for UI Control
  randomizeConnectionColors() {
      this.effects.randomizeConnectionColors();
  }

  startAutoFlow(speedVal) {
      this.effects.startAutoFlow(speedVal);
  }
  
  stopAutoFlow() {
      this.effects.stopAutoFlow();
  }

  // Main Loop Entry Point called by Audio Engine
  updateFromAudioData(audioData) {
      this.animator.updateFromAudioData(audioData);
  }
}
