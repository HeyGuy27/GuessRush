// Game state
const gameState = {
    currentNumber: null, // The current number to guess
    attemptsLeft: 0, // The number of attempts left
    maxAttempts: 12, // The maximum number of attempts
    minRange: 1, // The minimum number in the range
    maxRange: 100, // The maximum number in the range
    gameMode: 'classic',
    difficulty: 'easy',
    usedHelp: false,
    achievements: new Set(),
    chaosInterval: null, // Add interval for chaos mode
    streak: {
        current: 0, // current streak
        max: 0,     // max streak
        gamesPlayed: 0,
        gamesWon: 0,
        bestStreak: 0
    },
    stats: { // The stats of the game
        gamesPlayed: 0,
        gamesWon: 0,
        bestScore: Infinity, // overall best score
        totalAttempts: 0, // total number of attempts
        bestByMode: {
            classic: Infinity,
            chaos: Infinity,
            math: Infinity,
            daily: Infinity
        },
        dailyStats: {
            daysPlayed: 0,
            daysWon: 0,
            currentStreak: 0,
            maxStreak: 0,
            lastWinDate: null
        },
        totalScore: 0,
        modesWon: {}
    },
    botGuesses: new Set(),
    botWon: false,
    botInterval: null,
    startTime: null,
    botGuessedNumbers: new Set(),
    botTurn: false,
    botSkillLevel: 0, // 0 = random, 1 = smart
    botMin: 0,
    botMax: 0,
    botGuessCount: 0,
    achievementsTiers: {},
    achievementsEarnedThisRound: [],
    lastRoundAchievements: [], // <-- NEW: store last round with achievements
    blitzStarted: false,
};

// --- Tiered Achievements System ---
const tierColors = { bronze: '#cd7f32', silver: '#b0b0b0', gold: '#ffd700', platinum: '#00e6e6' };
const tierIcons = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '🏆' };
const tierNames = ['bronze', 'silver', 'gold', 'platinum'];
const tieredAchievements = {
    'Lightning Fast': [
        { tier: 'bronze', condition: (numGuesses) => numGuesses < 6, description: 'Win in less than 6 guesses' },
        { tier: 'silver', condition: (numGuesses) => numGuesses < 4, description: 'Win in less than 4 guesses' },
        { tier: 'gold', condition: (numGuesses) => numGuesses === 1, description: 'Win on your first guess!' }
    ],
    'Quick Thinker': [
        { tier: 'bronze', condition: (seconds) => seconds < 30, description: 'Win in under 30 seconds' },
        { tier: 'silver', condition: (seconds) => seconds < 20, description: 'Win in under 20 seconds' },
        { tier: 'gold', condition: (seconds) => seconds < 10, description: 'Win in under 10 seconds!' }
    ],
    'Bot Buster (Easy)': [ { tier: 'bronze', condition: () => true, description: 'Beat the bot on easy mode' } ],
    'Bot Buster (Medium)': [ { tier: 'silver', condition: () => true, description: 'Beat the bot on medium mode' } ],
    'Bot Buster (Hard)': [ { tier: 'gold', condition: () => true, description: 'Beat the bot on hard mode' } ],
    'Bot Buster (Chaos)': [ { tier: 'platinum', condition: () => true, description: 'Beat the bot on chaos mode!' } ],
    'Streak Master': [
        { tier: 'bronze', condition: (streak) => streak >= 1 && streak <= 3, description: 'Win 1-3 games in a row' },
        { tier: 'silver', condition: (streak) => streak >= 4 && streak <= 7, description: 'Win 4-7 games in a row' },
        { tier: 'gold', condition: (streak) => streak >= 8 && streak <= 11, description: 'Win 8-11 games in a row' },
        { tier: 'platinum', condition: (streak) => streak === 12, description: 'Win 12 games in a row!' }
    ],
    // Expanded tiered achievements:
    'Persistent': [
        { tier: 'bronze', condition: (numGuesses, maxAttempts) => numGuesses === maxAttempts, description: 'Win on your last attempt' },
        { tier: 'silver', condition: (numGuesses, maxAttempts) => numGuesses >= Math.floor(0.9 * maxAttempts), description: 'Win after using 90%+ of attempts' },
        { tier: 'gold', condition: (numGuesses, maxAttempts) => numGuesses === maxAttempts - 1, description: 'Win with only one attempt left' },
        { tier: 'platinum', condition: (numGuesses, maxAttempts, usedHelp) => numGuesses === maxAttempts && !usedHelp, description: 'Win on last attempt without hints' }
    ],
    'Help Seeker': [
        { tier: 'bronze', condition: (hints) => hints >= 1, description: 'Win after using at least 1 hint' },
        { tier: 'silver', condition: (hints) => hints >= 2, description: 'Win after using 2+ hints' },
        { tier: 'gold', condition: (hints) => hints >= 3, description: 'Win after using 3+ hints' },
        { tier: 'platinum', condition: (hints, guesses) => hints >= guesses, description: 'Used a hint on every guess' }
    ],
    'Perfect Score': [
        { tier: 'bronze', condition: (score, stats) => score < 0.8 * (stats.bestScore || 1000), description: 'Score better than 80% of your previous games' },
        { tier: 'silver', condition: (score, stats) => score < 0.9 * (stats.bestScore || 1000), description: 'Score better than 90% of your previous games' },
        { tier: 'gold', condition: (score, stats) => score === stats.bestScore, description: 'Best score ever' },
        { tier: 'platinum', condition: (score, stats, numGuesses, usedHelp, difficulty) => score === 1 && numGuesses === 1 && !usedHelp && difficulty === 'hard', description: 'Best possible score (first guess, no hints, hard mode)' }
    ],
    'Range Master': [
        { tier: 'bronze', condition: (range) => range >= 250, description: 'Win with range 1-250' },
        { tier: 'silver', condition: (range) => range >= 500, description: 'Win with range 1-500' },
        { tier: 'gold', condition: (range) => range >= 1000, description: 'Win with range 1-1000' },
        { tier: 'platinum', condition: (range) => range >= 2000, description: 'Win with range 1-2000' }
    ],
    'Daily Champion': [
        { tier: 'bronze', condition: (days) => days >= 1, description: 'Win 1 daily challenge' },
        { tier: 'silver', condition: (days) => days >= 5, description: 'Win 5 daily challenges' },
        { tier: 'gold', condition: (days) => days >= 15, description: 'Win 15 daily challenges' },
        { tier: 'platinum', condition: (days, streak) => streak >= 30, description: 'Win 30 daily challenges in a row' }
    ],
    'Blitz Champion': [
        { tier: 'bronze', condition: (time) => time < 60, description: 'Win blitz mode' },
        { tier: 'silver', condition: (time) => time < 20, description: 'Win blitz mode in under 20 seconds' },
        { tier: 'gold', condition: (time) => time < 10, description: 'Win blitz mode in under 10 seconds' },
        { tier: 'platinum', condition: (numGuesses, time) => numGuesses === 1 && time < 60, description: 'Win blitz mode with only one guess' }
    ],
    'Math Whiz': [
        { tier: 'bronze', condition: () => true, description: 'Win math mode' },
        { tier: 'silver', condition: (usedHelp) => !usedHelp, description: 'Win math mode with no hints' },
        { tier: 'gold', condition: (numGuesses) => numGuesses === 1, description: 'Win math mode on first try' },
        { tier: 'platinum', condition: (wins) => wins >= 10, description: 'Win math mode 10 times' }
    ],
    'Comeback King': [
        { tier: 'bronze', condition: (cold) => cold >= 3, description: 'Win after 3 cold guesses in a row' },
        { tier: 'silver', condition: (cold) => cold >= 5, description: 'Win after 5 cold guesses in a row' },
        { tier: 'gold', condition: (cold) => cold >= 7, description: 'Win after 7 cold guesses in a row' },
        { tier: 'platinum', condition: (cold) => cold >= 10, description: 'Win after 10 cold guesses in a row' }
    ],
    'All Rounder': [
        { tier: 'bronze', condition: (modes) => modes >= 3, description: 'Win in 3 different modes' },
        { tier: 'silver', condition: (modes) => modes >= 6, description: 'Win in 6 different modes' },
        { tier: 'gold', condition: (modes) => modes >= 10, description: 'Win in all modes' },
        { tier: 'platinum', condition: (modes, noHints) => modes >= 10 && noHints, description: 'Win in all modes without hints' }
    ],
    // The rest remain as bronze only
    'Never Give Up': [ { tier: 'bronze', condition: () => true, description: 'Win using your last attempt' } ],
    'Perfect Streak': [ { tier: 'bronze', condition: () => true, description: 'Complete Streak Mode without a loss' } ],
    'Chaos Master': [ { tier: 'bronze', condition: () => true, description: 'Win in chaos mode' } ],
    'Break the Bot': [ { tier: 'bronze', condition: () => true, description: 'Win in break the bot mode' } ],
    'Double Chaos': [ { tier: 'bronze', condition: () => true, description: 'Win in double chaos mode' } ],
    'Reverse Master': [ { tier: 'bronze', condition: () => true, description: 'Win in reverse mode' } ],
    'Sudden Death': [ { tier: 'bronze', condition: () => true, description: 'Win in sudden death mode' } ],
    'Speed Demon': [
        { tier: 'gold', condition: (seconds) => seconds < 10, description: 'Win in under 10 seconds' },
        { tier: 'silver', condition: (seconds) => seconds < 20, description: 'Win in under 20 seconds' },
        { tier: 'bronze', condition: (seconds) => seconds < 30, description: 'Win in under 30 seconds' }
    ],
    'First Win': [
        { tier: 'bronze', condition: () => true, description: 'Win your first game' }
    ],
};

const elements = {
    gameMode: document.getElementById('gameMode'), 
    difficulty: document.getElementById('difficulty'),
    attemptsLeft: document.getElementById('attemptsLeft'),
    numberRange: document.getElementById('numberRange'),
    guessInput: document.getElementById('guessInput'),
    submitGuess: document.getElementById('submitGuess'),
    helpButton: document.getElementById('helpButton'),
    feedbackMessage: document.getElementById('feedbackMessage'),
    themeLight: document.getElementById('themeLight'),
    themeDark: document.getElementById('themeDark'),
    themeNeon: document.getElementById('themeNeon'),
    themePastel: document.getElementById('themePastel'),
    achievementsList: document.getElementById('achievementsList'),
    statsDisplay: document.getElementById('statsDisplay'),
    victoryAnimation: document.getElementById('victoryAnimation'),
    chaosTimer: document.getElementById('chaosTimer'),
    timeLeft: document.getElementById('timeLeft'),
    resetAchievements: document.getElementById('resetAchievements'),
    resetStats: document.getElementById('resetStats'),
    gameArea: document.querySelector('.game-area'),
};

