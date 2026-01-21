// neural-viz.js (Controller)
// 2단계 리팩토링 완료: Audio 로직은 NeuralAudioEngine 클래스로 독립 (audio-engine.js)

let nnViz; // Instance of NeuralNetworkViz (nn-core.js)
let nnAudio; // Instance of NeuralAudioEngine (audio-engine.js)

// UI Elements
let nnSvg;
let nnStructureInput;
let nnRandomBtn;
let nnAutoBtn;
let musicBtn = null;
let musicInput = null;

let animationId = null;
let isMusicSyncing = false;

function initNN() {
    nnSvg = document.getElementById("nnSvg");
    nnStructureInput = document.getElementById("nnStructure");
    nnRandomBtn = document.getElementById("nnRandomBtn");
    nnAutoBtn = document.getElementById("nnAutoBtn");
    musicBtn = document.getElementById("nnMusicBtn");
    musicInput = document.getElementById("musicFile");
    const musicSelect = document.getElementById("musicSelect");

    // 1. Initialize Visual Engine
    if (nnSvg) {
        nnViz = new NeuralNetworkViz(nnSvg);
        renderNetwork();
        window.addEventListener("resize", renderNetwork);
    }

    // 2. Initialize Audio Engine
    nnAudio = new NeuralAudioEngine();

    // 3. Bind UI Events
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
        musicBtn.addEventListener("click", async () => {
            if (isMusicSyncing) {
                stopMusicVisualizer();
                return;
            }

            const selectedValue = musicSelect.value;
            let success = false;

            if (selectedValue === "default") {
                success = await startMusicVisualizer("music/music.mp3");
            } else if (selectedValue === "inaban") {
                success = await startMusicVisualizer("music/Speedy Gonzalo - Inaban.mp3");
            } else if (selectedValue === "custom") {
                musicInput.click();
                return; // Wait for file input change
            }
            
            if(!success && selectedValue !== "custom") {
                 alert("음악 재생 실패");
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

// =========================================
// Wrapper Functions (Bridge)
// =========================================

function renderNetwork() {
    if (nnViz && nnStructureInput) {
        nnViz.render(nnStructureInput.value);
    }
}

function randomizeConnectionColors() {
    if (nnViz) nnViz.randomizeConnectionColors();
    if (typeof playSound === "function") playSound("click");
}

function toggleAutoFlow() {
    if (!nnViz) return;

    if (nnViz.autoFlowInterval) {
        // Stop Flow
        nnViz.stopAutoFlow();
        if (nnAutoBtn) {
            nnAutoBtn.textContent = "AUTO FLOW";
            nnAutoBtn.style.background = "linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%)";
        }
        renderNetwork(); // Visually reset
    } else {
        // Start Flow
        if (isMusicSyncing) stopMusicVisualizer(); // Exclusive mode

        if (nnAutoBtn) {
            nnAutoBtn.textContent = "STOP FLOW";
            nnAutoBtn.style.background = "linear-gradient(135deg, #ff7675 0%, #d63031 100%)";
        }

        const startFlow = () => {
            const speedVal = parseInt(document.getElementById("nnSpeed").value);
            nnViz.startAutoFlow(speedVal);
        };

        startFlow();

        const speedInput = document.getElementById("nnSpeed");
        if (speedInput) {
            speedInput.oninput = (e) => {
                if (nnViz.autoFlowInterval) nnViz.startAutoFlow(parseInt(e.target.value));
            };
        }
    }
    if (typeof playSound === "function") playSound("click");
}

// =========================================
// Music Visualization Logic (Controller)
// =========================================

async function startMusicVisualizer(url) {
    if (nnViz && nnViz.autoFlowInterval) toggleAutoFlow();
    if (isMusicSyncing) stopMusicVisualizer();

    isMusicSyncing = true;
    updateMusicButtonState(true);

    const success = await nnAudio.loadFromUrl(url);
    if (success) {
        animateViz();
    } else {
        stopMusicVisualizer();
    }
    return success;
}

async function startMusicVisualizerFromFile(file) {
    if (nnViz && nnViz.autoFlowInterval) toggleAutoFlow();
    if (isMusicSyncing) stopMusicVisualizer();

    isMusicSyncing = true;
    updateMusicButtonState(true);

    const success = await nnAudio.loadFromFile(file);
    if (success) {
        animateViz();
    } else {
        stopMusicVisualizer();
        alert("파일을 재생할 수 없습니다.");
    }
}

function stopMusicVisualizer() {
    isMusicSyncing = false;
    if (nnAudio) nnAudio.stop();
    
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    updateMusicButtonState(false);
    
    // Visually reset
    if (nnSvg) {
       // Since we don't have direct access to reset logic in Viz yet, 
       // we can either re-render or explicitly clear styles.
       // For now, let's keep the manual reset here or move it to Viz class later.
       // Ideally: nnViz.resetVisuals();
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

function updateMusicButtonState(isPlaying) {
    if (!musicBtn) return;
    if (isPlaying) {
        musicBtn.textContent = "⏹ STOP MUSIC";
        musicBtn.style.background = "linear-gradient(135deg, #ff7675 0%, #d63031 100%)";
    } else {
        musicBtn.textContent = "🎵 MUSIC SYNC";
        musicBtn.style.background = "linear-gradient(135deg, #FF0080 0%, #7928CA 100%)";
    }
}

// =========================================
// Main Animation Loop
// =========================================

function animateViz() {
    if (!isMusicSyncing) return;
    animationId = requestAnimationFrame(animateViz);

    // 1. Get Audio Data
    const audioData = nnAudio.getFrequencyData();
    if (!audioData) return;

    const { data, sampleRate, fftSize } = audioData;
    
    // 2. Process Data & Update Viz
    // (This logic could be moved to nnViz.update(audioData) in step 3, but ok here for now)
    const lines = nnSvg.querySelectorAll(".conn-line");
    const totalLines = lines.length;
    const lineActivations = {}; 
    const binSize = sampleRate / fftSize;
    const startBin = Math.floor(500 / binSize);
    const endBin = Math.floor(6500 / binSize);
    const usefulRange = endBin - startBin;
    
    lines.forEach((line, idx) => {
        const seed = parseFloat(line.getAttribute("data-freq-seed")) || 0;
        const binIdx = startBin + Math.floor(seed * usefulRange);
        const val = data[binIdx] || 0;
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

// Initialize on Load
window.addEventListener('load', initNN);

