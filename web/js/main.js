// ==========================================
// Main Application Logic (Lotto, Dream, Tabs)
// ==========================================

// Global state
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let soundEnabled = true;
let isGenerating = false;
let numSets = 5;

// ==========================================
// Audio Functions
// ==========================================
function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
}

function playSound(type) {
    if (!soundEnabled || !audioCtx) return;

    // 안전장치: AudioContext가 닫혀있거나 일시정지 상태면 재개 시도
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'ball') {
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.08);
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'complete') {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.value = freq;
            osc.type = 'triangle';
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.08 + 0.3);
            osc.start(audioCtx.currentTime + i * 0.08);
            osc.stop(audioCtx.currentTime + i * 0.08 + 0.3);
        });
    } else if (type === 'click') {
        oscillator.frequency.value = 600;
        oscillator.type = 'square';
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.03);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.03);
    } else if (type === 'setComplete') {
        oscillator.frequency.value = 880;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
    }
}

// ==========================================
// Helper Functions
// ==========================================
function getBallClass(num) {
    if (num <= 10) return 'ball-1-10';
    if (num <= 20) return 'ball-11-20';
    if (num <= 30) return 'ball-21-30';
    if (num <= 40) return 'ball-31-40';
    return 'ball-41-45';
}

function addToHistory(numbers, model) {
    const historyDiv = document.getElementById('history');
    const historyList = document.getElementById('historyList');

    if(historyDiv) historyDiv.style.display = 'block';

    const item = document.createElement('div');
    item.className = 'history-item';

    // 모델 태그
    const tag = document.createElement('span');
    tag.className = 'model-tag';
    tag.textContent = model === 'transformer' ? 'TF' : model === 'gan' ? 'GAN' : 'RND';
    item.appendChild(tag);

    // 메인 6개
    numbers.slice(0, 6).forEach(num => {
        const ball = document.createElement('div');
        ball.className = `mini-ball ${getBallClass(num)}`;
        ball.textContent = num;
        item.appendChild(ball);
    });

    // + 보너스
    const plus = document.createElement('span');
    plus.textContent = '+';
    plus.style.margin = '0 2px';
    plus.style.color = '#888';
    plus.style.fontSize = '0.8rem';
    item.appendChild(plus);

    const bonus = numbers[6];
    const bonusBall = document.createElement('div');
    bonusBall.className = `mini-ball ${getBallClass(bonus)}`;
    bonusBall.textContent = bonus;
    bonusBall.style.boxShadow = '0 0 5px currentColor';
    item.appendChild(bonusBall);

    const time = document.createElement('span');
    time.className = 'timestamp';
    time.textContent = new Date().toLocaleTimeString();
    item.appendChild(time);

    historyList.insertBefore(item, historyList.firstChild);

    // 최대 20개만 유지
    while (historyList.children.length > 20) {
        historyList.removeChild(historyList.lastChild);
    }
}

