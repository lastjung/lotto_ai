// ==========================================
// Neural Network Visualization Logic
// ==========================================
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

const premiumColors = [
  "#FF6B6B",
  "#4FACFE",
  "#00F2FE",
  "#A29BFE",
  "#6C5CE7",
  "#FDCB6E",
  "#E17055",
  "#00B894",
  "#55E6C1",
  "#FD79A8",
];

const layerColors = [
  "#00f2fe", // Layer 1
  "#a29bfe", // Layer 2
  "#fdcb6e", // Layer 3
  "#ff7675", // Layer 4
  "#55efc4", // Layer 5
  "#81ecec", // Layer 6
];

function initNN() {
  // DOM Elements - 초기화 시점에 바인딩
  nnSvg = document.getElementById("nnSvg");
  nnStructureInput = document.getElementById("nnStructure");
  nnRandomBtn = document.getElementById("nnRandomBtn");
  nnAutoBtn = document.getElementById("nnAutoBtn");
  musicBtn = document.getElementById("nnMusicBtn");
  musicInput = document.getElementById("musicFile");
  const musicSelect = document.getElementById("musicSelect");

  renderNetwork();
  nnStructureInput.addEventListener("input", renderNetwork);
  nnRandomBtn.addEventListener("click", randomizeConnectionColors);
  nnAutoBtn.addEventListener("click", toggleAutoFlow);

  if (musicBtn && musicSelect) {
      // PLAY 버튼 클릭 시
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
      
      // 드롭다운에서 "내 음악 선택" 선택 시 바로 파일 선택창 열기
      musicSelect.addEventListener("change", () => {
          if (musicSelect.value === "custom") {
              musicInput.click();
          }
      });
      
      // 파일 선택 완료 시 재생
      musicInput.addEventListener("change", (e) => {
          const file = e.target.files[0];
          if (file) {
              startMusicVisualizerFromFile(file);
          }
      });
  }

  window.addEventListener("resize", renderNetwork);
}

function startMusicVisualizer(url) {
    // Stop previous flow or music if running
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
                analyser.fftSize = 256; 
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

// 파일 객체로부터 음악 재생
function startMusicVisualizerFromFile(file) {
    // Stop previous flow or music if running
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
            analyser.fftSize = 256; 
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
    
    // Reset Button
    if (musicBtn) {
        musicBtn.textContent = "🎵 MUSIC SYNC";
        musicBtn.style.background = "linear-gradient(135deg, #FF0080 0%, #7928CA 100%)";
    }
    
    // Reset Viz Styles
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
        l.style.opacity = "0.2";
        l.style.strokeWidth = "1.5";
        l.style.stroke = "rgba(255,255,255,0.15)";
    });
}

