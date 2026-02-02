
const state = {
    name: '',
    age: 0,
    scores: {
        reaction: 0, // ms
        memory: 0,   // correct count
        attention: 0, // score
        spatial: 0, // score (grid)
        symbol: 0   // score (match)
    },
    currentGame: 0
};

// DOM Elements
const views = {
    info: document.getElementById('step-info'),
    games: document.getElementById('step-games'),
    loading: document.getElementById('step-loading'),
    results: document.getElementById('step-results')
};

function switchView(viewName) {
    Object.values(views).forEach(el => el.classList.add('hidden'));
    views[viewName].classList.remove('hidden');
    views[viewName].classList.add('fade-enter');
}

function startAssessment() {
    const nameInput = document.getElementById('user-name');
    const ageInput = document.getElementById('user-age');

    if (!nameInput.value || !ageInput.value) {
        alert("Please fill in all fields.");
        return;
    }

    state.name = nameInput.value;
    state.age = parseInt(ageInput.value);

    switchView('games');
    showGameIntro('Task 1: Reaction Speed', 'Click the box as soon as it turns GREEN. Respond quickly for best score.', playReactionGame);
}

function updateProgress(percent) {
    document.getElementById('progress-fill').style.width = percent + '%';
}

// Intro popup helper (bottom-right small card)
function createIntroPopup() {
    if (document.getElementById('game-intro-popup')) return;
    const el = document.createElement('div');
    el.id = 'game-intro-popup';
    el.className = 'intro-popup hidden';
    el.innerHTML = `
        <div class="intro-content">
            <h4 id="intro-title">Title</h4>
            <p id="intro-desc">Description</p>
            <button id="intro-ok">OK</button>
        </div>
    `;
    document.getElementById('app').appendChild(el);
}

function showGameIntro(title, desc, callback) {
    createIntroPopup();
    const popup = document.getElementById('game-intro-popup');
    document.getElementById('intro-title').innerText = title;
    document.getElementById('intro-desc').innerText = desc;
    popup.classList.remove('hidden');
    popup.classList.add('fade-enter');
    const ok = document.getElementById('intro-ok');
    ok.onclick = () => {
        popup.classList.add('hidden');
        if (typeof callback === 'function') callback();
    };
}

// 1. Reaction Game
function playReactionGame() {
    document.getElementById('game-title').innerText = "Task 1: Reaction Speed";
    updateProgress(10);

    const area = document.getElementById('game-area');
    area.innerHTML = `
        <p class="game-instruction">Click the box as soon as it turns GREEN.</p>
        <div id="reaction-box" class="wait-state">WAIT</div>
        <p id="rxn-result" style="margin-top: 1rem; opacity: 0;">Time: 0ms</p>
    `;

    const box = document.getElementById('reaction-box');
    let startTime;
    let waiting = true;
    let trials = [];
    const totalReactionTrials = 5;

    function startTrial() {
        if (trials.length >= totalReactionTrials) {
            const avg = trials.reduce((a, b) => a + b, 0) / trials.length;
            state.scores.reaction = avg;
            showGameIntro('Task 2: Pattern Memory', 'Watch the sequence of numbers and repeat them. Be ready to type the sequence.', playMemoryGame);
            return;
        }

        box.className = 'wait-state';
        box.innerText = "WAIT";
        waiting = true;

        const delay = 1500 + Math.random() * 2500; // Harder delay

        setTimeout(() => {
            if (!waiting) return;
            box.className = 'go-state';
            box.innerText = "CLICK!";
            startTime = Date.now();
            waiting = false;
        }, delay);
    }

    box.onclick = () => {
        if (waiting) {
            box.innerText = "Too Early!";
            waiting = false;
            setTimeout(startTrial, 1000);
        } else if (startTime) {
            const time = Date.now() - startTime;
            document.getElementById('rxn-result').innerText = `Time: ${time}ms`;
            document.getElementById('rxn-result').style.opacity = 1;
            trials.push(time);
            startTime = null;
            setTimeout(startTrial, 1000);
        }
    };

    startTrial();
}