let guessHistory = [];

const modeExplanations = {
  classic: "Guess the hidden number within the range and limited attempts.",
  chaos: "The number changes every 15 seconds! Try to guess before it changes.",
  math: "Get math hints to help you guess the number.",
  daily: "Daily challenge - try to win once a day.",
  streak: "Win? The range increases and attempts decrease! How long can your streak last?",
  reverse: "Hot/Cold is reversed! Hot = far, Cold = close.",
  blitz: "You have only 30 seconds to guess the number!",
  sudden: "Only one guess! Hit or miss.",
  bot: "Compete against the bot - who will guess first?",
  doublechaos: "Range and number change every 15 seconds!",
  breakthebot: "Try to outsmart the bot in guessing the number."
};

function updateModeExplanation() {
    const explanation = modeExplanations[gameState.gameMode] || "";
    const el = document.getElementById('modeExplanation');
    if (el) {
        el.textContent = explanation;
        el.style.display = '';
    }
}

function initGame() { 
    loadFromLocalStorage();
    setupEventListeners(); 
    updateDifficultySettings();
    updateUI();
    updateModeExplanation();
    updateDifficultyExplanation();
    startNewGame();
    updateStatsDisplay();
}

function loadFromLocalStorage() { 
    const savedStats = localStorage.getItem('guessRushStats'); 
    const savedAchievementsTiers = localStorage.getItem('guessRushAchievementsTiers');
    const savedTheme = localStorage.getItem('guessRushTheme');

    if (savedStats) {
        gameState.stats = JSON.parse(savedStats);
    }
    if (savedAchievementsTiers) {
        gameState.achievementsTiers = JSON.parse(savedAchievementsTiers);
    }
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeButtons(savedTheme);
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        updateThemeButtons('light');
    }
}

function saveToLocalStorage() {
    localStorage.setItem('guessRushStats', JSON.stringify(gameState.stats));
    localStorage.setItem('guessRushAchievementsTiers', JSON.stringify(gameState.achievementsTiers || {}));
}

function setupEventListeners() {
    elements.gameMode.addEventListener('change', handleGameModeChange);
    elements.difficulty.addEventListener('change', handleDifficultyChange);
    elements.submitGuess.addEventListener('click', handleGuess);
    elements.helpButton.addEventListener('click', handleHelp);
    elements.themeLight.addEventListener('click', () => setTheme('light'));
    elements.themeDark.addEventListener('click', () => setTheme('dark'));
    elements.themeNeon.addEventListener('click', () => setTheme('neon'));
    elements.themePastel.addEventListener('click', () => setTheme('pastel'));
    elements.resetAchievements.addEventListener('click', handleResetAchievements);
    elements.resetStats.addEventListener('click', handleResetStats);
    elements.guessInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleGuess();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case '1':
                    e.preventDefault();
                    setTheme('light');
                    break;
                case '2':
                    e.preventDefault();
                    setTheme('dark');
                    break;
                case '3':
                    e.preventDefault();
                    setTheme('neon');
                    break;
                case '4':
                    e.preventDefault();
                    setTheme('pastel');
                    break;
                case 'r':
                    if (e.shiftKey) {
                        e.preventDefault();
                        handleResetStats();
                    }
                    break;
                case 'a':
                    if (e.shiftKey) {
                        e.preventDefault();
                        handleResetAchievements();
                    }
                    break;
            }
        }
        
        if (e.key === 'Escape') {
            elements.guessInput.value = '';
            elements.guessInput.focus();
        }
    });
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('guessRushTheme', theme);
    updateThemeButtons(theme);
    updateStatsDisplay();
}

function updateThemeButtons(activeTheme) {
    ['themeLight', 'themeDark', 'themeNeon', 'themePastel'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.remove('active');
    });
    const activeButton = document.getElementById('theme' + activeTheme.charAt(0).toUpperCase() + activeTheme.slice(1));
    if (activeButton) activeButton.classList.add('active');
}

function handleGameModeChange() {
    gameState.gameMode = elements.gameMode.value;
    if (gameState.chaosInterval) {
        clearInterval(gameState.chaosInterval);
        gameState.chaosInterval = null;
    }
    if (gameState.botInterval) {
        clearInterval(gameState.botInterval);
        gameState.botInterval = null;
    }
    if (gameState.blitzTimeout) {
        clearTimeout(gameState.blitzTimeout);
        gameState.blitzTimeout = null;
    }
    if (gameState.blitzInterval) {
        clearInterval(gameState.blitzInterval);
        gameState.blitzInterval = null;
    }
    updateDifficultySettings();
    startNewGameWithTransition();
    updateUI(); 
    updateModeExplanation(); 
    updateDifficultyExplanation();
    updateBodyModeClass();
    updateStatsDisplay();
}

function handleDifficultyChange() {
    gameState.difficulty = elements.difficulty.value;
    updateDifficultySettings();
    startNewGameWithTransition();
    updateUI();
    updateDifficultyExplanation();
    updateStatsDisplay();
}

function startNewGameWithTransition() {
    if (elements.gameArea) {
        elements.gameArea.classList.add('transitioning');
        
        setTimeout(() => {
            elements.gameArea.classList.remove('transitioning');
            elements.gameArea.classList.add('loading');
            
            startNewGame();
            
            setTimeout(() => {
                elements.gameArea.classList.remove('loading');
                elements.gameArea.classList.add('transitioning-in');
                
                setTimeout(() => {
                    elements.gameArea.classList.remove('transitioning-in');
                }, 500);
            }, 200);
        }, 300);
    } else {
        startNewGame();
    }
}

function updateDifficultySettings() {
    if (gameState.gameMode === 'practice') {
        switch (gameState.difficulty) {
            case 'easy':
                gameState.minRange = 1;
                gameState.maxRange = 100;
                break;
            case 'medium':
                gameState.minRange = 1;
                gameState.maxRange = 250;
                break;
            case 'hard':
                gameState.minRange = 1;
                gameState.maxRange = 500;
                break;
            case 'chaos':
                gameState.minRange = 1;
                gameState.maxRange = 1000;
                break;
        }
        gameState.maxAttempts = Infinity;
        gameState.attemptsLeft = Infinity;
    } else {
        gameState.minRange = 1;
        // Modes with unique logic
        if (gameState.gameMode === 'streak') {
            gameState.maxRange = 100;
            gameState.maxAttempts = 12;
            gameState.attemptsLeft = 12; 
            gameState.streakCurrent = 0; 
            gameState.streakMaxRange = 100;
        } else if (gameState.gameMode === 'sudden') {
            // Always 1 attempt, but range by difficulty
            switch (gameState.difficulty) {
                case 'easy':
                    gameState.maxRange = 100;
                    break;
                case 'medium':
                    gameState.maxRange = 250;
                    break;
                case 'hard':
                    gameState.maxRange = 500;
                    break;
                case 'chaos':
                    gameState.maxRange = 1000;
                    break;
            }
            gameState.maxAttempts = 1;
            gameState.attemptsLeft = 1;
        } else if (gameState.gameMode === 'doublechaos') {
            if (gameState.chaosInterval) {
                clearInterval(gameState.chaosInterval);
            }
            elements.chaosTimer.classList.remove('hidden');
            let timeRemaining = 15;
            elements.timeLeft.textContent = timeRemaining;
            const timerInterval = setInterval(() => {
                timeRemaining--;
                elements.timeLeft.textContent = timeRemaining;
                if (timeRemaining <= 0) {
                    clearInterval(timerInterval);
                }
            }, 1000);
            function randomRange() {
                let min = Math.floor(Math.random() * 200) + 1;
                let max = min + Math.floor(Math.random() * 300) + 50;
                if (max > 1000) max = 1000;
                if (min > max - 10) min = max - 10;
                return [min, max];
            }
            function animateRange() {
                const rangeElem = elements.numberRange;
                if (!rangeElem) return;
                rangeElem.classList.add('range-animate');
                setTimeout(() => rangeElem.classList.remove('range-animate'), 1200);
            }
            function setNewRangeAndNumber() {
                const [min, max] = randomRange();
                gameState.minRange = min;
                gameState.maxRange = max;
                gameState.currentNumber = Math.floor(Math.random() * (max - min + 1)) + min;
                animateRange();
                updateUI();
                showFeedback('Number & range changed!', 'hint');
            }
            setNewRangeAndNumber();
            gameState.chaosInterval = setInterval(() => {
                setNewRangeAndNumber();
                timeRemaining = 15;
                elements.timeLeft.textContent = timeRemaining;
                const newTimerInterval = setInterval(() => {
                    timeRemaining--;
                    elements.timeLeft.textContent = timeRemaining;
                    if (timeRemaining <= 0) {
                        clearInterval(newTimerInterval);
                    }
                }, 1000);
            }, 15000);
        } else {
            // All other modes use the selected difficulty
            switch (gameState.difficulty) {
                case 'easy':
                    gameState.maxRange = 100;
                    gameState.maxAttempts = 12;
                    break;
                case 'medium':
                    gameState.maxRange = 250;
                    gameState.maxAttempts = 10;
                    break;
                case 'hard':
                    gameState.maxRange = 500;
                    gameState.maxAttempts = 8;
                    break;
                case 'chaos':
                    gameState.maxRange = 1000;
                    gameState.maxAttempts = 5;
                    break;
            }
            gameState.attemptsLeft = gameState.maxAttempts;
            // Reset bot/game-specific state for relevant modes
            if ([
                'bot',
                'breakthebot',
                'reverse',
                'blitz',
                'chaos',
                'math',
                'daily',
                'classic'
            ].includes(gameState.gameMode)) {
                if (gameState.gameMode === 'breakthebot') {
                    gameState.botGuesses = [];
                    gameState.botGuessedNumbers = new Set();
                    gameState.botTurn = false;
                    gameState.botSkillLevel = 0;
                    gameState.botMin = gameState.minRange;
                    gameState.botMax = gameState.maxRange;
                    updateBotGuessHistoryDisplay();
                    elements.guessInput.disabled = false;
                    elements.submitGuess.disabled = false;
                    elements.helpButton.disabled = false;
                }
                // Add any other mode-specific resets if needed
            }
        }
    }
    // Update UI to reflect new difficulty settings
    updateUI();
}