function animateViz() {
    if (!isMusicSyncing) return;
    animationId = requestAnimationFrame(animateViz);

    analyser.getByteFrequencyData(dataArray);

    // 1. Bass Analysis (Low Freqs: 0-10) -> Node Size Pulse
    let bassSum = 0;
    for (let i = 0; i < 10; i++) {
        bassSum += dataArray[i];
    }
    const bassLevel = bassSum / 10;
    const scale = 1 + (bassLevel / 255) * 0.8;

    // 2. 먼저 선(Line)들의 활성화 상태 계산 및 저장
    const lines = nnSvg.querySelectorAll(".conn-line");
    const totalLines = lines.length;
    const lineActivations = {}; // 각 선의 활성화 값 저장
    
    // 주파수 대역 매핑: 전체 선을 주파수 데이터 범위(약 70%)에 골고루 분포
    const freqRange = Math.floor(dataArray.length * 0.7); 
    
    lines.forEach((line, idx) => {
        // 전체 선 개수 대비 비율로 주파수 인덱스 할당 (0 ~ freqRange)
        const binIdx = 2 + Math.floor((idx / totalLines) * freqRange);
        const val = dataArray[binIdx] || 0;
        const weight = parseFloat(line.getAttribute("data-weight")) || 0.5;
        const effectiveVal = val * weight;
        
        // HSL 색상도 전체 스펙트럼(0~360)을 순환하도록 설정
        const hue = 200 + ((idx / totalLines) * 160); // 파란색(200) ~ 빨간색(360) 범위 사용
        
        // 선 ID에서 목적지 노드 추출 (line-21-31 → 31)
        const lineId = line.getAttribute("id");
        const targetNodeId = lineId.split("-")[2]; // "31"
        
        // 활성화 값 저장 (목적지 노드별로 누적)
        if (!lineActivations[targetNodeId]) {
            lineActivations[targetNodeId] = { sum: 0, maxHue: 0, count: 0 };
        }
        
        if (effectiveVal > 60) {
            line.style.opacity = Math.min(1, (effectiveVal / 255) + 0.3);
            const lightness = 50 + (effectiveVal / 255) * 20;
            line.style.stroke = `hsl(${hue}, 100%, ${lightness}%)`; 
            line.style.strokeWidth = 1.5 + (effectiveVal / 255) * 3;
            
            // 활성화된 선의 정보를 목적지 노드에 누적
            lineActivations[targetNodeId].sum += effectiveVal;
            lineActivations[targetNodeId].count += 1;
            if (effectiveVal > lineActivations[targetNodeId].maxHue) {
                lineActivations[targetNodeId].maxHue = hue;
            }
        } else {
            // 비활성화: 완전히 사라짐
            line.style.opacity = 0;
            line.style.strokeWidth = 0;
            line.style.stroke = "none";
        }
    });

    // 3. 노드(Node) 활성화: 들어오는 선들의 활성화 상태에 따라 반응
    const nodes = nnSvg.querySelectorAll(".node");
    
    nodes.forEach((node) => {
        const nodeId = node.getAttribute("id").replace("node-", ""); // "31"
        const incoming = lineActivations[nodeId];
        
        // 노드 크기: 활성화된 선에 따라 조정
        const baseRadius = 18;
        if (incoming && incoming.sum > 0) {
            // 활성화 정도에 따라 크기 변동 (0.5~1.5 배)
            const sizeFactor = 0.5 + (incoming.sum / 255) * 0.5;
            node.setAttribute("r", baseRadius * sizeFactor);
        } else {
            // 비활성화 시 기본 크기 유지
            node.setAttribute("r", baseRadius);
        }
        
        // 들어오는 활성화된 선이 있으면 노드도 활성화
        if (incoming && incoming.sum > 0) {
            const avgActivation = incoming.sum / incoming.count;
            const nodeLightness = 50 + (avgActivation / 255) * 20;
            const nodeHue = incoming.maxHue; // 가장 강한 선의 색상 사용
            
            node.style.fill = `hsl(${nodeHue}, 100%, ${nodeLightness}%)`;
            node.style.fillOpacity = "0.6";
            node.style.filter = `drop-shadow(0 0 8px hsl(${nodeHue}, 100%, 60%))`;
        } else {
            node.style.fill = "rgba(22, 33, 62, 0.5)";
            node.style.fillOpacity = "0.3";
            node.style.filter = "none";
        }
    });
}

function renderNetwork() {
  const structureStr = nnStructureInput.value;
  const layers = structureStr
    .split(",")
    .map((n) => parseInt(n.trim()))
    .filter((n) => !isNaN(n) && n > 0);

  if (layers.length < 2) return;

  nnSvg.innerHTML = "";
  nodesData = [];
  layersInfo = layers;

  const width = (nnSvg.clientWidth || nnSvg.parentElement.clientWidth) || 800; // 기본값 800 추가
  
  // 모바일에서 높이를 줄여 비율(Aspect Ratio) 유지 -> '홀쭉한 육각형' 방지
  const height = width < 768 ? 350 : 500;
  
  nnSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const layerSpacing = width / (layers.length + 1);

  // 1. Calculate positions
  layers.forEach((count, lIdx) => {
    const x = layerSpacing * (lIdx + 1);
    const nodeSpacing = height / (count + 1);
    const layerNodes = [];

    for (let nIdx = 0; nIdx < count; nIdx++) {
      const y = nodeSpacing * (nIdx + 1);
      const nodeId = `${lIdx + 1}${nIdx + 1}`;
      layerNodes.push({ id: nodeId, x, y, layer: lIdx });
    }
    nodesData.push(layerNodes);
  });

  // 2. Draw Connections (각 선에 랜덤 가중치 부여)
  for (let i = 0; i < nodesData.length - 1; i++) {
    const currentLayer = nodesData[i];
    const nextLayer = nodesData[i + 1];

    currentLayer.forEach((startNode) => {
      nextLayer.forEach((endNode) => {
        const line = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line",
        );
        line.setAttribute("x1", startNode.x);
        line.setAttribute("y1", startNode.y);
        line.setAttribute("x2", endNode.x);
        line.setAttribute("y2", endNode.y);
        line.setAttribute("class", "conn-line");
        line.setAttribute("id", `line-${startNode.id}-${endNode.id}`);
        // 랜덤 가중치 (0.4 ~ 1.0) - 너무 안 보이는 선 방지
        const weight = 0.4 + Math.random() * 0.6;
        line.setAttribute("data-weight", weight.toFixed(2));
        nnSvg.appendChild(line);
      });
    });
  }

  // 3. Draw Nodes (Layer colors applied here + 가중치 부여)
  nodesData.forEach((layer, lIdx) => {
    const lColor = layerColors[lIdx % layerColors.length];
    layer.forEach((node) => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      circle.setAttribute("cx", node.x);
      circle.setAttribute("cy", node.y);
      circle.setAttribute("r", "18");
      circle.setAttribute("class", "node");
      circle.setAttribute("id", `node-${node.id}`);
      // 노드에도 랜덤 가중치 부여 (0.3 ~ 1.0)
      const nodeWeight = 0.3 + Math.random() * 0.7;
      circle.setAttribute("data-weight", nodeWeight.toFixed(2));
      circle.style.stroke = lColor; // Multi-color Layering

      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      text.setAttribute("x", node.x);
      text.setAttribute("y", node.y);
      text.setAttribute("class", "node-label");
      text.textContent = node.id;

      g.appendChild(circle);
      g.appendChild(text);
      nnSvg.appendChild(g);
    });
  });
}