// 2. Memory Game (Numeric Sequence)
function playMemoryGame() {
    document.getElementById('game-title').innerText = "Task 2: Pattern Memory";
    updateProgress(30);

    const area = document.getElementById('game-area');
    area.innerHTML = `
        <p class="game-instruction">Watch the sequence of numbers and repeat them.</p>
        <div id="memory-display" style="font-size: 3rem; font-weight: bold; margin: 2rem; min-height: 60px;"></div>
        <div id="memory-input" class="hidden">
            <input type="number" id="mem-answer" placeholder="Enter sequence" style="text-align: center;">
            <button onclick="checkMemory()">Submit</button>
        </div>
        <p id="mem-status" style="margin-top: 1rem; color: #94a3b8;"></p>
    `;

    let level = 5; // Start Harder
    let sequence = "";
    let roundsPlayed = 0;
    const maxMemoryRounds = 5;
    let correctCount = 0;

    function playRound() {
        if (roundsPlayed >= maxMemoryRounds) {
            state.scores.memory = (correctCount / maxMemoryRounds) * 100;
            showGameIntro('Task 3: Spatial Memory', 'Memorize the pattern of blue tiles. Recreate the pattern afterwards.', playSpatialGridGame);
            return;
        }

        const display = document.getElementById('memory-display');
        const inputDiv = document.getElementById('memory-input');
        const status = document.getElementById('mem-status');

        status.innerText = `Question ${roundsPlayed + 1} of ${maxMemoryRounds}`;
        inputDiv.classList.add('hidden');
        document.getElementById('mem-answer').value = '';

        sequence = "";
        for (let i = 0; i < level; i++) {
            sequence += Math.floor(Math.random() * 10);
        }

        display.innerText = "Ready...";

        setTimeout(() => {
            display.innerText = sequence;
            setTimeout(() => {
                display.innerText = "?";
                inputDiv.classList.remove('hidden');
                document.getElementById('mem-answer').focus();
            }, 800 + (level * 100)); // Harder timing
        }, 1000);
    }

    window.checkMemory = function () {
        const input = document.getElementById('mem-answer').value;
        roundsPlayed++;
        if (input === sequence) {
            correctCount++;
            level++;
        }
        playRound();
    };

    playRound();
}

// 3. Spatial Grid Game (New)
function playSpatialGridGame() {
    document.getElementById('game-title').innerText = "Task 3: Spatial Memory";
    updateProgress(50);

    const area = document.getElementById('game-area');
    area.innerHTML = `
        <p class="game-instruction">Memorize the pattern of blue tiles.</p>
        <div id="grid-container" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; width: 300px; margin: 2rem auto;">
            <!-- Tiles generated here -->
        </div>
        <p id="grid-status"></p>
    `;

    let pattern = [];
    let userPattern = [];
    let gridSize = 16;
    const patternSize = 7; // Increased complexity

    // Generate Grid
    const container = document.getElementById('grid-container');
    for (let i = 0; i < gridSize; i++) {
        let tile = document.createElement('div');
        tile.className = 'grid-tile';
        tile.id = `tile-${i}`;
        tile.style.backgroundColor = 'rgba(255,255,255,0.1)';
        tile.style.aspectRatio = '1';
        tile.style.borderRadius = '8px';
        tile.style.cursor = 'pointer';
        tile.onclick = () => tileClick(i);
        container.appendChild(tile);
    }

    function generatePattern() {
        pattern = [];
        while (pattern.length < patternSize) {
            let idx = Math.floor(Math.random() * gridSize);
            if (!pattern.includes(idx)) pattern.push(idx);
        }

        pattern.forEach(idx => {
            document.getElementById(`tile-${idx}`).style.backgroundColor = '#38bdf8';
        });

        setTimeout(() => {
            pattern.forEach(idx => {
                document.getElementById(`tile-${idx}`).style.backgroundColor = 'rgba(255,255,255,0.1)';
            });
            document.getElementById('grid-status').innerText = "Recreate the pattern.";
        }, 1000); // Shorter preview
    }

    function tileClick(idx) {
        if (userPattern.includes(idx)) return;
        userPattern.push(idx);
        document.getElementById(`tile-${idx}`).style.backgroundColor = '#38bdf8';

        if (userPattern.length === pattern.length) {
            let correct = userPattern.filter(x => pattern.includes(x)).length;
            state.scores.spatial = (correct / pattern.length) * 100;
            setTimeout(() => showGameIntro('Task 4: Processing Speed', 'Decide quickly if two symbols match. Press YES or NO.', playSymbolMatchGame), 1000);
        }
    }

    setTimeout(generatePattern, 1000);
}