function getTodayKey() {
    const today = new Date().toISOString().slice(0, 10);
    return `guessRushDaily_${today}`;
}

function saveDailyResult(result) {
    localStorage.setItem(getTodayKey(), JSON.stringify(result));
}

function getDailyResult() {
    const data = localStorage.getItem(getTodayKey());
    return data ? JSON.parse(data) : null;
}

function showDailyResultModal(result) {
    const modal = document.getElementById('dailyResultModal');
    const textDiv = document.getElementById('dailyResultText');
    const shareBtn = document.getElementById('shareDailyResult');
    const closeBtn = document.getElementById('closeDailyResult');
    if (!modal || !textDiv || !shareBtn || !closeBtn) {
        showDailyResultMessage(result);
        return;
    }

    let msg = '';
    if (result.win) {
        msg = `You already played today's Daily Challenge and <b>WON</b> in <b>${result.attempts}</b> attempts!<br>Come back tomorrow!`;
    } else {
        msg = `You already played today's Daily Challenge and <b>did not win</b>.<br>The number was <b>${result.number}</b>.<br>Come back tomorrow!`;
    }

    textDiv.innerHTML = msg;
    textDiv.setAttribute('aria-live', 'polite');
    modal.classList.remove('hidden');
    closeBtn.focus();
    const focusable = [shareBtn, closeBtn];
    let lastFocused = document.activeElement;
    function trapFocus(e) {
        if (e.key === 'Tab') {
            const idx = focusable.indexOf(document.activeElement);
            if (e.shiftKey) {
                if (idx <= 0) {
                    e.preventDefault();
                    focusable[focusable.length - 1].focus();
                }
            } else {
                if (idx === focusable.length - 1) {
                    e.preventDefault();
                    focusable[0].focus();
                }
            }
        }
    }

    modal.addEventListener('keydown', trapFocus);

    shareBtn.onclick = () => {
        const shareText = result.win
            ? `GuessRush Daily Challenge: WON in ${result.attempts} attempts!`
            : `GuessRush Daily Challenge: Did not win. The number was ${result.number}.`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareText).then(() => {
                shareBtn.textContent = 'Copied!';
                setTimeout(() => shareBtn.textContent = 'Share Result', 1200);
            });
        } else {
            window.prompt('Copy this:', shareText);
        }
    };

    function closeModal() {
        modal.classList.add('hidden');
        modal.removeEventListener('keydown', trapFocus);
        if (lastFocused && lastFocused.focus) {
            setTimeout(() => lastFocused.focus(), 50);
        } else if (elements.guessInput) {
            setTimeout(() => elements.guessInput.focus(), 50);
        }
    }

    closeBtn.onclick = closeModal;
    document.addEventListener('keydown', function escListener(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escListener);
        }
    });
}

// Daily Mode - Generate a daily number based on the current date
function generateNumber() {
    if (gameState.gameMode === 'daily') {
        return generateDailyNumber();
    }
    if (gameState.gameMode === 'streak') {
        return Math.floor(Math.random() * (gameState.streakMaxRange - gameState.minRange + 1)) + gameState.minRange;
    }
    return Math.floor(Math.random() * (gameState.maxRange - gameState.minRange + 1)) + gameState.minRange;
}

function generateDailyNumber() {
    const today = new Date().toDateString();
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
        hash = ((hash << 5) - hash) + today.charCodeAt(i);
        hash = hash & hash;
    }
    return gameState.minRange + (Math.abs(hash) % (gameState.maxRange - gameState.minRange + 1));
}

function isPrime(num) {
    if (num <= 1) return false;
    if (num <= 3) return true;
    if (num % 2 === 0 || num % 3 === 0) return false;
    for (let i = 5; i * i <= num; i += 6) {
        if (num % i === 0 || num % (i + 2) === 0) return false;
    }
    return true;
}

function getDivisors(num) { 
    const divisors = []; 
    for (let i = 1; i <= num; i++) {
        if (num % i === 0) divisors.push(i);
    }
    return divisors;
}

function getMathHint(number) {
    const hints = [];
    if (isPrime(number)) {
        hints.push("This is a prime number");
    }
    if (number % 2 === 0) hints.push("This number is even");
    if (number % 2 !== 0) hints.push("This number is odd");
    if (number % 3 === 0) hints.push("This number is divisible by 3");
    if (number % 5 === 0) hints.push("This number is divisible by 5");
    if (number % 10 === 0) hints.push("This number is divisible by 10");
    const sqrt = Math.sqrt(number);
    if (Number.isInteger(sqrt)) {
        hints.push(`This is a square number (${sqrt} × ${sqrt})`);
    }
    const sumOfDigits = number.toString().split('').reduce((sum, digit) => sum + parseInt(digit), 0);
    if (sumOfDigits > 10) {
        hints.push(`The sum of its digits is ${sumOfDigits}`);
    }
    return hints.length > 0 ? hints[Math.floor(Math.random() * hints.length)] : "This is a number between " + gameState.minRange + " and " + gameState.maxRange;
}

function updateGuessHistoryDisplay() {
    const historyDiv = document.getElementById('guessHistory');
    if (!historyDiv) return; 
    if (guessHistory.length === 0) { 
        historyDiv.innerHTML = ''; 
        return;
    }
    historyDiv.innerHTML = guessHistory.map(item => {
        let cls = 'guess-item';
        if (item.type === 'correct') cls += ' correct';
        else if (item.type === 'hot') cls += ' hot';
        else if (item.type === 'cold') cls += ' cold';
        return `<span class="${cls}">${item.value}</span>`;
    }).join('');
}

function handleGuess() {
    showShareResultBtn(false);
    if ((gameState.gameMode === 'bot' || gameState.gameMode === 'breakthebot') && gameState.botTurn) {
        showFeedback("Wait for your turn!", 'error');
        return;
    }
    // --- DOUBLECHAOS: Start timer on first guess ---
    if (gameState.gameMode === 'doublechaos' && !gameState.chaosStarted) {
        startDoubleChaosTimer();
        gameState.chaosStarted = true;
    }
    // --- BLITZ: Start timer on first guess ---
    if (gameState.gameMode === 'blitz' && !gameState.blitzStarted) {
        gameState.blitzStarted = true;
        if (gameState.blitzTimeout) clearTimeout(gameState.blitzTimeout);
        if (gameState.blitzInterval) clearInterval(gameState.blitzInterval);
        let timeLeft = 30;
        elements.chaosTimer.classList.remove('hidden');
        elements.chaosTimer.innerHTML = 'Time left: <span id="timeLeft">30</span>s';
        gameState.blitzInterval = setInterval(() => {
            timeLeft--;
            const timeElem = document.getElementById('timeLeft');
            if (timeElem) timeElem.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(gameState.blitzInterval);
                gameState.blitzInterval = null;
                handleBlitzTimeout();
            }
        }, 1000);
    }
    const guess = parseInt(elements.guessInput.value);
    const number = gameState.currentNumber;
    const min = gameState.minRange;
    const max = gameState.maxRange;
    const range = max - min;
    elements.guessInput.classList.remove('guess-correct', 'guess-error', 'guess-hot', 'guess-cold');
    if (gameState.attemptsLeft <= 0) {
        showFeedback('No attempts left! Start a new game.', 'error');
        return;
    }
    if (isNaN(guess) || guess < min || guess > max) {
        showFeedback(`Please enter a valid number between ${min} and ${max}!`, 'error');
        elements.guessInput.classList.add('guess-error');
        setTimeout(() => elements.guessInput.classList.remove('guess-error'), 1000);
        return;
    }
    gameState.attemptsLeft--;
    if (gameState.attemptsLeft < 0) gameState.attemptsLeft = 0;
    gameState.stats.totalAttempts++;
    let guessType = '';
    if (guess === number) {
        elements.guessInput.classList.add('guess-correct');
        setTimeout(() => elements.guessInput.classList.remove('guess-correct'), 1200);
        guessType = 'correct';
        if (gameState.gameMode === 'bot') {
            gameState.botTurn = false;
            elements.guessInput.disabled = true;
            elements.submitGuess.disabled = true;
            elements.helpButton.disabled = true;
        }
        if (gameState.gameMode === 'streak') {
            handleStreakWin();
        } else {
            handleWin();
        }
    } else {
        let feedback;
        let hot = false, cold = false;
        const diff = Math.abs(guess - number);
        let direction = '';
        if (guess < number && guess < max) direction = 'higher';
        else if (guess > number && guess > min) direction = 'lower';
        if (gameState.gameMode === 'reverse') {
            if (diff <= 5) {
                feedback = direction ? `Cold! Try ${direction}!` : 'Cold!';
                cold = true;
                guessType = 'cold';
            } else if (diff >= Math.floor(range * 0.3)) {
                feedback = direction ? `Hot! Try ${direction}!` : 'Hot!';
                hot = true;
                guessType = 'hot';
            } else {
                feedback = direction ? `Try ${direction}!` : 'Try again!';
            }
        } else {
            if (diff <= 5) {
                feedback = direction ? `Hot! Try ${direction}!` : 'Hot!';
                hot = true;
                guessType = 'hot';
            } else if (diff >= Math.floor(range * 0.3)) {
                feedback = direction ? `Cold! Try ${direction}!` : 'Cold!';
                cold = true;
                guessType = 'cold';
            } else if (gameState.gameMode === 'math') {
                const mathHint = getMathHint(number);
                feedback = direction ? `${mathHint}. Try ${direction}!` : mathHint;
            } else {
                feedback = direction ? `Try ${direction}!` : 'Try again!';
            }
        }
        showFeedback(feedback, 'hint');
        if (hot) {
            elements.guessInput.classList.add('guess-hot');
            setTimeout(() => elements.guessInput.classList.remove('guess-hot'), 1200); 
        } else if (cold) {
            elements.guessInput.classList.add('guess-cold');
            setTimeout(() => elements.guessInput.classList.remove('guess-cold'), 1200);
        }
        if (gameState.gameMode === 'streak' && gameState.attemptsLeft === 0) {
            handleStreakLoss();
        } else if (gameState.attemptsLeft === 0) {
            handleLoss();
        }
        
        if (gameState.gameMode === 'bot' || gameState.gameMode === 'breakthebot') {
            gameState.botTurn = true;
            elements.guessInput.disabled = true;
            elements.submitGuess.disabled = true;
            setTimeout(() => {
                if (gameState.gameMode === 'breakthebot') {
                    breakTheBotTakeTurn();
                } else {
                    botTakeTurn();
                }
            }, 800);
        }
    }
    guessHistory.push({ value: guess, type: guessType });
    updateGuessHistoryDisplay();
    updateUI();
    elements.guessInput.value = '';
    if (gameState.gameMode === 'bot') updateBotGuessHistoryDisplay();
    
    if (guess === number) {
        const numGuesses = guessHistory.length;
        if (numGuesses === gameState.maxAttempts) {
            unlockAchievement('Never Give Up', 'bronze');
        }
        if (guessHistory.length >= 4) {
            const last3 = guessHistory.slice(-4, -1);
            if (last3.every(g => g.type === 'cold')) {
                unlockAchievement('Comeback King', 'bronze');
            }
        }
    }
    if ((gameState.gameMode === 'chaos' || gameState.gameMode === 'doublechaos') && !gameState.chaosStarted) {
        startChaosTimer();
        gameState.chaosStarted = true;
    }
}

