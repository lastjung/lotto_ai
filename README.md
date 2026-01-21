# 🧠 Neural Network Music Visualizer

A real-time audio-reactive neural network visualization built with vanilla JavaScript, SVG, and the Web Audio API.

![Neural Network Visualizer](https://img.shields.io/badge/Neural_Network-Visualizer-blue?style=for-the-badge)
![Web Audio API](https://img.shields.io/badge/Web_Audio-API-green?style=for-the-badge)
![SVG](https://img.shields.io/badge/SVG-Animation-orange?style=for-the-badge)

## ✨ Features

### 🎵 Music Sync Mode

- **Real-time frequency analysis** using Web Audio API's AnalyserNode
- **Dynamic line activation** based on audio frequency bands
- **Node activation simulation** - nodes respond to incoming connection signals
- **Neural network weight simulation** - each connection has a random weight affecting activation strength

### ⚡ Auto Flow Mode

- Automated signal propagation animation
- Adjustable speed control
- Visual demonstration of neural network forward propagation

### 🎨 Random Color Mode

- Instantly randomize all connection colors
- Premium gradient color palette

## 🚀 Live Demo

**[View Live Demo](https://lastjung.github.io/lotto_ai/web/)**

## 🛠️ Tech Stack

- **HTML5 / CSS3** - Modern responsive layout
- **Vanilla JavaScript** - No frameworks required
- **SVG** - Scalable vector graphics for smooth rendering
- **Web Audio API** - Real-time audio analysis
  - `AudioContext` for audio processing
  - `AnalyserNode` for frequency data extraction
  - `getByteFrequencyData()` for 128-bin frequency spectrum

## 📁 Project Structure

```
web/
├── index.html          # Main UI structure
├── css/
│   └── style.css       # Styling and animations
├── js/
│   ├── main.js         # Tab logic + Lotto generator
│   └── neural-viz.js   # Neural network visualization logic
└── music.mp3           # Default background music (royalty-free)
```

## 🎯 How It Works

### Music Visualization Flow

```
🎵 Music Playback
      ↓
AudioContext → AnalyserNode
      ↓
getByteFrequencyData(dataArray)  // 128 frequency bins
      ↓
[Lines Processing]
├─ Assign frequency band to each line (binIdx)
├─ Calculate effectiveVal = val × weight
├─ If effectiveVal > 60: activate (color, width, opacity)
└─ Track target node for activation propagation
      ↓
[Nodes Processing]
├─ Sum incoming activated lines
├─ If sum > 0: activate node (color, glow, size)
└─ Otherwise: reset to default state
      ↓
requestAnimationFrame(animateViz)  // Loop
```

### Frequency-Layer Mapping

| Layer              | Frequency Range | Responds To      |
| ------------------ | --------------- | ---------------- |
| Input (10s → 20s)  | Low (Bass)      | Kick drums, bass |
| Hidden (20s → 30s) | Mid             | Melodies, vocals |
| Output (30s → 40s) | High (Treble)   | Hi-hats, cymbals |

## 🎮 Controls

| Button              | Function                                |
| ------------------- | --------------------------------------- |
| 🎨 **RANDOM COLOR** | Randomize all connection colors         |
| ⚡ **AUTO FLOW**    | Start/stop automated flow animation     |
| 🎵 **MUSIC SYNC**   | Play music with real-time visualization |
| 📂 **Select Music** | Choose custom audio file                |

## 📦 Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/lastjung/lotto_ai.git
   cd lotto_ai
   ```

2. Start a local server (required for audio playback):

   ```bash
   python3 -m http.server 8000
   ```

3. Open in browser:
   ```
   http://localhost:8000/web/
   ```

## 🎵 Music Credits

Background music: **"Q Train" by Adam MacDougall**  
Source: YouTube Audio Library (Royalty-Free)

## 📄 License

MIT License - feel free to use and modify!

## 🙏 Acknowledgments

- Web Audio API documentation
- SVG animation techniques
- Neural network visualization concepts

---

Made with ❤️ and JavaScript