// 4. Symbol Match Game (New)
function playSymbolMatchGame() {
    document.getElementById('game-title').innerText = "Task 4: Processing Speed";
    updateProgress(70);

    const symbols = ['★', '♠', '♣', '♥', '♦', '●', '■', '▲'];
    const area = document.getElementById('game-area');
    area.innerHTML = `
        <p class="game-instruction">Do these symbols match?</p>
        <div style="display: flex; gap: 2rem; justify-content: center; font-size: 5rem; margin: 2rem;">
            <div id="sym1"></div>
            <div id="sym2"></div>
        </div>
        <div style="display: flex; gap: 1rem; width: 100%; justify-content: center;">
            <button onclick="answerSymbol(true)" style="background: #22c55e; width: 150px;">YES</button>
            <button onclick="answerSymbol(false)" style="background: #ef4444; width: 150px;">NO</button>
        </div>
        <p id="sym-score">Score: 0</p>
    `;

    let score = 0;
    let rounds = 0;
    const maxSymbolRounds = 20; // Increased rounds
    let isMatch = false;

    function nextRound() {
        if (rounds >= maxSymbolRounds) {
            state.scores.symbol = (score / maxSymbolRounds) * 100;
            showGameIntro('Task 5: Attention Focus', 'Does the word meaning match the displayed color? Answer MATCH or NO MATCH.', playAttentionGame);
            return;
        }

        let s1 = symbols[Math.floor(Math.random() * symbols.length)];
        let s2 = (Math.random() > 0.5) ? s1 : symbols[Math.floor(Math.random() * symbols.length)];
        isMatch = (s1 === s2);

        document.getElementById('sym1').innerText = s1;
        document.getElementById('sym2').innerText = s2;
        rounds++;
    }

    window.answerSymbol = function (val) {
        if (val === isMatch) score++;
        document.getElementById('sym-score').innerText = `Score: ${score}/${rounds}`;
        nextRound();
    };

    nextRound();
}

// 5. Attention Game (Stroop)
function playAttentionGame() {
    document.getElementById('game-title').innerText = "Task 5: Attention Focus";
    updateProgress(90);

    const area = document.getElementById('game-area');
    area.innerHTML = `
        <p class="game-instruction">Does the <b>meaning</b> matches the <b>color</b>?</p>
        <div id="stroop-word" style="font-size: 4rem; font-weight: 800; margin: 2rem;">RED</div>
        <div style="display: flex; gap: 1rem; width: 100%; justify-content: center;">
            <button onclick="answerStroop(true)" style="background: #22c55e; width: 150px;">MATCH</button>
            <button onclick="answerStroop(false)" style="background: #ef4444; width: 150px;">NO MATCH</button>
        </div>
        <p id="stroop-status" style="text-align:center; margin-top:1rem;"></p>
    `;

    let score = 0;
    let rounds = 0;
    const maxStroopRounds = 10; // Increased rounds
    let currentMatch = false;

    const colors = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
    const cssColors = ['#ff0000', '#3b82f6', '#22c55e', '#eab308'];

    function nextRound() {
        if (rounds >= maxStroopRounds) {
            state.scores.attention = (score / maxStroopRounds) * 100;
            finishAssessment();
            return;
        }

        const wordIdx = Math.floor(Math.random() * 4);
        const colorIdx = Math.random() > 0.5 ? wordIdx : Math.floor(Math.random() * 4);

        currentMatch = (wordIdx === colorIdx);

        const el = document.getElementById('stroop-word');
        el.innerText = colors[wordIdx];
        el.style.color = cssColors[colorIdx];

        document.getElementById('stroop-status').innerText = `Round ${rounds + 1}/${maxStroopRounds}`;

        rounds++;
    }

    window.answerStroop = function (val) {
        if (val === currentMatch) score++;
        nextRound();
    };

    nextRound();
}