function handleStreakWin() {
    
    if (!gameState.streakCurrent) gameState.streakCurrent = 0;
    if (!gameState.streakMaxRange) gameState.streakMaxRange = 100;
    gameState.streakCurrent++;
    gameState.stats.streak.gamesPlayed++;
    if (gameState.streakCurrent > gameState.stats.streak.bestStreak) {
        gameState.stats.streak.bestStreak = gameState.streakCurrent;
    }
    if (gameState.streakCurrent === 12) {
        gameState.stats.streak.gamesWon++;
        gameState.stats.gamesPlayed++; // <-- add this line
        showVictoryAnimation();
        showFeedback('Amazing! You completed the Streak Mode! 🏆', 'success');
        saveToLocalStorage();
        unlockAchievement('Perfect Streak', 'bronze');
        setTimeout(() => {
            startNewGame();
        }, 3000);
        return;
    }
    
    gameState.streakMaxRange += 50;
    gameState.maxRange = gameState.streakMaxRange;
    gameState.maxAttempts--;
    gameState.attemptsLeft = gameState.maxAttempts;
    showFeedback(`Correct! Streak: <b>${gameState.streakCurrent}</b> / 12<br>New range: 1-${gameState.maxRange}<br>Guesses left: ${gameState.attemptsLeft}`, 'success');
    saveToLocalStorage();
    updateStatsDisplay();
    setTimeout(() => {
        gameState.currentNumber = generateNumber();
        elements.guessInput.value = '';
        elements.feedbackMessage.textContent = '';
        guessHistory = [];
        updateGuessHistoryDisplay();
        updateUI();
    }, 1200);

    if (tieredAchievements['Streak Master']) {
        for (const t of tieredAchievements['Streak Master']) {
            if (t.condition(gameState.streakCurrent)) {
                unlockAchievement('Streak Master', t.tier);
                break;
            }
        }
    }
}

function handleStreakLoss() {
    
    if (!gameState.stats.streak) gameState.stats.streak = { current: 0, max: 0, gamesPlayed: 0, gamesWon: 0, bestStreak: 0 };
    if (gameState.streakCurrent > gameState.stats.streak.bestStreak) {
        gameState.stats.streak.bestStreak = gameState.streakCurrent;
    }
    showFeedback(`Game Over! Your streak: <b>${gameState.streakCurrent}</b>`, 'error');
    saveToLocalStorage();
    updateStatsDisplay();
    setTimeout(() => {
        startNewGame();
    }, 3000);
}

function handleWin() {
    // Increment games played and games won
    gameState.stats.gamesPlayed++;
    gameState.stats.gamesWon++;
    // Disable input and buttons
    elements.guessInput.disabled = true;
    elements.submitGuess.disabled = true;
    elements.helpButton.disabled = true;
    // Show feedback
    showFeedback('Congratulations! You guessed the number!', 'success');
    // Save stats
    saveToLocalStorage();
    updateStatsDisplay();
    // Show share button
    const winTime = gameState.startTime ? Math.round((Date.now() - gameState.startTime) / 1000) : null;
    const numGuesses = gameState.maxAttempts - gameState.attemptsLeft;
    showShareResultBtn(true, {
        win: true,
        numGuesses,
        mode: gameState.gameMode,
        time: winTime
    });
    // Show victory animation
    showVictoryAnimation();
    // Unlock first win achievement if this is the first win
    if (gameState.stats.gamesWon === 1) {
        console.log('Checking First Win achievement');
        unlockAchievement('First Win', 'bronze');
    }
    // Unlock Lightning Fast achievement (highest tier first)
    if (tieredAchievements['Lightning Fast']) {
        for (let i = tieredAchievements['Lightning Fast'].length - 1; i >= 0; i--) {
            const t = tieredAchievements['Lightning Fast'][i];
            if (t.condition(numGuesses)) {
                console.log('Unlocking Lightning Fast:', t.tier, numGuesses);
                unlockAchievement('Lightning Fast', t.tier);
                break;
            }
        }
    }
    // Unlock Quick Thinker achievement (highest tier first)
    if (winTime !== null && tieredAchievements['Quick Thinker']) {
        for (let i = tieredAchievements['Quick Thinker'].length - 1; i >= 0; i--) {
            const t = tieredAchievements['Quick Thinker'][i];
            if (t.condition(winTime)) {
                console.log('Unlocking Quick Thinker:', t.tier, winTime);
                unlockAchievement('Quick Thinker', t.tier);
                break;
            }
        }
    }
    // Unlock Speed Demon achievement (highest tier first)
    if (winTime !== null && tieredAchievements['Speed Demon']) {
        for (let i = tieredAchievements['Speed Demon'].length - 1; i >= 0; i--) {
            const t = tieredAchievements['Speed Demon'][i];
            if (t.condition(winTime)) {
                console.log('Unlocking Speed Demon:', t.tier, winTime);
                unlockAchievement('Speed Demon', t.tier);
                break;
            }
        }
    }
    // Unlock Lucky Guess (if win on first guess)
    if (numGuesses === 1) {
        console.log('Unlocking Lucky Guess');
        unlockAchievement('Lucky Guess', 'bronze');
    }
    // Unlock Perfect Score achievement (highest tier first)
    const score = calculateScore({
        numGuesses,
        difficulty: gameState.difficulty,
        usedHelp: gameState.usedHelp,
        win: true,
        firstHit: numGuesses === 1,
        lightningFast: winTime !== null && winTime < 10
    });
    if (tieredAchievements['Perfect Score']) {
        for (let i = tieredAchievements['Perfect Score'].length - 1; i >= 0; i--) {
            const t = tieredAchievements['Perfect Score'][i];
            if (t.condition(score, gameState.stats, numGuesses, gameState.usedHelp, gameState.difficulty)) {
                console.log('Unlocking Perfect Score:', t.tier, score);
                unlockAchievement('Perfect Score', t.tier);
                break;
            }
        }
    }
    // Unlock Range Master achievement (highest tier first)
    const range = gameState.maxRange - gameState.minRange + 1;
    if (tieredAchievements['Range Master']) {
        for (let i = tieredAchievements['Range Master'].length - 1; i >= 0; i--) {
            const t = tieredAchievements['Range Master'][i];
            if (t.condition(range)) {
                console.log('Unlocking Range Master:', t.tier, range);
                unlockAchievement('Range Master', t.tier);
                break;
            }
        }
    }
    // Unlock Help Seeker achievement if used help (highest tier first)
    if (gameState.usedHelp && tieredAchievements['Help Seeker']) {
        const hintsUsed = gameState.stats.hintsUsed || 1;
        for (let i = tieredAchievements['Help Seeker'].length - 1; i >= 0; i--) {
            const t = tieredAchievements['Help Seeker'][i];
            if (t.condition(hintsUsed, numGuesses)) {
                console.log('Unlocking Help Seeker:', t.tier, hintsUsed, numGuesses);
                unlockAchievement('Help Seeker', t.tier);
                break;
            }
        }
    }
    // Unlock Math Whiz achievement if in math mode
    if (gameState.gameMode === 'math' && tieredAchievements['Math Whiz']) {
        for (const t of tieredAchievements['Math Whiz']) {
            if (t.condition(gameState.usedHelp, numGuesses)) {
                console.log('Unlocking Math Whiz:', t.tier, gameState.usedHelp, numGuesses);
                unlockAchievement('Math Whiz', t.tier);
                break;
            }
        }
    }
    // Unlock Blitz Champion achievement if in blitz mode
    if (gameState.gameMode === 'blitz' && winTime !== null && tieredAchievements['Blitz Champion']) {
        for (const t of tieredAchievements['Blitz Champion']) {
            if (t.condition(numGuesses, winTime)) {
                console.log('Unlocking Blitz Champion:', t.tier, numGuesses, winTime);
                unlockAchievement('Blitz Champion', t.tier);
                break;
            }
        }
    }
    // Unlock Sudden Death achievement if in sudden mode
    if (gameState.gameMode === 'sudden' && tieredAchievements['Sudden Death']) {
        console.log('Unlocking Sudden Death');
        unlockAchievement('Sudden Death', 'bronze');
    }
    // Unlock Reverse Master achievement if in reverse mode
    if (gameState.gameMode === 'reverse' && tieredAchievements['Reverse Master']) {
        console.log('Unlocking Reverse Master');
        unlockAchievement('Reverse Master', 'bronze');
    }
    // Unlock Double Chaos achievement if in doublechaos mode
    if (gameState.gameMode === 'doublechaos' && tieredAchievements['Double Chaos']) {
        console.log('Unlocking Double Chaos');
        unlockAchievement('Double Chaos', 'bronze');
    }
    // Unlock Break the Bot achievement if in breakthebot mode
    if (gameState.gameMode === 'breakthebot' && tieredAchievements['Break the Bot']) {
        console.log('Unlocking Break the Bot');
        unlockAchievement('Break the Bot', 'bronze');
    }
    // Unlock Chaos Master achievement if in chaos mode
    if (gameState.gameMode === 'chaos' && tieredAchievements['Chaos Master']) {
        console.log('Unlocking Chaos Master');
        unlockAchievement('Chaos Master', 'bronze');
    }
    // Unlock Daily Champion achievement if in daily mode
    if (gameState.gameMode === 'daily' && tieredAchievements['Daily Champion']) {
        const daysWon = gameState.stats.dailyStats ? gameState.stats.dailyStats.daysWon : 1;
        const streak = gameState.stats.dailyStats ? gameState.stats.dailyStats.currentStreak : 1;
        for (const t of tieredAchievements['Daily Champion']) {
            if (t.tier === 'platinum') {
                if (t.condition(daysWon, streak)) {
                    console.log('Unlocking Daily Champion:', t.tier, daysWon, streak);
                    unlockAchievement('Daily Champion', t.tier);
                    break;
                }
            } else {
                if (t.condition(daysWon)) {
                    console.log('Unlocking Daily Champion:', t.tier, daysWon);
                    unlockAchievement('Daily Champion', t.tier);
                    break;
                }
            }
        }
    }
    // Start new game after a short delay
    setTimeout(() => {
        elements.guessInput.disabled = false;
        elements.submitGuess.disabled = false;
        elements.helpButton.disabled = false;
        startNewGame();
    }, 3000);
    gameState.attemptsLeft = gameState.maxAttempts;
    updateUI();
}

