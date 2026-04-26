// State
let currentRiddle = null;
let currentAnswer = null;
let currentLevel = parseInt(localStorage.getItem('treasureHuntLevel')) || 1;
let selectedDifficulty = 'medium';
let usedAnswers = JSON.parse(localStorage.getItem('usedAnswers')) || [];

function saveState() {
    localStorage.setItem('treasureHuntLevel', currentLevel);

    localStorage.setItem('usedAnswers', JSON.stringify(usedAnswers));
}

// Load state on start
window.onload = () => {
    levelBadge.textContent = `Level ${currentLevel}`;
};

// DOM Elements

const startBtn = document.getElementById('startBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const answerInput = document.getElementById('answerInput');
const riddleDisplay = document.getElementById('riddleDisplay');
const feedback = document.getElementById('feedback');
const levelBadge = document.getElementById('levelBadge');

const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const chatMessages = document.getElementById('chatMessages');

const victoryModal = document.getElementById('victoryModal');



// 1. Fetch Riddle from AI
async function getRiddle() {
    setLoading(true);
    saveState();
    // Hide difficulty selector once game starts
    const diffSelector = document.querySelector('.difficulty-selector');
    if (diffSelector) diffSelector.style.display = 'none';
    
    try {
        const excludeQuery = usedAnswers.length > 0 ? `&exclude=${encodeURIComponent(usedAnswers.join(','))}` : '';
        const res = await fetch(`/api/riddle?${excludeQuery}`);
        const data = await res.json();
        
        if (data.riddle && data.answer) {
            currentRiddle = data.riddle;
            currentAnswer = data.answer.toLowerCase().trim();
            usedAnswers.push(currentAnswer);
            saveState();
            
            riddleDisplay.innerHTML = `<p>${currentRiddle}</p>`;
            enableInputs(true);
            feedback.textContent = '';
            answerInput.value = '';
            
            if (currentLevel === 1) {
                appendChatMessage("I've found an ancient riddle for you. Try to solve it!", false);
            }
        }
    } catch (err) {
        riddleDisplay.textContent = "Oops! The AI is having trouble. Please try again.";
        console.error(err);
    } finally {
        setLoading(false);
    }
}

// 2. Check Answer
function checkAnswer() {
    const userGuess = answerInput.value.toLowerCase().trim();
    if (!userGuess) return;

    if (userGuess === currentAnswer || currentAnswer.includes(userGuess)) {
        feedback.textContent = "Correct! Well done, explorer!";
        feedback.className = "feedback success";
        
        enableInputs(false);
        startBtn.classList.add('hidden');
        nextBtn.classList.remove('hidden');
        
        if (currentLevel >= 3) {
            showVictory();
        }
    } else {
        feedback.textContent = "Not quite. Ask the AI Guide for a hint!";
        feedback.className = "feedback error";
    }
}

// 3. AI Chatbot (Hints)
async function sendHintRequest() {
    const message = chatInput.value.trim();
    if (!message || !currentRiddle) return;

    appendChatMessage(message, true);
    chatInput.value = '';
    
    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                riddle: currentRiddle,
                answer: currentAnswer
            })
        });
        const data = await res.json();
        appendChatMessage(data.reply, false);
    } catch (err) {
        appendChatMessage("Sorry, I'm a bit lost in the library. Ask again?", false);
    }
}

// Helpers
function setLoading(loading) {
    if (loading) {
        riddleDisplay.innerHTML = '<div class="loader">🔍 Searching scrolls...</div>';
        startBtn.disabled = true;
    } else {
        startBtn.disabled = false;
    }
}

function enableInputs(enabled) {
    answerInput.disabled = !enabled;
    submitBtn.disabled = !enabled;
    chatInput.disabled = !enabled;
    sendChatBtn.disabled = !enabled;
    if (enabled) answerInput.focus();
}

function appendChatMessage(text, isUser) {
    const div = document.createElement('div');
    div.className = `msg ${isUser ? 'user-msg' : 'ai-msg'}`;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function showVictory() {
    victoryModal.classList.remove('hidden');
    startConfetti();
    const modalContent = victoryModal.querySelector('p');
    modalContent.textContent = "Unearthing your legendary treasure...";
    
    try {
        const res = await fetch('/api/reward');
        const data = await res.json();
        modalContent.textContent = data.story;
    } catch (err) {
        modalContent.textContent = "You found a legendary chest overflowing with shimmering gold!";
    }
}

function startConfetti() {
    const container = document.getElementById('confetti-container');
    const colors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];
    
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        confetti.style.opacity = Math.random();
        container.appendChild(confetti);
    }
}

// Events
startBtn.addEventListener('click', getRiddle);
nextBtn.addEventListener('click', () => {
    currentLevel++;
    levelBadge.textContent = `Level ${currentLevel}`;
    nextBtn.classList.add('hidden');
    getRiddle();
});

submitBtn.addEventListener('click', checkAnswer);
answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkAnswer();
});

sendChatBtn.addEventListener('click', sendHintRequest);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendHintRequest();
});

document.getElementById('resetBtn').addEventListener('click', () => {
    localStorage.clear();
    location.reload();
});