async function showMultipleSets(model, sets) {
    const container = document.getElementById('ballContainer');
    container.innerHTML = ''; // 초기화 (로딩 표시 제거)

    try {
        // API 호출
        const response = await fetch(`http://localhost:8000/generate?model=${model}&sets=${sets}`);
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();
        const allSets = data.results; // [[1,2,3,4,5,6,7], ...]

        // 프론트엔드 렌더링
        for (let setIdx = 0; setIdx < allSets.length; setIdx++) {
            const numbers = allSets[setIdx];
            const mainNums = numbers.slice(0, 6);
            const bonusNum = numbers[6];

            // 세트 라벨
            if (sets > 1) {
                const label = document.createElement('div');
                label.className = 'set-label';
                label.textContent = `세트 ${setIdx + 1}`;
                container.appendChild(label);
            }

            // 세트 래퍼
            const wrapper = document.createElement('div');
            wrapper.className = 'set-wrapper';
            container.appendChild(wrapper);

            // 메인 6개 공 표시
            for (let i = 0; i < mainNums.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 100));

                const ball = document.createElement('div');
                ball.className = `ball ${getBallClass(mainNums[i])}`;
                ball.textContent = mainNums[i];
                wrapper.appendChild(ball);

                requestAnimationFrame(() => {
                    ball.classList.add('show');
                });

                playSound('ball');
            }

            // 보너스 구분 기호 (+)
            await new Promise(resolve => setTimeout(resolve, 100));
            const plusSign = document.createElement('div');
            plusSign.textContent = '+';
            plusSign.style.color = '#aaa';
            plusSign.style.fontSize = '1.5rem';
            plusSign.style.fontWeight = 'bold';
            plusSign.style.margin = '0 5px';
            wrapper.appendChild(plusSign);

            // 보너스 공 표시
            await new Promise(resolve => setTimeout(resolve, 200));
            const bonusBall = document.createElement('div');
            bonusBall.className = `ball ${getBallClass(bonusNum)}`;
            bonusBall.textContent = bonusNum;
            bonusBall.style.boxShadow = `0 0 15px currentColor`;

            // 보너스 라벨
            const bonusLabel = document.createElement('div');
            bonusLabel.textContent = 'BONUS';
            bonusLabel.style.position = 'absolute';
            bonusLabel.style.top = '-20px';
            bonusLabel.style.fontSize = '0.7rem';
            bonusLabel.style.color = '#ffd700';
            bonusLabel.style.fontWeight = 'bold';
            bonusBall.appendChild(bonusLabel);

            wrapper.appendChild(bonusBall);

            requestAnimationFrame(() => {
                bonusBall.classList.add('show');
            });
            playSound('ball');
            playSound('setComplete');

            // 세트 간 딜레이
            if (setIdx < sets - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        // 완료 사운드
        await new Promise(resolve => setTimeout(resolve, 200));
        playSound('complete');

        // 기록에 추가
        allSets.forEach(nums => addToHistory(nums, model));

    } catch (error) {
        console.error('Generation Error:', error);
        container.innerHTML = '<p class="guide-message" style="color: #ff6b6b;">⚠️ 서버 연결 실패 (Backend is offline)</p>';
    }
}