function handleLoss() {
    if (gameState.chaosInterval) {
        clearInterval(gameState.chaosInterval);
        gameState.chaosInterval = null;
        elements.chaosTimer.classList.add('hidden');
    }
    if (gameState.blitzTimeout) {
        clearTimeout(gameState.blitzTimeout);
        gameState.blitzTimeout = null;
    }
    if (gameState.blitzInterval) {
        clearInterval(gameState.blitzInterval);
        gameState.blitzInterval = null;
    }
    elements.chaosTimer.classList.add('hidden');
    if (gameState.botInterval) {
        clearInterval(gameState.botInterval);
        gameState.botInterval = null;
    }
    
    gameState.stats.gamesPlayed++;

    elements.guessInput.disabled = true;
    elements.submitGuess.disabled = true;
    elements.helpButton.disabled = true;

    showFeedback(`Game Over! The number was ${gameState.currentNumber}`, 'error');
    saveToLocalStorage(); 
    updateStatsDisplay();

    showShareResultBtn(true, {
        win: false,
        numGuesses: gameState.maxAttempts,
        mode: gameState.gameMode,
        time: gameState.startTime ? Math.round((Date.now() - gameState.startTime) / 1000) : null
    });

    setTimeout(() => {
        elements.guessInput.disabled = false;
        elements.submitGuess.disabled = false;
        elements.helpButton.disabled = false;
        startNewGame();
    }, 3000);

    gameState.attemptsLeft = gameState.maxAttempts;
    updateUI();
}


function handleHelp() {
    if (gameState.usedHelp) return; // If the player used help, return (to prevent the player from using help more than once)

    gameState.usedHelp = true; // Set the used help to true
    elements.helpButton.disabled = true; // Disable the help button

    const range = gameState.maxRange - gameState.minRange; // Calculate the range
    const hintRange = Math.floor(range * 0.2); // Calculate the hint range
    const lowerBound = Math.max(gameState.minRange, gameState.currentNumber - hintRange); // Calculate the lower bound
    const upperBound = Math.min(gameState.maxRange, gameState.currentNumber + hintRange); // Calculate the upper bound
    showFeedback(`The number is between ${lowerBound} and ${upperBound}`, 'hint'); // Show a hint

    // Make sure to increment hintsUsed in handleHelp
    // In handleHelp:
    gameState.stats.hintsUsed = (gameState.stats.hintsUsed || 0) + 1;
    updateStatsDisplay();
}


function showFeedback(message, type) {
    const feedbackElement = elements.feedbackMessage;
    feedbackElement.innerHTML = message;
    
    // Remove existing classes
    feedbackElement.parentElement.className = 'feedback-area';
    
    // Add appropriate class and animation
    feedbackElement.parentElement.classList.add(`feedback-${type}`);
    feedbackElement.parentElement.classList.add('bounce');
    
    // Remove bounce class after animation
    setTimeout(() => {
        feedbackElement.parentElement.classList.remove('bounce');
    }, 1000);
}


function unlockAchievement(name, tier = null, isSecret = false) {
    if (!gameState.achievementsTiers[name]) {
        gameState.achievementsTiers[name] = [];
    }
    if (!Array.isArray(gameState.achievementsTiers[name])) {
        gameState.achievementsTiers[name] = [gameState.achievementsTiers[name]].filter(Boolean);
    }
    const currentTiers = gameState.achievementsTiers[name];
    const tierIndex = tierNames.indexOf(tier);
    // Find the highest tier already achieved
    const highest = currentTiers.reduce((max, t) => Math.max(max, tierNames.indexOf(t)), -1);
    if (tierIndex > highest) {
        // Keep only the new highest tier
        gameState.achievementsTiers[name] = [tier];
        gameState.achievements.add(name);
        saveToLocalStorage();
        updateStatsDisplay();
        showAchievementNotification(name, tier);
        if (tier === 'gold' || tier === 'platinum') {
            triggerConfetti();
        }
        // Add to achievementsEarnedThisRound if not already present
        if (!gameState.achievementsEarnedThisRound.some(a => a.name === name && a.tier === tier)) {
            gameState.achievementsEarnedThisRound.push({ name, tier });
            // If this is the first achievement this round, update lastRoundAchievements
            if (gameState.achievementsEarnedThisRound.length === 1) {
                gameState.lastRoundAchievements = [];
            }
            gameState.lastRoundAchievements.push({ name, tier });
            updateAchievementsDisplay();
        }
        // Check for secret achievement unless this is a secret achievement itself
        if (!isSecret) checkSecretAchievement();
        return true;
    }
    return false;
}

function showAchievementNotification(achievement, tier = null) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    
    const icon = tier ? tierIcons[tier] : '🏆';
    const tierText = tier ? ` (${tier.charAt(0).toUpperCase() + tier.slice(1)})` : '';
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.5rem;">${icon}</span>
            <div>
                <div style="font-weight: bold;">${achievement}${tierText}</div>
                <div style="font-size: 0.9rem; opacity: 0.9;">
                    ${getAchievementDescription(achievement, tier)}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Add bounce animation
    notification.classList.add('bounce');
    
    // Remove notification after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.4s ease-out reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 400);
    }, 4000);
}

function getAchievementDescription(achievement, tier) {
    if (tieredAchievements[achievement]) {
        const tierData = tieredAchievements[achievement].find(t => t.tier === tier);
        return tierData ? tierData.description : 'Achievement unlocked!';
    }
    return 'Achievement unlocked!';
}

function triggerConfetti() {
    // Use canvas-confetti if available
    if (typeof confetti !== 'undefined') {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    } else {
        // Fallback confetti effect
        createFallbackConfetti();
    }
}