function randomizeConnectionColors() {
  const lines = nnSvg.querySelectorAll(".conn-line");
  lines.forEach((line) => {
    const randColor =
      premiumColors[Math.floor(Math.random() * premiumColors.length)];
    line.style.stroke = randColor;
    line.style.strokeWidth = "2.5";
    line.style.opacity = "0.8";

    // Extract node IDs from line ID: line-11-21
    const parts = line.id.split("-");
    const startId = parts[1];
    const endId = parts[2];

    const sNode = document.getElementById(`node-${startId}`);
    const eNode = document.getElementById(`node-${endId}`);

    if (sNode) {
      sNode.style.stroke = randColor;
      sNode.style.fill = randColor;
      sNode.style.fillOpacity = "0.2";
    }
    if (eNode) {
      eNode.style.stroke = randColor;
      eNode.style.fill = randColor;
      eNode.style.fillOpacity = "0.2";
    }
  });
  if (typeof playSound === "function") playSound("click");
}

function toggleAutoFlow() {
  if (autoFlowInterval) {
    clearInterval(autoFlowInterval);
    autoFlowInterval = null;
    nnAutoBtn.textContent = "AUTO FLOW";
    nnAutoBtn.style.background =
      "linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%)";

    // Reset nodes and lines to default and remove extra styles
    const nodes = nnSvg.querySelectorAll(".node");
    nodes.forEach((n) => {
      n.style.fill = "";
      n.style.fillOpacity = "";
      n.style.filter = "";
      // Reset stroke to layer default if we had it
    });
    renderNetwork(); // Full UI Reset
  } else {
    // Music Viz Stop if running
    if (isMusicSyncing) stopMusicVisualizer();

    nnAutoBtn.textContent = "STOP FLOW";
    nnAutoBtn.style.background =
      "linear-gradient(135deg, #ff7675 0%, #d63031 100%)";

    const startFlow = () => {
      if (autoFlowInterval) clearInterval(autoFlowInterval);
      const speedVal = parseInt(document.getElementById("nnSpeed").value);
      const intervalTime = Math.max(20, 1100 - speedVal); // 최소 20ms까지

      autoFlowInterval = setInterval(() => {
        const lines = nnSvg.querySelectorAll(".conn-line");
        if (lines.length === 0) return;

        // 속도에 따라 한 번에 터지는 선 개수 조절
        const batchSize = speedVal > 800 ? 5 : 3;

        for (let i = 0; i < batchSize; i++) {
          const randLine = lines[Math.floor(Math.random() * lines.length)];
          const randColor =
            premiumColors[Math.floor(Math.random() * premiumColors.length)];

          const parts = randLine.id.split("-");
          const startId = parts[1];
          const endId = parts[2];
          const sNode = document.getElementById(`node-${startId}`);
          const eNode = document.getElementById(`node-${endId}`);

          randLine.style.stroke = randColor;
          randLine.style.opacity = "1";
          randLine.style.strokeWidth = "2.5"; // 두께를 4에서 2.5로 하향

          if (sNode) {
            sNode.style.fill = randColor;
            sNode.style.fillOpacity = "0.5";
            sNode.style.filter = `drop-shadow(0 0 15px ${randColor})`;
          }
          if (eNode) {
            eNode.style.fill = randColor;
            eNode.style.fillOpacity = "0.5";
            eNode.style.filter = `drop-shadow(0 0 15px ${randColor})`;
          }

          setTimeout(
            () => {
              randLine.style.opacity = "0.15";
              randLine.style.strokeWidth = "1.5";
              if (sNode) {
                sNode.style.fillOpacity = "0.1";
                sNode.style.filter = "none";
              }
              if (eNode) {
                eNode.style.fillOpacity = "0.1";
                eNode.style.filter = "none";
              }
            },
            speedVal > 800 ? 400 : 800,
          );
        }
      }, intervalTime);
    };

    startFlow();
    // 슬라이더 조절 시 즉시 인터벌 재설정
    document.getElementById("nnSpeed").oninput = () => {
      if (autoFlowInterval) startFlow();
    };
  }
  if (typeof playSound === "function") playSound("click");
}

// 초기 실행
window.addEventListener('load', initNN);
