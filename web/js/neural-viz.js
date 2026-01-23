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
let stopBtn = null;
let settingsBtn = null;
let settingsPanel = null;
let settingsClose = null;
let applyBtn = null;
let volumeSlider = null;
let speedSlider = null;
let soundToggle = null;

let animationId = null;
let isMusicSyncing = false;
let colorInterval = null; // Track continuous color mode
let clockSeconds = 0; // Manual clock seconds for tool modes
let standaloneClockInterval = null; // Interval for tool mode clock

function initNN() {
    nnSvg = document.getElementById("nnSvg");
    nnStructureInput = document.getElementById("nnStructure");
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

    // 3. Settings Panel
    settingsBtn = document.getElementById("nnSettingsBtn");
    settingsPanel = document.getElementById("nnSettingsPanel");
    settingsClose = document.getElementById("nnSettingsClose");
    applyBtn = document.getElementById("nnApplyBtn");
    volumeSlider = document.getElementById("nnVolume");
    speedSlider = document.getElementById("nnSpeed");

    if (settingsBtn) {
        settingsBtn.addEventListener("click", () => {
            settingsPanel.style.display = "flex";
            if (typeof playSound === "function") playSound("click");
        });
    }

    if (settingsClose) {
        settingsClose.addEventListener("click", () => {
            settingsPanel.style.display = "none";
        });
    }

    // Close on outside click
    window.addEventListener("click", (e) => {
        if (e.target === settingsPanel) {
            settingsPanel.style.display = "none";
        }
    });

    if (volumeSlider) {
        volumeSlider.addEventListener("input", (e) => {
            if (nnAudio) nnAudio.setVolume(e.target.value);
        });
    }

    if (applyBtn) {
        applyBtn.addEventListener("click", () => {
             renderNetwork();
             settingsPanel.style.display = "none";
             if (typeof playSound === "function") playSound("click");
        });
    }

    soundToggle = document.getElementById("nnSoundToggle");
    if (soundToggle) {
        soundToggle.addEventListener("click", () => {
            if (nnAudio) {
                const newMuteState = !nnAudio.isMuted;
                nnAudio.setMute(newMuteState);
                soundToggle.textContent = newMuteState ? "🔇" : "🔊";
                soundToggle.style.opacity = newMuteState ? "0.5" : "1";
                if (typeof playSound === "function") playSound("click");
            }
        });
    }

    stopBtn = document.getElementById("nnStopBtn");

    if (musicBtn) {
        let isLoading = false;

        musicBtn.addEventListener("click", async () => {
            if (isLoading) return;

            // Check current selected mode from Radio Buttons
            const isNeural = document.getElementById("nnTrack1")?.checked;
            const isRandom = document.getElementById("nnTrack2")?.checked;
            const isColor = document.getElementById("nnTrack3")?.checked;
            const isFlow = document.getElementById("nnTrack4")?.checked;
            
            // 1. Tool Actions (Doesn't start music sync core)
            if (isColor) {
                if (colorInterval) {
                   clearInterval(colorInterval);
                   colorInterval = null;
                   stopStandaloneClock(); // Stop manual clock
                   updateMusicButtonState('paused'); // Show RESUME
                } else {
                   if (!isMusicSyncing) {
                      if (musicBtn.textContent.includes("PLAY")) {
                         nnViz.resetVisuals();
                         clockSeconds = 0; // Reset only on fresh start
                      }
                      startStandaloneClock(); // Start manual clock
                   }
                   updateMusicButtonState('playing'); // Show PAUSE
                   colorInterval = setInterval(() => { randomizeConnectionColors(); }, 400); 
                }
                return;
            }
            if (isFlow) {
                if (nnViz) {
                    if (nnViz.autoFlowInterval) {
                        nnViz.stopAutoFlow();
                        stopStandaloneClock(); // Stop manual clock
                        updateMusicButtonState('paused'); // Show RESUME
                    } else {
                        if (!isMusicSyncing) {
                            if (musicBtn.textContent.includes("PLAY")) {
                               nnViz.resetVisuals();
                               clockSeconds = 0;
                            }
                            startStandaloneClock(); // Start manual clock
                        }
                        nnViz.startAutoFlow(500); // Standard speed (No Step 2)
                        updateMusicButtonState('playing'); // Show PAUSE
                    }
                }
                return;
            }

            // 2. Playback / Pause / Resume
            if (!isMusicSyncing) {
                if (colorInterval) { clearInterval(colorInterval); colorInterval = null; }
                if (nnViz && nnViz.autoFlowInterval) nnViz.stopAutoFlow();
                
                try {
                    isLoading = true;
                    updateMusicButtonState('loading');
                    
                    if (nnAudio) nnAudio.initContext();

                    let url = "music/music.mp3";
                    if (isRandom) {
                       url = "music/Speedy Gonzalo - Inaban.mp3";
                       if (nnViz) nnViz.setVizMode('random');
                    } else if (isNeural) {
                       if (nnViz) nnViz.setVizMode('propagation');
                    }

                    await startMusicVisualizer(url);
                } catch (err) {
                    console.error("Playback failed:", err);
                    updateMusicButtonState('stopped');
                } finally {
                    isLoading = false;
                }
            } else {
                // TOGGLE PAUSE/RESUME for Music
                if (nnAudio.state === 'running') {
                    nnAudio.pause();
                    updateMusicButtonState('paused');
                } else {
                    nnAudio.resume();
                    updateMusicButtonState('playing');
                }
            }
        });

        if (stopBtn) {
            stopBtn.addEventListener("click", stopMusicVisualizer);
        }

        // Keep Select for backward compatibility if it exists
        if (musicSelect) {
            musicSelect.addEventListener("change", () => {
                if (musicSelect.value === "custom") {
                    musicInput.click();
                }
            });
        }

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
        nnViz.stopAutoFlow();
    } else {
        if (isMusicSyncing) stopMusicVisualizer(); // Exclusive mode

        const startFlow = () => {
            const speedVal = parseInt(speedSlider ? speedSlider.value : 400);
            nnViz.startAutoFlow(speedVal);
        };

        startFlow();

        if (speedSlider) {
            speedSlider.oninput = (e) => {
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
    
    // Reset if already syncing
    if (isMusicSyncing) stopMusicVisualizer();

    const success = await nnAudio.loadFromUrl(url);
    if (success) {
        isMusicSyncing = true;
        updateMusicButtonState('playing');
        animateViz();
    }
    return success;
}

async function startMusicVisualizerFromFile(file) {
    if (nnViz && nnViz.autoFlowInterval) toggleAutoFlow();
    if (isMusicSyncing) stopMusicVisualizer();

    const success = await nnAudio.loadFromFile(file);
    if (success) {
        isMusicSyncing = true;
        updateMusicButtonState('playing');
        animateViz();
    } else {
        alert("파일을 재생할 수 없습니다.");
    }
}

function stopMusicVisualizer() {
    isMusicSyncing = false;
    clockSeconds = 0; // Reset manual clock
    stopStandaloneClock();

    if (nnAudio) nnAudio.stop();
    
    if (colorInterval) {
        clearInterval(colorInterval);
        colorInterval = null;
    }
    
    if (nnViz) {
        nnViz.stopAutoFlow();
    }

    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    updateMusicButtonState('stopped');
    
    if (nnViz) {
        nnViz.resetVisuals();
    }
}

// Manual Clock Helpers for Tool Modes (RANDOM COLOR, AIR FLOW)
function startStandaloneClock() {
    if (standaloneClockInterval) clearInterval(standaloneClockInterval);
    standaloneClockInterval = setInterval(() => {
        clockSeconds++;
        const mins = Math.floor(clockSeconds / 60).toString().padStart(2, '0');
        const secs = (clockSeconds % 60).toString().padStart(2, '0');
        if (nnViz) nnViz.updateTimer(`${mins}:${secs}`);
    }, 1000);
}

function stopStandaloneClock() {
    if (standaloneClockInterval) {
        clearInterval(standaloneClockInterval);
        standaloneClockInterval = null;
    }
}

function updateMusicButtonState(state) {
    if (!musicBtn) return;

    switch(state) {
        case 'loading':
            musicBtn.textContent = "⌛ LOADING...";
            musicBtn.style.background = "#555";
            musicBtn.style.cursor = "not-allowed";
            break;
        case 'playing':
            musicBtn.textContent = "⏸ PAUSE";
            musicBtn.style.background = "linear-gradient(135deg, #f39c12 0%, #e67e22 100%)";
            musicBtn.style.cursor = "pointer";
            if (stopBtn) stopBtn.classList.add("visible");
            break;
        case 'paused':
            musicBtn.textContent = "▶️ RESUME";
            musicBtn.style.background = "linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)";
            musicBtn.style.cursor = "pointer";
            break;
        case 'stopped':
        default:
            musicBtn.textContent = "▶️ PLAY";
            musicBtn.style.background = "linear-gradient(135deg, #0984e3 0%, #6c5ce7 100%)";
            musicBtn.style.cursor = "pointer";
            if (stopBtn) stopBtn.classList.remove("visible");
            break;
    }
}

// =========================================
// Main Animation Loop
// =========================================


function animateViz() {
    if (!isMusicSyncing) return;
    
    animationId = requestAnimationFrame(animateViz);
    
    if (nnAudio) {
         const audioData = nnAudio.getFrequencyData();
         // 2. Delegate Visualization to Engine
         if (nnViz && audioData) nnViz.updateFromAudioData(audioData);
    }
}

// Initialize on Load
window.addEventListener('load', initNN);