function createFallbackConfetti() {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * window.innerWidth + 'px';
        confetti.style.top = '-10px';
        confetti.style.pointerEvents = 'none';
        confetti.style.zIndex = '9999';
        confetti.style.borderRadius = '50%';
        
        document.body.appendChild(confetti);
        
        // Animate confetti
        const animation = confetti.animate([
            { transform: 'translateY(0px) rotate(0deg)', opacity: 1 },
            { transform: `translateY(${window.innerHeight + 100}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
        ], {
            duration: 3000 + Math.random() * 2000,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });
        
        animation.onfinish = () => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        };
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const themes = ['light', 'dark', 'neon', 'pastel'];
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
}

function showVictoryAnimation() {
    const victoryElement = elements.victoryAnimation;
    victoryElement.classList.remove('hidden');
    victoryElement.innerHTML = '🎉 You Win! 🎉';
    
    // Add enhanced victory effects
    victoryElement.style.animation = 'bounce 1s ease, victoryFlash 0.7s linear';
    
    // Trigger confetti effect
    triggerConfetti();
    
    // Add victory sound effect (if available)
    if (typeof Audio !== 'undefined') {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
            audio.volume = 0.3;
            audio.play().catch(() => {}); // Ignore errors if audio fails
        } catch (e) {
            // Ignore audio errors
        }
    }
    
    setTimeout(() => {
        victoryElement.classList.add('hidden');
    }, 3000);
}


function updateUI() {
    // Hide attempts left in practice mode
    if (gameState.gameMode === 'practice') {
        elements.attemptsLeft.parentElement.style.display = 'none';
    } else {
        elements.attemptsLeft.parentElement.style.display = '';
        // Update attempts display
        if (elements.attemptsLeft) {
            elements.attemptsLeft.textContent = gameState.attemptsLeft;
        }
    }
    // Hide difficulty selector in doublechaos mode
    if (gameState.gameMode === 'doublechaos') {
        elements.difficulty.parentElement.style.display = 'none';
        const diffExp = document.getElementById('difficultyExplanation');
        if (diffExp) diffExp.style.display = 'none';
    } else {
        elements.difficulty.parentElement.style.display = '';
        const diffExp = document.getElementById('difficultyExplanation');
        if (diffExp) diffExp.style.display = '';
    }
    // Always update the range display
    if (elements.numberRange) {
        elements.numberRange.textContent = `${gameState.minRange}-${gameState.maxRange}`;
    }
    updateDailyChallengeInfo(); 
    // Update stats display
    updateStatsDisplay();
}


function updateStatsDisplay() {
    ensureStatsStructure();
    const best = gameState.stats.bestScore;
    const bestByMode = gameState.stats.bestByMode;
    function showScore(val) { return !val || val === Infinity ? 0 : val; }
    elements.statsDisplay.innerHTML = `
        <p>Games Played: ${gameState.stats.gamesPlayed}</p> 
        <p>Games Won: ${gameState.stats.gamesWon}</p>
        <p>Win Rate: ${gameState.stats.gamesPlayed ? Math.round((gameState.stats.gamesWon / gameState.stats.gamesPlayed) * 100) : 0}%</p>
        <p>Total Guesses: ${gameState.stats.totalAttempts}</p> 
        <p>Best Score (All Modes): ${showScore(best)}</p>
        <div style="margin-top:0.5rem;">
            <b>Best Score in:</b>
            <ul style="margin:0.2rem 0 0 1.2rem;">
                <li>Classic: ${showScore(bestByMode.classic)}</li>
                <li>Chaos: ${showScore(bestByMode.chaos)}</li>
                <li>Math: ${showScore(bestByMode.math)}</li>
                <li>Daily: ${showScore(bestByMode.daily)}</li>
            </ul>
        </div>
    `;
   
    const streak = gameState.stats.streak;
    if (streak) {
        const streakHtml = `
        <div style="margin-top:1.2rem;">
            <b>Streak Mode Stats:</b>
            <ul style="margin:0.2rem 0 0 1.2rem;">
                <li>Games Played: ${streak.gamesPlayed}</li>
                <li>Games Won: ${streak.gamesWon}</li>
                <li>Best Streak: ${streak.bestStreak}</li>
            </ul>
        </div>
        `;
        elements.statsDisplay.innerHTML += streakHtml;
    }
    const stats = gameState.stats.dailyStats;
    if (!stats) return;
    const dailyStatsHtml = `
        <div style="margin-top:1.2rem;">
            <b>Daily Challenge Stats:</b>
            <ul style="margin:0.2rem 0 0 1.2rem;">
                <li>Days Played: ${stats.daysPlayed}</li>
                <li>Days Won: ${stats.daysWon}</li>
                <li>Current Streak: ${stats.currentStreak}</li>
                <li>Max Streak: ${stats.maxStreak}</li>
            </ul>
        </div>
    `;
    elements.statsDisplay.innerHTML += dailyStatsHtml;
    const scoreHtml = `<div style="margin-top:1.2rem;"><b>Total Score:</b> <span>${gameState.stats.totalScore || 0}</span></div>`;
    elements.statsDisplay.innerHTML += scoreHtml;
}

function updateAchievementsDisplay() {
    const achievementDescriptions = {
        'First Win': 'Win your first game',
        'Lightning Fast': 'Win quickly with few guesses',
        'Quick Thinker': 'Win in under 30 seconds',
        'Streak Master': 'Win multiple games in a row',
        'Bot Buster (Easy)': 'Beat the bot on easy mode',
        'Bot Buster (Medium)': 'Beat the bot on medium mode',
        'Bot Buster (Hard)': 'Beat the bot on hard mode',
        'Bot Buster (Chaos)': 'Beat the bot on chaos mode',
        'Math Whiz': 'Win in math mode',
        'Daily Champion': 'Win the daily challenge',
        'Chaos Master': 'Win in chaos mode',
        'Perfect Score': 'Win with the best possible score',
        'Help Seeker': 'Use hints to win',
        'Persistent': 'Win after many attempts',
        'Lucky Guess': 'Win on your first try',
        'Speed Demon': 'Win in under 10 seconds',
        'Range Master': 'Win with a large number range',
        'Blitz Champion': 'Win in blitz mode',
        'Sudden Death': 'Win in sudden death mode',
        'Reverse Master': 'Win in reverse mode',
        'Double Chaos': 'Win in double chaos mode',
        'Break the Bot': 'Win in break the bot mode',
        // Secret achievement:
        'Game Master': 'Win all achievements to unlock this'
    };
    // Show only achievements earned this round, or last round with achievements
    const achievementsList = elements.achievementsList;
    if (!achievementsList) return;
    let earned = gameState.achievementsEarnedThisRound;
    if (earned.length === 0 && gameState.lastRoundAchievements.length > 0) {
        earned = gameState.lastRoundAchievements;
    }
    achievementsList.innerHTML = '';
    if (earned.length === 0) {
        achievementsList.innerHTML = `<div class="no-achievements">No achievements earned this round yet.<br>Try to unlock one!</div>`;
        return;
    }
    for (const { name, tier } of earned) {
        const icon = tierIcons[tier] || '';
        const color = tierColors[tier] || '#fff';
        const desc = achievementDescriptions[name] || '';
        // Add a semi-transparent background for the tier
        let bgColor = 'rgba(255,255,255,0.08)';
        if (tier === 'bronze') bgColor = 'rgba(205,127,50,0.13)';
        else if (tier === 'silver') bgColor = 'rgba(176,176,176,0.13)';
        else if (tier === 'gold') bgColor = 'rgba(255,215,0,0.13)';
        else if (tier === 'platinum') bgColor = 'rgba(0,230,230,0.13)';
        achievementsList.innerHTML += `<div class="achievement-earned" style="border-left:4px solid ${color};background:${bgColor};border-radius:12px;padding:1em 1.2em;margin:0.5em 0;display:flex;flex-direction:column;gap:0.2em;"><span class="ach-icon">${icon}</span> <b>${name}</b> <span class="tier-label" style="color:${color}">${tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : ''}</span><br><span class="ach-desc">${desc}</span></div>`;
    }
}

function handleResetAchievements() {
    if (confirm('Are you sure you want to reset all achievements? This cannot be undone.')) { // If the player confirms the reset, reset the achievements
        gameState.achievementsTiers = {};
        saveToLocalStorage();
        updateStatsDisplay();
        updateAchievementsDisplay();
        showFeedback('Achievements have been reset', 'hint');
    }
}

function handleResetStats() {
    if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) { // If the player confirms the reset, reset the stats
        gameState.stats = {
            gamesPlayed: 0,
            gamesWon: 0,
            bestScore: Infinity,
            totalAttempts: 0,
            bestByMode: {
                classic: Infinity,
                chaos: Infinity,
                math: Infinity,
                daily: Infinity
            },
            dailyStats: {
                daysPlayed: 0,
                daysWon: 0,
                currentStreak: 0,
                maxStreak: 0,
                lastWinDate: null
            },
            totalScore: 0,
            modesWon: {}
        };
        saveToLocalStorage();
        updateStatsDisplay();
        showFeedback('Statistics have been reset', 'hint');
    }
}


function ensureStatsStructure() {
    if (!gameState.stats.bestByMode) {
        gameState.stats.bestByMode = {
            classic: Infinity,
            chaos: Infinity,
            math: Infinity,
            daily: Infinity
        };
    }
    if (typeof gameState.stats.totalAttempts !== 'number') {
        gameState.stats.totalAttempts = 0;
    }
    if (typeof gameState.stats.bestScore !== 'number') {
        gameState.stats.bestScore = Infinity;
    }
    if (!gameState.stats.dailyStats) {
        gameState.stats.dailyStats = {
            daysPlayed: 0,
            daysWon: 0,
            currentStreak: 0,
            maxStreak: 0,
            lastWinDate: null
        };
    }
    if (!gameState.stats.streak) {
        gameState.stats.streak = {
            current: 0,
            max: 0,
            gamesPlayed: 0,
            gamesWon: 0,
            bestStreak: 0
        };
    }
}

// Call ensureStatsStructure on load
ensureStatsStructure();

document.addEventListener('DOMContentLoaded', () => {
    initGame();
    // Minimize/restore math hints info
    setTimeout(() => { // Ensure elements exist
        const mathHintsInfo = document.getElementById('mathHintsInfo');
        const minimizeBtn = document.getElementById('minimizeMathHints');
        if (mathHintsInfo && minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                mathHintsInfo.classList.toggle('minimized');
                minimizeBtn.textContent = mathHintsInfo.classList.contains('minimized') ? '+' : '−';
                minimizeBtn.setAttribute('aria-label', mathHintsInfo.classList.contains('minimized') ? 'Show math hints' : 'Hide math hints');
                minimizeBtn.setAttribute('title', mathHintsInfo.classList.contains('minimized') ? 'Show hints' : 'Hide hints');
            });
        }
    }, 0);
    // Player name logic
    let playerName = localStorage.getItem('guessRushPlayerName');
    if (!playerName) {
        showPlayerNameModal(true);
    } else {
        updatePlayerNameDisplay();
        showWelcomeBack(playerName);
    }
    // Personal Stats modal logic
    const openStatsBtn = document.getElementById('openPersonalStats');
    const statsModal = document.getElementById('personalStatsModal');
    const statsContent = document.getElementById('personalStatsContent');
    const closeStatsBtn = document.getElementById('closePersonalStats');
    if (openStatsBtn && statsModal && statsContent && closeStatsBtn) {
        openStatsBtn.onclick = () => {
            renderPersonalStats();
            statsModal.classList.remove('hidden');
        };
        closeStatsBtn.onclick = () => statsModal.classList.add('hidden');
    }
    // Achievements Panel logic
    const openAchievementsBtn = document.getElementById('openAchievementsPanel');
    const achievementsModal = document.getElementById('achievementsPanelModal');
    const achievementsListDiv = document.getElementById('achievementsPanelList');
    const closeAchievementsBtn = document.getElementById('closeAchievementsPanel');
    if (openAchievementsBtn && achievementsModal && achievementsListDiv && closeAchievementsBtn) {
        openAchievementsBtn.onclick = () => {
            renderAchievementsPanel();
            achievementsModal.classList.remove('hidden');
            closeAchievementsBtn.focus();
        };
        closeAchievementsBtn.onclick = () => achievementsModal.classList.add('hidden');
        // ESC to close
        document.addEventListener('keydown', function escListener(e) {
            if (!achievementsModal.classList.contains('hidden') && e.key === 'Escape') {
                achievementsModal.classList.add('hidden');
            }
        });
    }
});

document.addEventListener('keydown', (e) => { // Keyboard Shortcuts
    if (e.key === 'Escape') { // Escape Key
        elements.guessInput.value = ''; // Clear the guess input
        elements.guessInput.focus(); // Focus the guess input
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'r') { // Reset Stats
        e.preventDefault();
        elements.resetStats.click();
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'a') { // Reset Achievements
        e.preventDefault();
        elements.resetAchievements.click();
    }
});

function updateMathHintsInfo() {
    const infoBox = document.getElementById('mathHintsInfo');
    if (!infoBox) return;
    if (gameState.gameMode === 'math') {
        infoBox.classList.remove('hidden');
    } else {
        infoBox.classList.add('hidden');
    }
}

function getTodayDateStr() {
    return new Date().toISOString().slice(0, 10);
}

function updateDailyStats(win) {
    const today = getTodayDateStr();
    const stats = gameState.stats.dailyStats;
    if (stats.lastWinDate !== today) {
        stats.daysPlayed++;
        if (win) {
            stats.daysWon++;
            if (stats.lastWinDate && (new Date(today) - new Date(stats.lastWinDate) === 86400000)) {
                stats.currentStreak++;
            } else {
                stats.currentStreak = 1;
            }
            if (stats.currentStreak > stats.maxStreak) {
                stats.maxStreak = stats.currentStreak;
            }
            stats.lastWinDate = today;
        } else {
            stats.currentStreak = 0;
        }
    }
}

// Add this function to handle starting the chaos/doublechaos timer
function startChaosTimer() {
    if (gameState.chaosInterval) {
        clearInterval(gameState.chaosInterval);
        gameState.chaosInterval = null;
    }
    if (gameState.gameMode === 'chaos') {
        // Show timer
        elements.chaosTimer.classList.remove('hidden');
        let timeRemaining = 15;
        elements.timeLeft.textContent = timeRemaining;
        // Update timer every second
        let timerInterval = setInterval(() => {
            timeRemaining--;
            elements.timeLeft.textContent = timeRemaining;
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
            }
        }, 1000);
        // Change number every 15 seconds
        gameState.chaosInterval = setInterval(() => {
            gameState.currentNumber = generateNumber();
            showFeedback('Number has changed!', 'hint');
            // Reset timer
            timeRemaining = 15;
            elements.timeLeft.textContent = timeRemaining;
            // Start new timer 
            timerInterval = setInterval(() => {
                timeRemaining--;
                elements.timeLeft.textContent = timeRemaining;
                if (timeRemaining <= 0) {
                    clearInterval(timerInterval);
                }
            }, 1000);
        }, 15000);
    } else if (gameState.gameMode === 'doublechaos') {
        if (gameState.chaosInterval) clearInterval(gameState.chaosInterval);
        elements.chaosTimer.classList.remove('hidden');
        elements.chaosTimer.innerHTML = 'Next number & range in: <span id="timeLeft">15</span>s';
        
    }
}

function startDoubleChaosTimer() {
    if (gameState.chaosInterval) clearInterval(gameState.chaosInterval);
    let timeLeft = 15;
    function setNewRangeAndNumber() {
        let min = Math.floor(Math.random() * 50) + 1;
        let max = min + Math.floor(Math.random() * 950) + 50;
        gameState.minRange = min;
        gameState.maxRange = max;
        gameState.currentNumber = Math.floor(Math.random() * (max - min + 1)) + min;
        guessHistory = [];
        updateGuessHistoryDisplay();
        updateUI();
        showFeedback('Number & range changed! Guess history cleared.', 'hint');
    }
    elements.chaosTimer.classList.remove('hidden');
    elements.chaosTimer.innerHTML = 'Next number & range in: <span id="timeLeft">' + timeLeft + '</span>s';
    gameState.chaosInterval = setInterval(() => {
        timeLeft--;
        const timeElem = document.getElementById('timeLeft');
        if (timeElem) timeElem.textContent = timeLeft;
        if (timeLeft <= 0) {
            setNewRangeAndNumber();
            timeLeft = 15;
        }
    }, 1000);
}

function startNewGame() {
    gameState.startTime = Date.now();
    updateDifficultySettings();
    gameState.chaosStarted = false; // <--- reset flag
    // Daily mode: block replay if already played today
    if (gameState.gameMode === 'daily') {
        const result = getDailyResult();
        if (result) {
            showDailyResultMessage(result);
            elements.guessInput.disabled = true;
            elements.submitGuess.disabled = true;
            elements.helpButton.disabled = true;
            return;
        } else {
            elements.guessInput.disabled = false;
            elements.submitGuess.disabled = false;
            elements.helpButton.disabled = false;
        }
    }
    gameState.currentNumber = generateNumber();
    console.log('DEBUG: Generated number:', gameState.currentNumber, 'Range:', gameState.minRange, gameState.maxRange);
    gameState.usedHelp = false;
    elements.guessInput.value = '';
    elements.feedbackMessage.textContent = '';
    elements.helpButton.disabled = false;
    // Reset timer display
    elements.chaosTimer.classList.add('hidden');
    // Reset guess history
    guessHistory = [];
    updateGuessHistoryDisplay();
    // Start chaos mode interval if selected
    if (gameState.gameMode === 'chaos') {
        if (gameState.chaosInterval) {
            clearInterval(gameState.chaosInterval);
        }
        // Show timer
        elements.chaosTimer.classList.remove('hidden');
        let timeRemaining = 15;
        elements.timeLeft.textContent = timeRemaining;
        // Set initial number only
        gameState.currentNumber = generateNumber();
        // No timer here!
    } else if (gameState.gameMode === 'doublechaos') {
        gameState.chaosStarted = false;
        if (gameState.chaosInterval) clearInterval(gameState.chaosInterval);
        elements.chaosTimer.classList.remove('hidden');
        elements.chaosTimer.innerHTML = 'Next number & range in: <span id="timeLeft">15</span>s';
    }
    // Reset achievements for new round ONLY here
    gameState.achievementsEarnedThisRound = [];
    updateAchievementsDisplay();
    if (gameState.gameMode === 'blitz') {
        gameState.blitzStarted = false;
        if (gameState.blitzTimeout) clearTimeout(gameState.blitzTimeout);
        if (gameState.blitzInterval) clearInterval(gameState.blitzInterval);
        elements.chaosTimer.classList.remove('hidden');
        elements.chaosTimer.innerHTML = 'Time left: <span id="timeLeft">30</span>s';
    }
    // Update UI to reflect new game state
    updateUI();
}

function showDailyResultMessage(result) {
    showDailyResultModal(result);
}

function calculateScore({numGuesses, difficulty, usedHelp, win, firstHit, lightningFast}) {
    let multiplier = 1;
    switch (difficulty) {
        case 'easy': multiplier = 1; break;
        case 'medium': multiplier = 2; break;
        case 'hard': multiplier = 3; break;
        case 'chaos': multiplier = 4; break;
    }
    let base = (gameState.maxAttempts - numGuesses + 1) * multiplier;
    let bonus = 0;
    if (win) bonus += 10;
    if (!usedHelp) bonus += 5;
    if (lightningFast) bonus += 7;
    if (firstHit) bonus += 15;
    return Math.max(0, base + bonus);
}

function updateBotGuessHistoryDisplay() {
    const historyDiv = document.getElementById('botGuessHistory');
    if (!historyDiv) return;
    if (!gameState.botGuesses || gameState.botGuesses.length === 0) {
        historyDiv.innerHTML = '';
        return;
    }
    historyDiv.innerHTML = gameState.botGuesses.map(item => {
        let cls = 'guess-item';
        if (item.type === 'correct') cls += ' correct';
        else if (item.type === 'hot') cls += ' hot';
        else if (item.type === 'cold') cls += ' cold';
        return `<span class="${cls}">${item.value}</span>`;
    }).join('');
}

function botTakeTurn() {
    if (gameState.gameMode !== 'bot' || gameState.botTurn === false) return;
    // Pick a random guess not already guessed by bot or player
    let botGuess;
    let tries = 0;
    do {
        botGuess = Math.floor(Math.random() * (gameState.maxRange - gameState.minRange + 1)) + gameState.minRange;
        tries++;
        if (tries > 1000) return; // fail-safe
    } while (gameState.botGuessedNumbers.has(botGuess) || guessHistory.some(g => g.value === botGuess));
    gameState.botGuessedNumbers.add(botGuess);
    const number = gameState.currentNumber;
    const min = gameState.minRange;
    const max = gameState.maxRange;
    const range = max - min;
    let guessType = '';
    let feedback = '';
    const diff = Math.abs(botGuess - number);
    let direction = '';
    if (botGuess < number && botGuess < max) direction = 'higher';
    else if (botGuess > number && botGuess > min) direction = 'lower';
    if (diff <= 5) {
        feedback = direction ? `Hot! Try ${direction}!` : 'Hot!';
        guessType = 'hot';
    } else if (diff >= Math.floor(range * 0.3)) {
        feedback = direction ? `Cold! Try ${direction}!` : 'Cold!';
        guessType = 'cold';
    } else {
        feedback = direction ? `Try ${direction}!` : 'Try again!';
    }
    gameState.botGuesses.push({ value: botGuess, type: guessType });
    updateBotGuessHistoryDisplay();
    if (botGuess === number) {
        elements.guessInput.disabled = true;
        elements.submitGuess.disabled = true;
        elements.helpButton.disabled = true;
        showFeedback(`The bot guessed ${botGuess} and won! You lost.`, 'error');
        gameState.stats.gamesPlayed++;
        saveToLocalStorage();
        updateStatsDisplay();
        return;
    }
    // Switch back to player turn
    gameState.botTurn = false;
    elements.guessInput.disabled = false;
    elements.submitGuess.disabled = false;
}

function breakTheBotTakeTurn() {
    if (gameState.gameMode !== 'breakthebot' || gameState.botTurn === false) return;
    if (!gameState.botSkillLevel) gameState.botSkillLevel = 0;
    if (!gameState.botGuessCount) gameState.botGuessCount = 0;
    let botGuess;
    let tries = 0;
    if (gameState.botSkillLevel === 0) {
        
        do {
            botGuess = Math.floor(Math.random() * (gameState.maxRange - gameState.minRange + 1)) + gameState.minRange;
            tries++;
            if (tries > 1000) return; // fail-safe
        } while (gameState.botGuessedNumbers.has(botGuess) || guessHistory.some(g => g.value === botGuess));
    } else {
        
        if (typeof gameState.botMin !== 'number') gameState.botMin = gameState.minRange;
        if (typeof gameState.botMax !== 'number') gameState.botMax = gameState.maxRange;
        botGuess = Math.floor((gameState.botMin + gameState.botMax) / 2);
        
        while ((gameState.botGuessedNumbers.has(botGuess) || guessHistory.some(g => g.value === botGuess)) && tries < 10) {
            botGuess++;
            if (botGuess > gameState.botMax) botGuess = gameState.botMin;
            tries++;
        }
    }
    gameState.botGuessedNumbers.add(botGuess);
    const number = gameState.currentNumber;
    const min = gameState.minRange;
    const max = gameState.maxRange;
    const range = max - min;
    let guessType = '';
    let feedback = '';
    const diff = Math.abs(botGuess - number);
    let direction = '';
    if (botGuess < number && botGuess < max) direction = 'higher';
    else if (botGuess > number && botGuess > min) direction = 'lower';
    if (diff <= 5) {
        feedback = direction ? `Hot! Try ${direction}!` : 'Hot!';
        guessType = 'hot';
    } else if (diff >= Math.floor(range * 0.3)) {
        feedback = direction ? `Cold! Try ${direction}!` : 'Cold!';
        guessType = 'cold';
    } else {
        feedback = direction ? `Try ${direction}!` : 'Try again!';
    }
    gameState.botGuesses.push({ value: botGuess, type: guessType });
    updateBotGuessHistoryDisplay();
    gameState.botGuessCount++;
    
    if (gameState.botSkillLevel === 0 && gameState.botGuessCount >= 3) {
        gameState.botSkillLevel = 1;
        showFeedback('The bot is getting smarter!', 'hint');
    }
    
    if (gameState.botSkillLevel === 1) {
        if (botGuess < number) gameState.botMin = botGuess + 1;
        else if (botGuess > number) gameState.botMax = botGuess - 1;
    }
    if (botGuess === number) {
        elements.guessInput.disabled = true;
        elements.submitGuess.disabled = true;
        elements.helpButton.disabled = true;
        showFeedback(`The bot guessed ${botGuess} and won! You lost.`, 'error');
        gameState.stats.gamesPlayed++;
        saveToLocalStorage();
        updateStatsDisplay();
        return;
    }
    // Switch back to player turn
    gameState.botTurn = false;
    elements.guessInput.disabled = false;
    elements.submitGuess.disabled = false;
}

function showPlayerNameModal(initial = false) {
    const modal = document.getElementById('playerNameModal');
    const input = document.getElementById('playerNameInput');
    const saveBtn = document.getElementById('savePlayerNameBtn');
    modal.classList.remove('hidden');
    input.value = localStorage.getItem('guessRushPlayerName') || '';
    input.focus();
    saveBtn.onclick = () => {
        let name = input.value.trim();
        if (!name) name = 'Player 1';
        localStorage.setItem('guessRushPlayerName', name);
        modal.classList.add('hidden');
        updatePlayerNameDisplay();
        updateStatsDisplay();
        if (initial) showWelcomeBack(name, true);
    };
    input.onkeypress = (e) => { if (e.key === 'Enter') saveBtn.click(); };
}

function updatePlayerNameDisplay() {
    const name = localStorage.getItem('guessRushPlayerName') || 'Player 1';
    const el = document.getElementById('playerNameDisplay');
    if (el) el.innerHTML = `👤 <b>${name}</b> <button id="changePlayerNameBtn" title="Change name" style="font-size:0.9em;margin-left:0.5em;">✏️</button>`;
    // Change name button
    setTimeout(() => {
        const btn = document.getElementById('changePlayerNameBtn');
        if (btn) btn.onclick = () => showPlayerNameModal(false);
    }, 0);
}

function showWelcomeBack(name, first = false) {
    if (!name) return;
    const msg = document.createElement('div');
    msg.textContent = first ? `Welcome, ${name}!` : `Welcome back, ${name}!`;
    msg.style.position = 'fixed';
    msg.style.top = '24px';
    msg.style.left = '50%';
    msg.style.transform = 'translateX(-50%)';
    msg.style.background = '#2196f3';
    msg.style.color = '#fff';
    msg.style.padding = '0.7em 1.5em';
    msg.style.borderRadius = '8px';
    msg.style.fontSize = '1.1em';
    msg.style.zIndex = 2000;
    msg.style.boxShadow = '0 2px 12px #0002';
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 2200);
}

function renderPersonalStats() {
    const stats = gameState.stats;
    if (!stats) return;
    const winRate = stats.gamesPlayed ? ((stats.gamesWon / stats.gamesPlayed) * 100).toFixed(1) : 0;
    const avgAttempts = stats.gamesWon ? (stats.totalAttempts / stats.gamesWon).toFixed(2) : 0;
    const avgTime = stats.avgWinTime ? stats.avgWinTime.toFixed(1) : 'N/A';
    let favMode = 'N/A', maxWins = 0;
    if (stats.bestByMode) {
        for (const [mode, score] of Object.entries(stats.bestByMode)) {
            if (score && score !== Infinity && score > maxWins) {
                favMode = mode;
                maxWins = score;
            }
        }
    }
    let summaryTable = `<table style='width:100%;margin-top:1em;border-collapse:collapse;'>
        <tr style='background:#f0f0f0;'><th>Mode</th><th>Best Score</th></tr>`;
    if (stats.bestByMode) {
        for (const [mode, score] of Object.entries(stats.bestByMode)) {
            summaryTable += `<tr><td>${mode}</td><td>${score === Infinity ? '-' : score}</td></tr>`;
        }
    }
    summaryTable += '</table>';
    const html = `
        <div><b>Win Rate:</b> ${winRate}%</div>
        <div><b>Avg Attempts to Win:</b> ${avgAttempts}</div>
        <div><b>Avg Win Time:</b> ${avgTime}</div>
        <div><b>Favorite Mode:</b> ${favMode}</div>
        <hr style='margin:1em 0;'>
        <div><b>Summary Table:</b></div>
        ${summaryTable}
    `;
    const statsContent = document.getElementById('personalStatsContent');
    if (statsContent) statsContent.innerHTML = html;
}

function showShareResultBtn(show, result) {
    const btn = document.getElementById('shareResultBtn');
    if (!btn) return;
    if (show) {
        btn.classList.remove('hidden');
        btn.onclick = () => shareResult(result);
    } else {
        btn.classList.add('hidden');
        btn.onclick = null;
    }
}

function shareResult({win, numGuesses, mode, time}) {
    const playerName = localStorage.getItem('guessRushPlayerName') || 'Player 1';
    let modeName = mode.charAt(0).toUpperCase() + mode.slice(1);
    let text = `GuessRush 🔥\nPlayer: ${playerName}\nMode: ${modeName}\n`;
    if (win) {
        text += `Win in ${numGuesses} guesses ✅\n`;
    } else {
        text += `Did not win ❌\n`;
    }
    if (time) text += `Time: ${time}s\n`;
    text += `#GuessRushGame`;
    // Web Share API
    if (navigator.share) {
        navigator.share({ text }).catch(() => {});
        return;
    }
    // Clipboard API
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showFeedback('Result copied to clipboard!', 'success');
        });
    } else {
        window.prompt('Copy this:', text);
    }

    // Hide share button after sharing
    showShareResultBtn(false);
}

