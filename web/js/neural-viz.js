// neural-viz.js (Main Entry & Initializer)
// 1단계 리팩토링 완료: Core 로직은 nn-core.js로 이동됨

let nnSvg;
let nnStructureInput;
let nnRandomBtn;
let nnAutoBtn;

// Audio Viz Variables
let audioCtxViz = null;
let analyser = null;
let dataArray = null;
let source = null;
let animationId = null;
let isMusicSyncing = false;
let musicBtn = null;
let musicInput = null;

let nodesData = []; // Store node coordinates
let layersInfo = [];
let autoFlowInterval = null;

function initNN() {
  nnSvg = document.getElementById("nnSvg");
  nnStructureInput = document.getElementById("nnStructure");
  nnRandomBtn = document.getElementById("nnRandomBtn");
  nnAutoBtn = document.getElementById("nnAutoBtn");
  musicBtn = document.getElementById("nnMusicBtn");
  musicInput = document.getElementById("musicFile");
  const musicSelect = document.getElementById("musicSelect");

  if (nnSvg) {
      renderNetwork();
      window.addEventListener("resize", renderNetwork);
  }

  if (nnStructureInput) {
      nnStructureInput.addEventListener("input", renderNetwork);
  }
  if (nnRandomBtn) {
      nnRandomBtn.addEventListener("click", randomizeConnectionColors);
  }
  if (nnAutoBtn) {
      nnAutoBtn.addEventListener("click", toggleAutoFlow);
  }

  if (musicBtn && musicSelect) {
      musicBtn.addEventListener("click", () => {
          if (isMusicSyncing) {
              stopMusicVisualizer();
              return;
          }
          
          const selectedValue = musicSelect.value;
          if (selectedValue === "default") {
              startMusicVisualizer("music/music.mp3");
          } else if (selectedValue === "inaban") {
              startMusicVisualizer("music/Speedy Gonzalo - Inaban.mp3");
          } else if (selectedValue === "custom") {
              musicInput.click();
          }
      });
      
      musicSelect.addEventListener("change", () => {
          if (musicSelect.value === "custom") {
              musicInput.click();
          }
      });
      
      musicInput.addEventListener("change", (e) => {
          const file = e.target.files[0];
          if (file) {
              startMusicVisualizerFromFile(file);
          }
      });
  }
}

function startMusicVisualizer(url) {
    if (autoFlowInterval) toggleAutoFlow(); 
    if (isMusicSyncing) stopMusicVisualizer();

    isMusicSyncing = true;
    if (musicBtn) {
        musicBtn.textContent = "⏹ STOP MUSIC";
        musicBtn.style.background = "linear-gradient(135deg, #ff7675 0%, #d63031 100%)";
    }

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error("Music file not found");
            return response.arrayBuffer();
        })
        .then(arrayBuffer => {
            audioCtxViz = new (window.AudioContext || window.webkitAudioContext)();
            
            audioCtxViz.decodeAudioData(arrayBuffer, (buffer) => {
                if (!isMusicSyncing) return;

                source = audioCtxViz.createBufferSource();
                source.buffer = buffer;
                source.loop = true;

                analyser = audioCtxViz.createAnalyser();
                analyser.fftSize = 2048; 
                const bufferLength = analyser.frequencyBinCount;
                dataArray = new Uint8Array(bufferLength);

                source.connect(analyser);
                analyser.connect(audioCtxViz.destination);
                source.start(0);

                animateViz();
            }, (err) => {
                console.error("Audio Decode Error:", err);
                alert("오디오 파일을 처리할 수 없습니다.");
                stopMusicVisualizer();
            });
        })
        .catch(err => {
            console.error("Fetch Error:", err);
            alert("음악 파일을 불러올 수 없습니다. 로컬 서버가 필요할 수 있습니다.");
            stopMusicVisualizer();
        });
}

function startMusicVisualizerFromFile(file) {
    if (autoFlowInterval) toggleAutoFlow(); 
    if (isMusicSyncing) stopMusicVisualizer();

    isMusicSyncing = true;
    if (musicBtn) {
        musicBtn.textContent = "⏹ STOP MUSIC";
        musicBtn.style.background = "linear-gradient(135deg, #ff7675 0%, #d63031 100%)";
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const arrayBuffer = e.target.result;
        audioCtxViz = new (window.AudioContext || window.webkitAudioContext)();
        
        audioCtxViz.decodeAudioData(arrayBuffer, (buffer) => {
            if (!isMusicSyncing) return;

            source = audioCtxViz.createBufferSource();
            source.buffer = buffer;
            source.loop = true;

            analyser = audioCtxViz.createAnalyser();
            analyser.fftSize = 2048; 
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);

            source.connect(analyser);
            analyser.connect(audioCtxViz.destination);
            source.start(0);

            animateViz();
        }, (err) => {
            console.error("Audio Decode Error:", err);
            alert("오디오 파일을 처리할 수 없습니다.");
            stopMusicVisualizer();
        });
    };
    reader.onerror = () => {
        alert("파일을 읽을 수 없습니다.");
        stopMusicVisualizer();
    };
    reader.readAsArrayBuffer(file);
}