// ==========================================
// Initialization & Event Listeners
// ==========================================
window.addEventListener('load', () => {
    // 1. Sound Toggle
    const soundToggle = document.getElementById('soundToggle');
    if(soundToggle) {
        soundToggle.addEventListener('click', () => {
            initAudio();
            soundEnabled = !soundEnabled;
            soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
            
            // Sync with Neural Audio Engine (Music Visualizer)
            if (typeof nnAudio !== 'undefined' && nnAudio) {
                nnAudio.setMute(!soundEnabled);
            }

            if (soundEnabled) playSound('click');
        });
    }

    // 2. Set Count Buttons
    document.querySelectorAll('.set-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            initAudio();
            playSound('click');
            document.querySelectorAll('.set-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            numSets = parseInt(btn.dataset.sets);
        });
    });

    // 3. Model Start Buttons
    document.querySelectorAll('.model-option').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (isGenerating) return;

            initAudio();
            playSound('click');
            isGenerating = true;

            // 버튼 비활성화
            document.querySelectorAll('.model-option').forEach(b => b.disabled = true);

            const model = btn.dataset.model;
            const container = document.getElementById('ballContainer');
            if(container) container.innerHTML = '<div class="spinner"></div>';

            await new Promise(resolve => setTimeout(resolve, 300));
            await showMultipleSets(model, numSets);

            // 버튼 활성화
            document.querySelectorAll('.model-option').forEach(b => b.disabled = false);
            isGenerating = false;
        });
    });

    // 4. Clear Button
    const clearBtn = document.getElementById('clearBtn');
    if(clearBtn) {
        clearBtn.addEventListener('click', () => {
            initAudio();
            playSound('click');
            document.getElementById('ballContainer').innerHTML = '<p class="guide-message">👆 위 모델 중 하나를 클릭하세요</p>';
            const dreamInput = document.getElementById('dreamInputContainer');
            const dreamResult = document.getElementById('dreamResult');
            if(dreamInput) dreamInput.style.display = 'none';
            if(dreamResult) dreamResult.style.display = 'none';
        });
    }

    // 5. Dream Interpretation Features
    const btnDream = document.getElementById('btnDream');
    if(btnDream) {
        btnDream.addEventListener('click', () => {
            initAudio();
            playSound('click');
            const container = document.getElementById('dreamInputContainer');
            if(container) {
                container.style.display = container.style.display === 'none' ? 'block' : 'none';
            }
        });
    }

    const dreamSubmitBtn = document.getElementById('dreamSubmitBtn');
    if(dreamSubmitBtn) {
        dreamSubmitBtn.addEventListener('click', async () => {
            const dreamText = document.getElementById('dreamText').value.trim();
            if (!dreamText) {
                alert('꿈 내용을 입력해주세요!');
                return;
            }

            if (isGenerating) return;
            isGenerating = true;
            initAudio();
            playSound('click');

            const container = document.getElementById('ballContainer');
            container.innerHTML = '<div class="spinner"></div><p style="color: #8b5cf6; margin-top: 10px;">🔮 꿈을 해몽하는 중...</p>';

            try {
                const response = await fetch('http://localhost:8000/dream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dream: dreamText, sets: numSets, use_llm: false })
                });

                if (!response.ok) throw new Error('API 요청 실패');

                const data = await response.json();

                // 해몽 결과 표시
                const resultDiv = document.getElementById('dreamResult');
                if(resultDiv) resultDiv.style.display = 'block';
                
                // 줄바꿈을 <br>로 변환
                const formattedInterpretation = data.interpretation.replace(/\n/g, '<br>');
                const dreamInterpretation = document.getElementById('dreamInterpretation');
                if(dreamInterpretation) dreamInterpretation.innerHTML = formattedInterpretation;

                // 발견된 상징 태그
                const symbolsDiv = document.getElementById('dreamSymbols');
                if(symbolsDiv) {
                    symbolsDiv.innerHTML = data.symbols_found.map(s =>
                        `<span class="dream-symbol-tag">${s.keyword}</span>`
                    ).join('');
                }

                // 공 표시
                container.innerHTML = '';
                for (let setIdx = 0; setIdx < data.numbers.length; setIdx++) {
                    const numbers = data.numbers[setIdx];
                    const mainNums = numbers.slice(0, 6);
                    const bonusNum = numbers[6];

                    if (numSets > 1) {
                        const label = document.createElement('div');
                        label.className = 'set-label';
                        label.textContent = `세트 ${setIdx + 1}`;
                        container.appendChild(label);
                    }

                    const wrapper = document.createElement('div');
                    wrapper.className = 'set-wrapper';
                    container.appendChild(wrapper);

                    for (let i = 0; i < mainNums.length; i++) {
                        await new Promise(r => setTimeout(r, 100));
                        const ball = document.createElement('div');
                        ball.className = `ball ${getBallClass(mainNums[i])}`;
                        ball.textContent = mainNums[i];
                        wrapper.appendChild(ball);
                        requestAnimationFrame(() => ball.classList.add('show'));
                        playSound('ball');
                    }

                    await new Promise(r => setTimeout(r, 100));
                    const plusSign = document.createElement('div');
                    plusSign.textContent = '+';
                    plusSign.style.cssText = 'color: #aaa; font-size: 1.5rem; font-weight: bold; margin: 0 5px;';
                    wrapper.appendChild(plusSign);

                    await new Promise(r => setTimeout(r, 200));
                    const bonusBall = document.createElement('div');
                    bonusBall.className = `ball ${getBallClass(bonusNum)}`;
                    bonusBall.textContent = bonusNum;
                    bonusBall.style.boxShadow = '0 0 15px currentColor';
                    wrapper.appendChild(bonusBall);
                    requestAnimationFrame(() => bonusBall.classList.add('show'));
                    playSound('ball');
                    playSound('setComplete');
                }

                playSound('complete');
                data.numbers.forEach(nums => addToHistory(nums, 'dream'));

            } catch (error) {
                console.error('Dream API Error:', error);
                container.innerHTML = '<p class="guide-message" style="color: #ff6b6b;">⚠️ 해몽 서버 연결 실패</p>';
            }

            isGenerating = false;
        });
    }

    // 6. Tab Switching Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            playSound('click');
            
            // Activate Tab Button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show Content
            const targetId = btn.dataset.tab;
            tabContents.forEach(content => {
                if(content.id === targetId) {
                    content.style.display = (targetId === 'tab-nn') ? 'flex' : 'block';
                    // Resize NN if switched to it (to fix svg size issues)
                    if(targetId === 'tab-nn' && typeof renderNetwork === 'function') {
                       setTimeout(renderNetwork, 50); 
                    }
                } else {
                    content.style.display = 'none';
                }
            });
        });
    });
});
