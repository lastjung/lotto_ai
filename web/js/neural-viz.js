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
    if (nnViz) {
        nnViz.resetVisuals();
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
    
    // 2. Delegate Visualization to Engine
    if (nnViz) {
        nnViz.updateFromAudioData(audioData);
    }
}

// Initialize on Load
window.addEventListener('load', initNN);