function stopMusicVisualizer() {
    isMusicSyncing = false;
    if (source) {
        try { source.stop(); } catch(e){}
        source.disconnect();
    }
    if (audioCtxViz) {
        audioCtxViz.close();
    }
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    if (musicBtn) {
        musicBtn.textContent = "🎵 MUSIC SYNC";
        musicBtn.style.background = "linear-gradient(135deg, #FF0080 0%, #7928CA 100%)";
    }
    
    if (nnSvg) {
        const nodes = nnSvg.querySelectorAll(".node");
        nodes.forEach(n => {
            n.setAttribute("r", "18");
            n.style.fill = "rgba(22, 33, 62, 0.7)";
            n.style.stroke = "#00f2fe";
            n.style.strokeWidth = "2px";
            n.style.filter = "none";
        });
        
        const lines = nnSvg.querySelectorAll(".conn-line");
        lines.forEach(l => {
            l.style.opacity = "0.1";
            l.style.strokeWidth = "0.5";
            l.style.stroke = "rgba(255,255,255,0.05)";
        });
    }
}

function animateViz() {
    if (!isMusicSyncing) return;
    animationId = requestAnimationFrame(animateViz);

    analyser.getByteFrequencyData(dataArray);

    const lines = nnSvg.querySelectorAll(".conn-line");
    const totalLines = lines.length;
    const lineActivations = {}; 
    const binSize = audioCtxViz.sampleRate / analyser.fftSize;
    const startBin = Math.floor(500 / binSize);
    const endBin = Math.floor(6500 / binSize);
    const usefulRange = endBin - startBin;
    
    lines.forEach((line, idx) => {
        const seed = parseFloat(line.getAttribute("data-freq-seed")) || 0;
        const binIdx = startBin + Math.floor(seed * usefulRange);
        const val = dataArray[binIdx] || 0;
        const weight = parseFloat(line.getAttribute("data-weight")) || 0.5;
        const effectiveVal = val * weight; 
        const hue = 200 + ((idx / totalLines) * 160); 
        
        const lineId = line.getAttribute("id");
        const targetNodeId = lineId.split("-")[2]; 
        
        if (!lineActivations[targetNodeId]) {
            lineActivations[targetNodeId] = { sum: 0, maxHue: 0, count: 0 };
        }
        
        if (effectiveVal > 15) {
            line.style.opacity = Math.min(1, (effectiveVal / 100) + 0.2);
            const lightness = 50 + (effectiveVal / 100) * 25;
            line.style.stroke = `hsl(${hue}, 100%, ${lightness}%)`; 
            line.style.strokeWidth = 1.0 + (effectiveVal / 100) * 4;

            lineActivations[targetNodeId].sum += effectiveVal;
            lineActivations[targetNodeId].maxHue = Math.max(lineActivations[targetNodeId].maxHue, hue);
            lineActivations[targetNodeId].count++;
        } else {
            line.style.opacity = 0.1;
            line.style.strokeWidth = 0.5;
            line.style.stroke = "rgba(255,255,255,0.05)";
        }
    });

    const nodes = nnSvg.querySelectorAll(".node");
    nodes.forEach((node) => {
        const nodeId = node.getAttribute("id").replace("node-", ""); 
        const incoming = lineActivations[nodeId];
        const baseRadius = 18;
        if (incoming && incoming.sum > 0) {
            const sizeFactor = 0.5 + (incoming.sum / 255) * 0.5;
            node.setAttribute("r", baseRadius * sizeFactor);
            const avgActivation = incoming.sum / incoming.count;
            const nodeLightness = 50 + (avgActivation / 255) * 20;
            const nodeHue = incoming.maxHue; 
            node.style.fill = `hsl(${nodeHue}, 100%, ${nodeLightness}%)`;
            node.style.fillOpacity = "0.6";
            node.style.filter = `drop-shadow(0 0 8px hsl(${nodeHue}, 100%, 60%))`;
        } else {
            node.setAttribute("r", baseRadius);
            node.style.fill = "rgba(22, 33, 62, 0.5)";
            node.style.fillOpacity = "0.3";
            node.style.filter = "none";
        }
    });
}

// 초기 실행
window.addEventListener('load', initNN);