async function finishAssessment() {
    updateProgress(100);
    switchView('loading');

    // Normalize scores
    // Reaction: lower is better. 200ms = 100pts, 1000ms = 0pts
    let rxnScore = Math.max(0, Math.min(100, (1000 - state.scores.reaction) / 8));

    try {
        const response = await fetch('/submit-results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: state.name,
                age: state.age,
                memory_score: state.scores.memory,
                reaction_time: state.scores.reaction,
                attention_score: state.scores.attention,
                spatial_score: state.scores.spatial,
                symbol_match_score: state.scores.symbol
            })
        });

        const data = await response.json();
        showResults(data, rxnScore);
    } catch (e) {
        alert("Error connecting to server.");
        console.error(e);
    }
}

function showResults(data, rxnScore) {
    switchView('results');
    const content = document.getElementById('result-content');
    const eeg = data.eeg_comparison;

    content.innerHTML = `
        <div class="result-card">
            <h3>Assessment Summary (Age Group: ${data.age_group})</h3>
            <p style="font-size: 1.1rem; margin-bottom: 1rem;">${data.interpretation}</p>
        </div>
        
        <div class="result-card" style="border-left-color: ${data.predicted_cognitive_state === 'Excelling' ? '#22c55e' : '#f59e0b'}">
            <h3>Cognitive Performance Status</h3>
            <p style="font-size: 1.5rem; font-weight: bold;">${data.predicted_cognitive_state}</p>
        </div>
    `;

    // Render Charts
    renderRadarChart(state.scores.memory, rxnScore, state.scores.attention, state.scores.spatial, state.scores.symbol);
    renderBarChart(eeg);

    // V3: Render New Visualizations
    renderBrainHeatmap(state.scores);
    renderFocusGauge(eeg.FocusIndex);
    renderEEGTrace(data.predicted_cognitive_state);
}

function renderRadarChart(mem, rxn, att, spa, sym) {
    const ctx = document.getElementById('radarChart').getContext('2d');
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Memory', 'Reaction', 'Attention', 'Spatial', 'Processing'],
            datasets: [{
                label: 'Your Profile',
                data: [mem, rxn, att, spa, sym],
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                borderColor: 'rgba(56, 189, 248, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(56, 189, 248, 1)'
            },
            {
                label: 'Age Group Avg (Est)',
                data: [75, 70, 75, 70, 75], // Estimation line
                backgroundColor: 'rgba(148, 163, 184, 0.1)',
                borderColor: 'rgba(148, 163, 184, 0.5)',
                borderDash: [5, 5],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    pointLabels: { color: '#e2e8f0' },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            },
            plugins: {
                legend: { labels: { color: '#e2e8f0' } }
            }
        }
    });
}

