# 🧠 Neural Network Music Visualizer

A real-time audio-reactive neural network visualization built with modern vanilla JavaScript (ES6+ Classes), SVG, and the Web Audio API.

![Neural Network Visualizer](https://img.shields.io/badge/Neural_Network-Visualizer-blue?style=for-the-badge)
![Web Audio API](https://img.shields.io/badge/Web_Audio-API-green?style=for-the-badge)
![SVG](https://img.shields.io/badge/SVG-Animation-orange?style=for-the-badge)

## ✨ New Features & Updates

### 💎 Modular Class-Based Architecture

The project has been refactored into specialized ES6 classes for better performance and maintainability:

- **`NeuralNetworkViz`**: Core visualization engine (DOM/SVG management).
- **`NeuralAudioEngine`**: Robust audio processing and analysis logic.
- **`Controller Pattern`**: Integrated UI event handling.

### ⚙️ Premium Settings Panel

- **Integrated Controls**: Specialized modal for volume, flow speed, and network structure.
- **Master Volume**: Granular volume control with smooth gain transitions.
- **Segmented Mode Toggle**: High-performance UI for switching between Neural, Random, Color, and Flow modes.

### 🎵 Enhanced Mode Logic

- **Neural Mode**: Authentic signal propagation synchronized with audio frequency bands.
- **Continuous Tool Modes**: "Random Color" and "Air Flow" now support continuous loop, pause, and resume.
- **Visual Stablity**: Eliminated layout shifts during STOP/PLAY transitions.

## 📁 Project Structure

```
web/
├── index.html          # Main UI structure & Settings Modal
├── css/
│   └── style.css       # Premium glassmorphism & responsive styles
├── js/
│   ├── main.js           # Tab logic + Lotto generator
│   ├── audio-engine.js   # NeuralAudioEngine Class (Web Audio API)
│   ├── nn-core.js        # NeuralNetworkViz Class (SVG Logic)
│   └── neural-viz.js     # Main Controller & UI Bindings
└── music/              # Royalty-free music assets
```

## 🎯 How It Works

### Neural Propagation Flow

- **Energy Conservation**: Weights are renormalized to sum to 1.0 per node, ensuring stable energy flow.
- **Propagation Delay**: Signals travel through layers with a slight, oddly-satisfying delay.
- **Node Pulsing**: Dynamic SVG filters and scaling respond to incoming neural weight sums.

## 🎮 Controls

| Control             | Function                                   |
| ------------------- | ------------------------------------------ |
| ▶️ **PLAY / PAUSE** | Universal control for all modes            |
| ⏹ **STOP**          | Reset visuals and audio context            |
| 🔊 **SOUND TOGGLE** | Instant mute/unmute from player bar        |
| ⚙️ **SETTINGS**     | Access modes, volume, speed, and structure |

## 📦 Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/lastjung/lotto_ai.git
   cd lotto_ai
   ```

2. Start a local server:

   ```bash
   python3 -m http.server 8000
   ```

3. Open in browser: `http://localhost:8000/web/`

## 📄 License

MIT License - feel free to use and modify!

---

Made with ❤️ and Advanced Agentic Coding