function updateDailyChallengeInfo() {
    const infoBox = document.getElementById('dailyChallengeInfo');
    if (!infoBox) return;
    console.log('[updateDailyChallengeInfo] gameMode:', gameState.gameMode, '| infoBox:', infoBox.classList.contains('hidden') ? 'hidden' : 'visible');
    if (gameState.gameMode === 'daily') {
        infoBox.classList.remove('hidden');
    } else {
        infoBox.classList.add('hidden');
    }
}

// Add to the list of all achievement names for panel logic
const achievementDescriptions = {
    'First Win': 'Win your first game',
    'Lightning Fast': 'Win quickly with few guesses',
    'Quick Thinker': 'Win in under 30 seconds',
    'Streak Master': 'Win multiple games in a row',
    'Bot Buster (Easy)': 'Beat the bot on easy mode',
    'Bot Buster (Medium)': 'Beat the bot on medium mode',
    'Bot Buster (Hard)': 'Beat the bot on hard mode',
    'Bot Buster (Chaos)': 'Beat the bot on chaos mode',
    'Math Whiz': 'Win in math mode',
    'Daily Champion': 'Win the daily challenge',
    'Chaos Master': 'Win in chaos mode',
    'Perfect Score': 'Win with the best possible score',
    'Help Seeker': 'Use hints to win',
    'Persistent': 'Win after many attempts',
    'Lucky Guess': 'Win on your first try',
    'Speed Demon': 'Win in under 10 seconds',
    'Range Master': 'Win with a large number range',
    'Blitz Champion': 'Win in blitz mode',
    'Sudden Death': 'Win in sudden death mode',
    'Reverse Master': 'Win in reverse mode',
    'Double Chaos': 'Win in double chaos mode',
    'Break the Bot': 'Win in break the bot mode',
    // Secret achievement:
    'Game Master': 'Win all achievements to unlock this'
};
const allAchievementNames = Object.keys(achievementDescriptions);