function renderBarChart(eegData) {
    const ctx = document.getElementById('barChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Delta', 'Theta', 'Alpha', 'Beta'],
            datasets: [{
                label: 'Typical Spectral Power (µV²/Hz)',
                
                data: [eegData.TypicalDelta, eegData.TypicalTheta, eegData.TypicalAlpha, eegData.TypicalBeta],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.6)',
                    'rgba(234, 179, 8, 0.6)',
                    'rgba(34, 197, 94, 0.6)',
                    'rgba(59, 130, 246, 0.6)'
                ],
                borderColor: [
                    'rgba(239, 68, 68, 1)',
                    'rgba(234, 179, 8, 1)',
                    'rgba(34, 197, 94, 1)',
                    'rgba(59, 130, 246, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#e2e8f0' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#e2e8f0' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// V3 Visualizations

function renderBrainHeatmap(scores) {
    const container = document.getElementById('brain-heatmap-container');

    // Normalize opacities based on scores (0 to 1)
    const frontalOp = Math.min(1, Math.max(0.2, scores.attention / 100)); // Executive/Attention
    const parietalOp = Math.min(1, Math.max(0.2, scores.spatial / 100)); // Spatial
    const temporalOp = Math.min(1, Math.max(0.2, scores.memory / 100));  // Memory
    const occipitalOp = Math.min(1, Math.max(0.2, scores.symbol / 100)); // Visual

    // Simple SVG Brain Map
    const svg = `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <!-- Frontal Lobe (Attention) -->
        <path d="M60,80 Q100,20 140,80 L140,100 L60,100 Z" fill="rgba(59, 130, 246, ${frontalOp})" stroke="white" stroke-width="2">
            <title>Frontal Lobe: Executive Function & Attention</title>
        </path>
        <!-- Parietal Lobe (Spatial) -->
        <path d="M60,80 Q100,20 140,80 L100,120 Z" transform="translate(0, -30)" fill="rgba(34, 197, 94, ${parietalOp})" stroke="white" stroke-width="2">
            <title>Parietal Lobe: Spatial Processing</title>
        </path>
        <!-- Temporal Lobes (Memory) -->
        <circle cx="40" cy="110" r="30" fill="rgba(234, 179, 8, ${temporalOp})" stroke="white" stroke-width="2">
             <title>Temporal Lobe: Memory & Auditory</title>
        </circle>
        <circle cx="160" cy="110" r="30" fill="rgba(234, 179, 8, ${temporalOp})" stroke="white" stroke-width="2"></circle>
        
        <!-- Occipital Lobe (Visual/Symbol) -->
        <path d="M70,140 Q100,180 130,140 L130,120 L70,120 Z" fill="rgba(239, 68, 68, ${occipitalOp})" stroke="white" stroke-width="2">
            <title>Occipital Lobe: Visual Processing</title>
        </path>
        
        <!-- Text Labels -->
        <text x="100" y="60" text-anchor="middle" fill="white" font-size="10">Frontal</text>
        <text x="100" y="150" text-anchor="middle" fill="white" font-size="10">Occipital</text>
        <text x="40" y="110" text-anchor="middle" fill="white" font-size="10">Temporal</text>
    </svg>
    `;

    container.innerHTML = svg;
}

function renderFocusGauge(focusIndex) {
    const ctx = document.getElementById('gaugeChart').getContext('2d');
    const valueDiv = document.getElementById('gauge-value');

    valueDiv.innerText = focusIndex;
    valueDiv.style.color = focusIndex > 2 ? '#22c55e' : (focusIndex > 1 ? '#eab308' : '#ef4444');

    // Max reasonable ratio approx 5
    const gaugeValue = Math.min(5, focusIndex);
    const remainder = 5 - gaugeValue;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Focus Level', 'Potential'],
            datasets: [{
                data: [gaugeValue, remainder],
                backgroundColor: [
                    focusIndex > 2 ? '#22c55e' : (focusIndex > 1 ? '#eab308' : '#ef4444'),
                    'rgba(255,255,255,0.1)'
                ],
                borderWidth: 0
            }]
        },
        options: {
            rotation: -90,
            circumference: 180,
            cutout: '70%',
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            aspectRatio: 2
        }
    });
}

function renderEEGTrace(cognitiveState) {
    const canvas = document.getElementById('eegTrace');
    const ctx = canvas.getContext('2d');

    // Adjust canvas resolution
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    let time = 0;

    // Parameters based on state
    let speed = 0.1;
    let amplitude = 20;
    let frequency = 0.05;

    if (cognitiveState === "Excelling") {
        // High Beta (Fast, Low Amplitude)
        speed = 0.2;
        amplitude = 15;
        frequency = 0.1;
    } else if (cognitiveState === "Needs Improvement") {
        // High Theta (Slow, High Amplitude)
        speed = 0.05;
        amplitude = 30;
        frequency = 0.02;
    }

    function animate() {
        requestAnimationFrame(animate);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);

        for (let x = 0; x < canvas.width; x++) {
            // Composite Wave (Simulation)
            const y = canvas.height / 2 +
                Math.sin(x * frequency + time) * amplitude +
                Math.sin(x * frequency * 2 + time * 1.5) * (amplitude / 2) + // Harmonic
                (Math.random() - 0.5) * 5; // Noise
            ctx.lineTo(x, y);
        }

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        time += speed;
    }

    animate();
}