// Check for secret achievement after unlocking any achievement
function checkSecretAchievement() {
    // Exclude 'Game Master' from the check
    const allButSecret = allAchievementNames.filter(n => n !== 'Game Master');
    const allEarned = allButSecret.every(name => gameState.achievements.has(name));
    if (allEarned && !gameState.achievements.has('Game Master')) {
        unlockAchievement('Game Master', 'platinum', true); // true = secret
        // Special effect
        triggerConfetti();
        showFeedback('🎉 You have won the game! All achievements unlocked! 🎉', 'success');
    }
}

// --- Achievements Panel logic ---
function renderAchievementsPanel() {
    const panel = document.getElementById('achievementsPanelList');
    if (!panel) return;
    panel.innerHTML = '';
    for (const name of allAchievementNames) {
        const desc = achievementDescriptions[name] || '';
        let tier = null;
        let unlocked = false;
        if (gameState.achievementsTiers[name] && gameState.achievementsTiers[name].length > 0) {
            tier = gameState.achievementsTiers[name][0];
            unlocked = true;
        }
        // Secret achievement: show as locked if not earned
        let icon = unlocked ? (tierIcons[tier] || '🏆') : '❓';
        let color = unlocked ? (tierColors[tier] || '#fff') : '#888';
        let label = unlocked ? (tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : '') : 'Locked';
        let extra = '';
        if (name === 'Game Master' && !unlocked) {
            extra = '<div style="font-size:0.95em;opacity:0.7;margin-top:0.3em;">Secret achievement</div>';
        }
        // Use the correct panel item structure and classes
        const item = document.createElement('div');
        item.className = 'achievement-panel-item' + (unlocked ? '' : ' achievement-panel-locked');
        if (unlocked && tier) item.setAttribute('data-tier', tier);
        item.innerHTML = `
            <span class="achievement-panel-icon" style="color:${color}">${icon}</span>
            <div class="achievement-panel-info">
                <div class="achievement-panel-name">${name} <span class="achievement-panel-tier">${label}</span></div>
                <div class="achievement-panel-description">${desc}</div>
                ${extra}
            </div>
        `;
        panel.appendChild(item);
    }
}

function handleBlitzTimeout() {
    elements.guessInput.disabled = true;
    elements.submitGuess.disabled = true;
    elements.helpButton.disabled = true;
    showFeedback('Time is up! Game Over! (Blitz)', 'error');
    saveToLocalStorage();
    updateStatsDisplay();
    setTimeout(() => {
        elements.guessInput.disabled = false;
        elements.submitGuess.disabled = false;
        elements.helpButton.disabled = false;
        startNewGame();
    }, 3000);
    gameState.attemptsLeft = gameState.maxAttempts;
    updateUI();
}

const difficultyExplanations = {
  easy: "Guess a number between 1-100. 12 attempts.",
  medium: "Guess a number between 1-250. 10 attempts.",
  hard: "Guess a number between 1-500. 8 attempts.",
  chaos: "Guess a number between 1-1000. 5 attempts. The number may change!"
};
function updateDifficultyExplanation() {
    const explanation = difficultyExplanations[gameState.difficulty] || "";
    const el = document.getElementById('difficultyExplanation');
    if (el) {
        el.textContent = explanation;
        el.style.display = '';
    }
}

function updateBodyModeClass() {
    // Set a data attribute on the body for the current game mode (for dynamic backgrounds)
    document.body.setAttribute('data-mode', gameState.gameMode);
}