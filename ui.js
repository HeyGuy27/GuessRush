import { getGameState, setGameState, _internalGameState } from './state.js';
import { modeExplanations, difficultyExplanations, getDifficultyExplanation, tierColors, tierIcons, BLITZ_TIME_SEC, CHAOS_INTERVAL_MS } from './config.js';
import { unlockAchievement, getAchievementDescription, achievementDescriptions } from './achievements.js';
import { getItem, setItem, removeItem } from './storage.js';
import { 
    handleGuess as gameLogicHandleGuess, 
    handleHelp as gameLogicHandleHelp, 
    startNewGame as gameLogicStartNewGame, 
    showDailyResultMessage as gameLogicShowDailyResultMessage,
    getGuessHistory,
    setGuessHistory,
    startChaosTimer as gameLogicStartChaosTimer,
    startDoubleChaosTimer as gameLogicStartDoubleChaosTimer,
    startBlitzTimer as gameLogicStartBlitzTimer,
    isPerfectGame,
    updatePerfectGamesCounter
} from './gameLogic.js';
import { updateDifficultySettings } from './difficulty.js';
import { 
    getFormattedPersonalBests, 
    getCalculatedStats, 
    getRankingProgress 
} from './statsManager.js';

export const elements = {
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

export function initGame() { 
    loadFromLocalStorage();
    setupEventListeners(); 
    updateUI();
    updateModeExplanation();
    updateDifficultyExplanation();
    startNewGame();
    updateStatsDisplay();
}

function loadFromLocalStorage() { 
    const savedStats = getItem('guessRushStats'); 
    const savedAchievementsTiers = getItem('guessRushAchievementsTiers');
    const savedAchievements = getItem('guessRushAchievements');
    const savedTheme = getItem('guessRushTheme');

    if (savedStats) {
        setGameState(state => ({ ...state, stats: savedStats }));
    }
    if (savedAchievementsTiers) {
        setGameState(state => ({ ...state, achievementsTiers: savedAchievementsTiers }));
    }
    if (savedAchievements) {
        setGameState(state => ({ ...state, achievements: new Set(savedAchievements) }));
    }
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeButtons(savedTheme);
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        updateThemeButtons('light');
    }
}

export function saveToLocalStorage() {
    const state = getGameState();
    setItem('guessRushStats', state.stats);
    setItem('guessRushAchievementsTiers', state.achievementsTiers || {});
    setItem('guessRushAchievements', Array.from(state.achievements));
}

export function setupEventListeners() {
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
    
    const resetWelcomeBtn = document.getElementById('resetWelcome');
    if (resetWelcomeBtn) {
        resetWelcomeBtn.addEventListener('click', handleResetWelcome);
    }
    
    const openPanelBtn = document.getElementById('openAchievementsPanel');
    const closePanelBtn = document.getElementById('closeAchievementsPanel');
    const panelModal = document.getElementById('achievementsPanelModal');
    if (openPanelBtn && closePanelBtn && panelModal) {
        openPanelBtn.addEventListener('click', () => {
            panelModal.classList.remove('hidden');
            renderAchievementsPanel();
            closePanelBtn.focus();
        });
        closePanelBtn.addEventListener('click', () => {
            panelModal.classList.add('hidden');
        });
    }
    const openPersonalStatsBtn = document.getElementById('openPersonalStats');
    const closePersonalStatsBtn = document.getElementById('closePersonalStats');
    const personalStatsModal = document.getElementById('personalStatsModal');
    if (openPersonalStatsBtn && closePersonalStatsBtn && personalStatsModal) {
        openPersonalStatsBtn.addEventListener('click', () => {
            personalStatsModal.classList.remove('hidden');
            renderPersonalStats();
            closePersonalStatsBtn.focus();
        });
        closePersonalStatsBtn.addEventListener('click', () => {
            personalStatsModal.classList.add('hidden');
        });
    }
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

export function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    setItem('guessRushTheme', theme);
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
    setGameState(state => ({ ...state, gameMode: elements.gameMode.value, difficulty: 'easy' }));
    updateDifficultyDropdownForMode(elements.gameMode.value);
    const currentState = getGameState();
    if (currentState.chaosInterval) {
        clearInterval(currentState.chaosInterval);
        setGameState(state => ({ ...state, chaosInterval: null }));
    }
    if (currentState.botInterval) {
        clearInterval(currentState.botInterval);
        setGameState(state => ({ ...state, botInterval: null }));
    }
    if (currentState.blitzTimeout) {
        clearTimeout(currentState.blitzTimeout);
        setGameState(state => ({ ...state, blitzTimeout: null }));
    }
    if (currentState.blitzInterval) {
        clearInterval(currentState.blitzInterval);
        setGameState(state => ({ ...state, blitzInterval: null }));
    }
    updateDifficultySettings();
    startNewGameWithTransition();
    updateModeExplanation(); 
    updateDifficultyExplanation();
    updateBodyModeClass();
    updateStatsDisplay();
}

function handleDifficultyChange() {
    setGameState(state => ({ ...state, difficulty: elements.difficulty.value }));
    updateDifficultySettings();
    startNewGameWithTransition();
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

export function updateUI() {
    const state = getGameState();
    let showCircle = false;
    let timeLeft = null;
    let totalTime = null;
    if (state.gameMode === 'blitz') {
        showCircle = true;
        totalTime = window.BLITZ_TIME_SEC || 30;
        timeLeft = typeof state.timeLeft === 'number' ? state.timeLeft : totalTime;
    } else if (state.gameMode === 'chaos' || state.gameMode === 'doublechaos') {
        showCircle = true;
        totalTime = 15;
        timeLeft = typeof state.timeLeft === 'number' ? state.timeLeft : totalTime;
    }
    if (showCircle) {
        updateTimerCircle(timeLeft, totalTime);
    } else {
        updateTimerCircle(null, null);
    }
    if (state.gameMode === 'practice' || state.gameMode === 'breakthebot') {
        elements.attemptsLeft.parentElement.style.display = 'none';
    } else {
        elements.attemptsLeft.parentElement.style.display = '';
        if (elements.attemptsLeft) {
            if (state.gameMode === 'sudden') {
                elements.attemptsLeft.textContent = '1 attempt';
            } else {
                elements.attemptsLeft.textContent = state.attemptsLeft;
            }
        }
    }
    if (elements.numberRange) {
        elements.numberRange.textContent = `${state.minRange}-${state.maxRange}`;
    }
    if (state.gameMode === 'blitz' || state.gameMode === 'chaos' || state.gameMode === 'doublechaos') {
        if (elements.chaosTimer) elements.chaosTimer.classList.add('hidden');
    } else {
        if (elements.chaosTimer) elements.chaosTimer.classList.add('hidden');
    }
    updateDailyChallengeInfo(); 
    updateStatsDisplay();
    elements.difficulty.parentElement.style.display = '';
    const diffExp = document.getElementById('difficultyExplanation');
    if (diffExp) diffExp.style.display = '';
    const streakProgressContainer = document.getElementById('streakProgressContainer');
    const streakProgressLabel = document.getElementById('streakProgressLabel');
    const streakProgressFill = document.getElementById('streakProgressFill');
    if (state.gameMode === 'streak') {
        if (streakProgressContainer) streakProgressContainer.classList.remove('hidden');
        const current = state.streakCurrent || 0;
        const max = 12;
        if (streakProgressLabel) streakProgressLabel.textContent = `Streak: ${current}/${max}`;
        if (streakProgressFill) streakProgressFill.style.width = `${(current / max) * 100}%`;
    } else {
        if (streakProgressContainer) streakProgressContainer.classList.add('hidden');
    }
    updatePlayerProfile();
    if (elements.guessInput) {
        elements.guessInput.min = state.minRange;
        elements.guessInput.max = state.maxRange;
    }
}

export function updateStatsDisplay() {
    const state = getGameState();
    const statsDisplay = elements.statsDisplay;
    if (!statsDisplay) return;

    function showScore(val) { return !val || val === Infinity ? 0 : val; }

    const html = `
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-label">Games Played</div>
                <div class="stat-value">${state.stats.gamesPlayed || 0}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Games Won</div>
                <div class="stat-value">${state.stats.gamesWon || 0}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Win Rate</div>
                <div class="stat-value">${state.stats.gamesPlayed ? Math.round((state.stats.gamesWon / state.stats.gamesPlayed) * 100) : 0}%</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Best Score</div>
                <div class="stat-value">${showScore(state.stats.bestScore)}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Total Score</div>
                <div class="stat-value">${state.stats.totalScore || 0}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Perfect Games</div>
                <div class="stat-value">${state.stats.perfectGames || 0} ⭐</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Total Attempts</div>
                <div class="stat-value">${state.stats.totalAttempts || 0}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Avg Win Time</div>
                <div class="stat-value">${state.stats.avgWinTime ? Math.round(state.stats.avgWinTime) : 0}s</div>
            </div>
        </div>
    `;
    statsDisplay.innerHTML = html;
}

export function updateAchievementsDisplay() {
    const state = getGameState();
    const achievementsList = elements.achievementsList;
    if (!achievementsList) return;
    const earned = state.achievementsEarnedThisRound;
    achievementsList.innerHTML = '';
    if (!earned || earned.length === 0) {
        achievementsList.innerHTML = `<div class="no-achievements">No achievements earned this round yet.<br>Try to unlock one!</div>`;
        return;
    }
    for (const { name, tier } of earned) {
        const icon = tierIcons[tier] || '';
        const color = tierColors[tier] || '#fff';
        const desc = getAchievementDescription(name, tier);
        let bgColor = 'rgba(255,255,255,0.08)';
        if (tier === 'bronze') bgColor = 'rgba(205,127,50,0.13)';
        else if (tier === 'silver') bgColor = 'rgba(176,176,176,0.13)';
        else if (tier === 'gold') bgColor = 'rgba(255,215,0,0.13)';
        else if (tier === 'platinum') bgColor = 'rgba(0,230,230,0.13)';
        achievementsList.innerHTML += `<div class="achievement-earned" style="border-left:4px solid ${color};background:${bgColor};border-radius:12px;padding:1em 1.2em;margin:0.5em 0;display:flex;flex-direction:column;gap:0.2em;"><span class="ach-icon">${icon}</span> <b>${name}</b> <span class="tier-label" style="color:${color}">${tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : ''}</span><br><span class="ach-desc">${desc}</span></div>`;
    }
}

export function displayFeedbackMessage(message, type) {
    const feedbackElement = elements.feedbackMessage;
    feedbackElement.innerHTML = message;
    
    feedbackElement.parentElement.className = 'feedback-area';
    
    feedbackElement.parentElement.classList.add(`feedback-${type}`);
    feedbackElement.parentElement.classList.add('bounce');
    
    setTimeout(() => {
        feedbackElement.parentElement.classList.remove('bounce');
    }, 1000);
}

export function showAchievementNotification(achievement, tier = null) {
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
    
    notification.classList.add('bounce');
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.4s ease-out reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 400);
    }, 4000);
}

export function triggerConfetti() {
    if (typeof confetti !== 'undefined') {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    } else {
        createFallbackConfetti();
    }
}

export function createFallbackConfetti() {
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

export function showVictoryAnimation() {
    const victoryElement = elements.victoryAnimation;
    victoryElement.classList.remove('hidden');
    victoryElement.innerHTML = '🎉 You Win! 🎉';
    
    victoryElement.style.animation = 'bounce 1s ease, victoryFlash 0.7s linear';
    
    triggerConfetti();

    setTimeout(() => {
        victoryElement.classList.add('hidden');
    }, 3000);
}

export function updateGuessHistoryDisplay() {
    const historyDiv = document.getElementById('guessHistory');
    if (!historyDiv) return; 
    const history = getGuessHistory();
    if (history.length === 0) { 
        historyDiv.innerHTML = ''; 
        return;
    }
    historyDiv.innerHTML = history.map(item => {
        let cls = 'guess-item';
        if (item.type === 'correct') cls += ' correct';
        else if (item.type === 'hot') cls += ' hot';
        else if (item.type === 'cold') cls += ' cold';
        return `<span class="${cls}">${item.value}</span>`;
    }).join('');
}

export function updateBotGuessHistoryDisplay() {
    const historyDiv = document.getElementById('botGuessHistory');
    if (!historyDiv) return;
    const state = getGameState();
    if (!state.botGuesses || state.botGuesses.length === 0) {
        historyDiv.innerHTML = '';
        return;
    }
    historyDiv.innerHTML = state.botGuesses.map(item => {
        let cls = 'guess-item';
        if (item.type === 'correct') cls += ' correct';
        else if (item.type === 'hot') cls += ' hot';
        else if (item.type === 'cold') cls += ' cold';
        return `<span class="${cls}">${item.value}</span>`;
    }).join('');
}

export function updateModeExplanation() {
    const state = getGameState();
    const explanation = modeExplanations[state.gameMode] || "";
    const el = document.getElementById('modeExplanation');
    if (el) {
        el.textContent = explanation;
        el.style.display = '';
    }
}

export function updateDifficultyExplanation() {
    const state = getGameState();
    const explanation = getDifficultyExplanation(state.difficulty, state.gameMode);
    const el = document.getElementById('difficultyExplanation');
    if (el) {
        el.textContent = explanation;
        el.style.display = '';
    }
}

export function updateBodyModeClass() {
    const state = getGameState();
    document.body.setAttribute('data-mode', state.gameMode);
}

export function updateDailyChallengeInfo() {
    const state = getGameState();
    const infoBox = document.getElementById('dailyChallengeInfo');
    if (!infoBox) return;
    if (state.gameMode === 'daily') {
        infoBox.classList.remove('hidden');
    } else {
        infoBox.classList.add('hidden');
    }
}

export function updateMathHintsInfo() {
    const state = getGameState();
    const infoBox = document.getElementById('mathHintsInfo');
    if (!infoBox) return;
    if (state.gameMode === 'math') {
        infoBox.classList.remove('hidden');
    } else {
        infoBox.classList.add('hidden');
    }
}

export function showPlayerNameModal(initial = false) {
    const modal = document.getElementById('playerNameModal');
    const input = document.getElementById('playerNameInputModal');
    const saveBtn = document.getElementById('savePlayerNameBtn');
    modal.classList.remove('hidden');
    input.value = getItem('guessRushPlayerName') || '';
    input.focus();
    saveBtn.onclick = () => {
        let name = input.value.trim();
        if (!name) name = 'Player 1';
        setItem('guessRushPlayerName', name);
        modal.classList.add('hidden');
        updatePlayerNameDisplay();
        updateStatsDisplay();
        if (initial) showWelcomeBack(name, true);
    };
    input.onkeypress = (e) => { if (e.key === 'Enter') saveBtn.click(); };
}

export function updatePlayerNameDisplay() {
    const name = getItem('guessRushPlayerName') || 'Player 1';
    const el = document.getElementById('playerNameDisplay');
    if (el) el.innerHTML = `👤 <b>${name}</b> <button id="changePlayerNameBtn" title="Change name" style="font-size:0.9em;margin-left:0.5em;">✏️</button>`;
    setTimeout(() => {
        const btn = document.getElementById('changePlayerNameBtn');
        if (btn) btn.onclick = () => showPlayerNameModal(false);
    }, 0);
}

export function showWelcomeBack(name, first = false) {
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

export function renderPersonalStats() {
    const state = getGameState();
    const content = document.getElementById('personalStatsContent');
    if (!content) return;

    function showScore(val) { return !val || val === Infinity ? 0 : val; }

    const personalBests = getFormattedPersonalBests();
    const rankingProgress = getRankingProgress();
    const currentMode = state.gameMode;
    const currentDifficulty = state.difficulty;
    const currentModeStats = getCalculatedStats(currentMode, currentDifficulty);

    const generalStatsHTML = `
        <div class="personal-stats-grid">
            <div class="personal-stat-item">
                <div class="personal-stat-label">Games Played</div>
                <div class="personal-stat-value">${state.stats.gamesPlayed || 0}</div>
            </div>
            <div class="personal-stat-item">
                <div class="personal-stat-label">Games Won</div>
                <div class="personal-stat-value">${state.stats.gamesWon || 0}</div>
            </div>
            <div class="personal-stat-item">
                <div class="personal-stat-label">Win Rate</div>
                <div class="personal-stat-value">${state.stats.gamesPlayed ? Math.round((state.stats.gamesWon / state.stats.gamesPlayed) * 100) : 0}%</div>
            </div>
            <div class="personal-stat-item">
                <div class="personal-stat-label">Best Score</div>
                <div class="personal-stat-value">${showScore(state.stats.bestScore)}</div>
            </div>
            <div class="personal-stat-item">
                <div class="personal-stat-label">Total Score</div>
                <div class="personal-stat-value">${state.stats.totalScore || 0}</div>
            </div>
            <div class="personal-stat-item">
                <div class="personal-stat-label">Perfect Games</div>
                <div class="personal-stat-value">${state.stats.perfectGames || 0} ⭐</div>
            </div>
            <div class="personal-stat-item">
                <div class="personal-stat-label">Total Attempts</div>
                <div class="personal-stat-value">${state.stats.totalAttempts || 0}</div>
            </div>
            <div class="personal-stat-item">
                <div class="personal-stat-label">Avg Win Time</div>
                <div class="personal-stat-value">${state.stats.avgWinTime ? Math.round(state.stats.avgWinTime) : 0}s</div>
            </div>
        </div>
        <div class="personal-stats-section ranking-section">
            <h3>🏆 Player Ranking</h3>
            <div class="ranking-info">
                <div class="ranking-title">${rankingProgress.currentTitle}</div>
                <div class="ranking-level">Level ${rankingProgress.currentLevel}</div>
                <div class="ranking-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${rankingProgress.progressPercentage}%"></div>
                    </div>
                    <div class="progress-text">
                        ${rankingProgress.expInCurrentLevel} / ${rankingProgress.expNeededForNextLevel} XP
                        (${rankingProgress.progressPercentage}%)
                    </div>
                </div>
                <div class="ranking-next">Next: ${rankingProgress.nextTitle} (Level ${rankingProgress.nextLevel})</div>
                ${rankingProgress.nextTitle && rankingProgress.nextTitle !== rankingProgress.currentTitle ? `
                  <div class="ranking-xp-to-next">
                    ${rankingProgress.expInCurrentLevel} / ${rankingProgress.expNeededForNextLevel} XP
                    (${rankingProgress.expNeededForNextLevel - rankingProgress.expInCurrentLevel} XP to next level: <b>${rankingProgress.nextTitle}</b>)
                  </div>
                ` : ''}
            </div>
        </div>
    `;

    const modeIcons = {
        classic: '🎯',
        chaos: '🌪️',
        math: '➗',
        daily: '📅',
        blitz: '⚡',
        bot: '🤖',
        breakthebot: '🧠',
        doublechaos: '🌀',
        streak: '🔥',
        sudden: '💀',
        reverse: '🔄'
    };

    const personalBestsHTML = `
        <div class="personal-stats-section">
            <h3>🏁 Personal Bests</h3>
            <div class="personal-bests-grid">
                ${Object.entries(personalBests).map(([mode, bests]) => {
                    const score = (bests.bestScore === null || bests.bestScore === undefined || bests.bestScore === 'N/A') ? 0 : bests.bestScore;
                    const time = (bests.bestTime === null || bests.bestTime === undefined || bests.bestTime === 'N/A') ? 0 : bests.bestTime;
                    const efficiency = (bests.bestEfficiency === null || bests.bestEfficiency === undefined || bests.bestEfficiency === 'N/A') ? 'Give it a try' : bests.bestEfficiency;
                    return `
                    <div class="mode-best-item">
                        <div class="mode-best-title">
                            <span class="mode-best-icon">${modeIcons[mode.toLowerCase()] || ''}</span>
                            ${mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </div>
                        <div class="mode-best-stats">
                            <div class="mode-best-stat">Score: ${score}</div>
                            <div class="mode-best-stat">Time: ${time}</div>
                            <div class="mode-best-stat">Efficiency: ${efficiency}</div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    const modeStatsHTML = `
        <div class="personal-stats-section">
            <h3>📊 ${currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} Mode - ${currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1)}</h3>
            <div class="advanced-stats-grid">
                <div class="advanced-stat-item">
                    <div class="advanced-stat-label">Average Time</div>
                    <div class="advanced-stat-value">${currentModeStats.averageTime}s</div>
                </div>
                <div class="advanced-stat-item">
                    <div class="advanced-stat-label">Average Attempts</div>
                    <div class="advanced-stat-value">${currentModeStats.averageAttempts}</div>
                </div>
                <div class="advanced-stat-item">
                    <div class="advanced-stat-label">Success Rate</div>
                    <div class="advanced-stat-value">${currentModeStats.successRate}%</div>
                </div>
                <div class="advanced-stat-item">
                    <div class="advanced-stat-label">Average Score</div>
                    <div class="advanced-stat-value">${currentModeStats.averageScore}</div>
                </div>
            </div>
        </div>
        <div class="personal-stats-section">
            <h3>Best Scores by Mode</h3>
            <div class="mode-scores">
                <div class="mode-score">Classic: ${showScore(state.stats.bestByMode.classic)}</div>
                <div class="mode-score">Chaos: ${showScore(state.stats.bestByMode.chaos)}</div>
                <div class="mode-score">Math: ${showScore(state.stats.bestByMode.math)}</div>
                <div class="mode-score">Daily: ${showScore(state.stats.bestByMode.daily)}</div>
            </div>
        </div>
        ${state.stats.streak ? `
        <div class="personal-stats-section">
            <h3>Streak Mode Stats</h3>
            <div class="streak-stats">
                <div class="streak-stat">Games Played: ${state.stats.streak.gamesPlayed}</div>
                <div class="streak-stat">Games Won: ${state.stats.streak.gamesWon}</div>
                <div class="streak-stat">Best Streak: ${state.stats.streak.bestStreak}</div>
            </div>
        </div>
        ` : ''}
    `;

    const dailyStatsHTML = state.stats.dailyStats ? `
        <div class="personal-stats-section">
            <h3>Daily Challenge Stats</h3>
            <div class="daily-stats">
                <div class="daily-stat">Days Played: ${state.stats.dailyStats.daysPlayed}</div>
                <div class="daily-stat">Days Won: ${state.stats.dailyStats.daysWon}</div>
                <div class="daily-stat">Current Streak: ${state.stats.dailyStats.currentStreak}</div>
                <div class="daily-stat">Max Streak: ${state.stats.dailyStats.maxStreak}</div>
            </div>
        </div>
    ` : '<div class="personal-stats-section"><h3>Daily Challenge Stats</h3><div class="daily-stats">No daily stats yet.</div></div>';

    // Tabs HTML
    const html = `
        <div class="stats-tabs">
            <button class="tab-btn active" data-tab="general">General</button>
            <button class="tab-btn" data-tab="bests">Personal Bests</button>
            <button class="tab-btn" data-tab="mode">Mode Stats</button>
            <button class="tab-btn" data-tab="daily">Daily Challenge</button>
        </div>
        <div class="tab-content" id="tab-general">${generalStatsHTML}</div>
        <div class="tab-content hidden" id="tab-bests">${personalBestsHTML}</div>
        <div class="tab-content hidden" id="tab-mode">${modeStatsHTML}</div>
        <div class="tab-content hidden" id="tab-daily">${dailyStatsHTML}</div>
    `;

    content.innerHTML = html;

    const tabBtns = content.querySelectorAll('.tab-btn');
    const tabContents = content.querySelectorAll('.tab-content');
    tabBtns.forEach(btn => {
        btn.onclick = () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.getAttribute('data-tab');
            tabContents.forEach(tc => {
                if (tc.id === 'tab-' + tab) tc.classList.remove('hidden');
                else tc.classList.add('hidden');
            });
        };
    });
}

export function showShareResultBtn(show, result) {
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

export function shareResult({win, numGuesses, mode, time}) {
    const playerName = getItem('guessRushPlayerName') || 'Player 1';
    let modeName = mode.charAt(0).toUpperCase() + mode.slice(1);
    let text = `GuessRush 🔥\nPlayer: ${playerName}\nMode: ${modeName}\n`;
    if (win) {
        text += `Win in ${numGuesses} guesses ✅\n`;
    } else {
        text += `Did not win ❌\n`;
    }
    if (time) text += `Time: ${time}s\n`;
    text += `#GuessRushGame`;
    if (navigator.share) {
        navigator.share({ text }).catch(() => {});
        return;
    }
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            displayFeedbackMessage('Result copied to clipboard!', 'success');
        });
    } else {
        window.prompt('Copy this:', text);
    }

    showShareResultBtn(false);
}

export function renderAchievementsPanel() {
    const panel = document.getElementById('achievementsPanelList');
    if (!panel) return;
    panel.innerHTML = '';
    const state = getGameState();
    const allAchievementNames = Object.keys(achievementDescriptions);
    for (const name of allAchievementNames) {
        const desc = getAchievementDescription(name) || '';
        let tier = null;
        let unlocked = false;
        if (Array.isArray(state.achievementsTiers[name]) && state.achievementsTiers[name].length > 0) {
            tier = state.achievementsTiers[name][0];
            unlocked = true;
        }
        let icon = unlocked ? (tierIcons[tier] || '🏆') : '❓';
        let color = unlocked ? (tierColors[tier] || '#fff') : '#888';
        let label = unlocked ? (tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : '') : 'Locked';
        let extra = '';
        if (name === 'Game Master' && !unlocked) {
            extra = '<div style="font-size:0.95em;opacity:0.7;margin-top:0.3em;">Secret achievement</div>';
        }
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

export function handleResetAchievements() {
    if (confirm('Are you sure you want to reset all achievements? This cannot be undone.')) { 
        setGameState(state => ({ ...state, achievementsTiers: {} }));
        saveToLocalStorage();
        updateStatsDisplay();
        updateAchievementsDisplay();
        displayFeedbackMessage('Achievements have been reset', 'hint');
    }
}

export function handleResetStats() {
    if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) { 
        const resetStats = {
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
            modesWon: {},
            perfectGames: 0,
            personalBests: {
                classic: { bestScore: Infinity, bestTime: Infinity, bestEfficiency: 0 },
                chaos: { bestScore: Infinity, bestTime: Infinity, bestEfficiency: 0 },
                math: { bestScore: Infinity, bestTime: Infinity, bestEfficiency: 0 },
                daily: { bestScore: Infinity, bestTime: Infinity, bestEfficiency: 0 },
                blitz: { bestScore: Infinity, bestTime: Infinity, bestEfficiency: 0 },
                bot: { bestScore: Infinity, bestTime: Infinity, bestEfficiency: 0 },
                breakthebot: { bestScore: Infinity, bestTime: Infinity, bestEfficiency: 0 },
                doublechaos: { bestScore: Infinity, bestTime: Infinity, bestEfficiency: 0 },
                streak: { bestScore: Infinity, bestTime: Infinity, bestEfficiency: 0 },
                sudden: { bestScore: Infinity, bestTime: Infinity, bestEfficiency: 0 },
                reverse: { bestScore: Infinity, bestTime: Infinity, bestEfficiency: 0 }
            },
            advancedStats: {
                classic: {
                    easy: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    medium: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    hard: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    chaos: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 }
                },
                chaos: {
                    easy: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    medium: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    hard: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    chaos: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 }
                },
                math: {
                    easy: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    medium: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    hard: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    chaos: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 }
                },
                blitz: {
                    easy: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    medium: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    hard: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    chaos: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 }
                },
                bot: {
                    easy: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    medium: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    hard: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    chaos: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 }
                },
                breakthebot: {
                    easy: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    medium: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    hard: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    chaos: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 }
                },
                doublechaos: {
                    easy: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    medium: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    hard: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    chaos: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 }
                },
                streak: {
                    easy: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    medium: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    hard: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    chaos: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 }
                },
                sudden: {
                    easy: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    medium: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    hard: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    chaos: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 }
                },
                reverse: {
                    easy: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    medium: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    hard: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 },
                    chaos: { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 }
                }
            },
            ranking: {
                currentLevel: 1,
                currentTitle: 'Novice',
                totalExperience: 0,
                levelThresholds: [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000],
                titles: ['Novice', 'Apprentice', 'Explorer', 'Strategist', 'Mastermind', 'Virtuoso', 'Legend', 'Mythic', 'Divine', 'Transcendent']
            }
        };
        setGameState(state => ({ ...state, stats: resetStats }));
        saveToLocalStorage();
        updateStatsDisplay();
        displayFeedbackMessage('Statistics have been reset', 'hint');
    }
}

export function showDailyResultModal(result) {
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

function handleGuess() {
    const result = gameLogicHandleGuess();
    if (result && result.type === 'daily_already_played') {
        displayFeedbackMessage(
            result.result.win
                ? `You already played today's Daily Challenge and WON in ${result.result.attempts} attempts!`
                : `You already played today's Daily Challenge and did not win. The number was ${result.result.number}.`,
            result.result.win ? 'success' : 'error'
        );
        elements.guessInput.disabled = true;
        elements.submitGuess.disabled = true;
        elements.helpButton.disabled = true;
        return;
    }
    if (result && result.type === 'error' && result.message && result.message.includes('valid number between')) {
        displayFeedbackMessage(result.message, result.type);
        return;
    }
    if (result && result.type === 'hint') {
        displayFeedbackMessage(result.message, result.type);
        elements.guessInput.value = '';
    }
    if (result && result.type === 'error' && result.message === 'Please enter a valid number.') {
        displayFeedbackMessage(result.message, result.type);
        return;
    }
    if (result && result.type === 'error' && result.message === 'Wait for your turn!') {
        displayFeedbackMessage(result.message, result.type);
        return;
    }
    setGuessHistory(getGuessHistory());
    updateGuessHistoryDisplay();
    updateUI();
    const state = getGameState();
    if (state.gameMode === 'blitz' && !state.blitzStarted) {
        gameLogicStartBlitzTimer();
        if (window.updateUI) window.updateUI();
    }
    if (result) {
        if (result.type === 'success' || (result.type === 'error' && !(result.message && result.message.includes('valid number between')))) {
            const achievements = state.achievementsEarnedThisRound || [];
            let multiplier = 1;
            if (state.difficulty === 'medium') multiplier = 1.2;
            else if (state.difficulty === 'hard') multiplier = 1.4;
            else if (state.difficulty === 'chaos') multiplier = 1.6;
            const gameData = {
                score: result.score,
                winTime: result.winTime,
                numGuesses: result.numGuesses,
                achievements,
                win: result.type === 'success',
                mode: result.mode,
                difficulty: state.difficulty,
                usedHelp: state.usedHelp,
                targetNumber: state.currentNumber,
                guessHistory: state.guessHistory || [],
                minRange: state.minRange,
                maxRange: state.maxRange,
                scoreDetails: {
                    numGuesses: result.numGuesses,
                    winTime: result.winTime,
                    usedHelp: state.usedHelp,
                    multiplier
                }
            };
            if (result.type === 'success') {
                showEnhancedVictoryScreen(gameData);
                showShareResultBtn(true, {
                    win: true,
                    numGuesses: result.numGuesses,
                    mode: result.mode,
                    time: result.winTime
                });
            } else if (result.type === 'error') {
                showEnhancedGameOverScreen(gameData);
                showShareResultBtn(true, {
                    win: false,
                    numGuesses: result.numGuesses,
                    mode: result.mode,
                    time: result.time
                });
            }
            setTimeout(() => {
                startNewGame();
            }, 3000);
        }
    }
    if (state.gameMode === 'doublechaos') {
        gameLogicStartDoubleChaosTimer();
    }
    if (state.gameMode === 'breakthebot') {
        const afterGuessState = getGameState();
        if (afterGuessState.botTurn) {
            setTimeout(() => {
                import('./gameLogic.js').then(mod => {
                    mod.breakTheBotTakeTurn();
                    updateBotGuessHistoryDisplay();
                    updateUI();
                    const stateNow = getGameState();
                    if (!stateNow.botTurn) {
                        elements.guessInput.disabled = false;
                        elements.submitGuess.disabled = false;
                        elements.helpButton.disabled = false;
                    }
                });
            }, 700);
        }
    }
    showGameSummaryIfNeeded(result);
}

function handleHelp() {
    const result = gameLogicHandleHelp();
    if (result) {
        displayFeedbackMessage(result.message, result.type);
        if (result.type === 'hint') {
            elements.helpButton.disabled = true;
        }
    }
}

export function startNewGame() {
    elements.guessInput.disabled = false;
    elements.submitGuess.disabled = false;
    elements.helpButton.disabled = false;
    elements.guessInput.value = '';
    elements.feedbackMessage.textContent = '';
    setGuessHistory([]);
    updateGuessHistoryDisplay();
    const botHistoryDiv = document.getElementById('botGuessHistory');
    if (botHistoryDiv) botHistoryDiv.innerHTML = '';
    if (elements.chaosTimer) elements.chaosTimer.classList.add('hidden');
    const result = gameLogicStartNewGame();
    if (result) {
        if (result.type === 'daily_already_played') {
            showDailyResultModal(result.result);
            elements.guessInput.disabled = true;
            elements.submitGuess.disabled = true;
            elements.helpButton.disabled = true;
            return;
        }
    }
    updateUI();
}

function showDailyResultMessage(result) {
    return gameLogicShowDailyResultMessage(result);
}

export function handleResetWelcome() {
    if (confirm('Reset the welcome flow? This will show the welcome screen again on the next page load.')) {
        removeItem('guessRushWelcomeCompleted');
        removeItem('guessRushPlayerName');
        displayFeedbackMessage('Welcome flow reset! Refresh the page to see it again.', 'hint');
    }
}

function updateDifficultyDropdownForMode(gameMode) {
    const diffSelect = elements.difficulty;
    if (!diffSelect) return;
    if (gameMode === 'streak') {
        diffSelect.innerHTML = '<option value="master">Master</option>';
        diffSelect.value = 'master';
    } else if (gameMode === 'doublechaos') {
        diffSelect.innerHTML = `
            <option value="easy">Easy (1-200)</option>
            <option value="medium">Medium (1-400)</option>
            <option value="hard">Hard (1-600)</option>
            <option value="chaos">Chaos (1-1000)</option>
        `;
        diffSelect.value = 'easy';
    } else {
        diffSelect.innerHTML = `
            <option value="easy">Easy (1-100)</option>
            <option value="medium">Medium (1-250)</option>
            <option value="hard">Hard (1-500)</option>
            <option value="chaos">Chaos (1-1000)</option>
        `;
        diffSelect.value = 'easy';
    }
    if (!['easy','medium','hard','chaos'].includes(diffSelect.value)) {
        diffSelect.value = 'easy';
    }
}

export function updatePlayerProfile() {
    const playerProfile = document.getElementById('playerProfile');
    const playerAvatar = document.getElementById('playerAvatar');
    const playerNameProfile = document.getElementById('playerNameProfile');
    const playerTier = document.getElementById('playerTier');
    const playerFavoriteMode = document.getElementById('playerFavoriteMode');
    const state = getGameState();
    const playerName = (window.localStorage && localStorage.getItem('guessRushPlayerName')) || state.playerName || '';
    if (!playerName) {
        if (playerProfile) playerProfile.classList.add('hidden');
        return;
    }
    if (playerProfile) playerProfile.classList.remove('hidden');
    const initials = playerName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
    if (playerAvatar) playerAvatar.textContent = initials;
    if (playerNameProfile) playerNameProfile.textContent = playerName;
    const tierOrder = ['platinum','gold','silver','bronze'];
    let highestTier = 'bronze';
    if (state.achievementsTiers) {
        for (const tier of tierOrder) {
            if (Object.values(state.achievementsTiers).some(arr => arr.includes(tier))) {
                highestTier = tier;
                break;
            }
        }
    }
    if (playerTier) {
        playerTier.textContent = highestTier.charAt(0).toUpperCase() + highestTier.slice(1);
        playerTier.className = 'player-tier-badge ' + highestTier;
    }
    let favoriteMode = 'Classic';
    let maxPlayed = 0;
    if (state.stats && state.stats.modesWon) {
        for (const [mode, count] of Object.entries(state.stats.modesWon)) {
            if (count > maxPlayed) {
                maxPlayed = count;
                favoriteMode = mode.charAt(0).toUpperCase() + mode.slice(1);
            }
        }
    }
    if (playerFavoriteMode) playerFavoriteMode.textContent = `Favorite: ${favoriteMode}`;
}

window.startNewGame = startNewGame;
window.updateUI = updateUI;

function showEnhancedVictoryScreen(gameData) {
    const modal = document.getElementById('victoryScreenModal');
    if (!modal) return;
    
    modal.classList.remove('hidden');
    modal.style.zIndex = '10010';
    document.body.style.overflow = 'hidden';
    

    const wasPerfect = updatePerfectGamesCounter(gameData.numGuesses, gameData.winTime, gameData.usedHelp);
    
    updateVictoryScreenContent(gameData, wasPerfect);
    
    setupVictoryScreenListeners(modal);
    
    if (wasPerfect) {
        triggerConfetti();
    }
}

function showEnhancedGameOverScreen(gameData) {
    const modal = document.getElementById('gameOverScreenModal');
    if (!modal) return;
    
    modal.classList.remove('hidden');
    modal.style.zIndex = '10010';
    document.body.style.overflow = 'hidden';
    
    // Update UI elements
    updateGameOverScreenContent(gameData);
    
    // Setup event listeners
    setupGameOverScreenListeners(modal);
    
    // Add shake effect to the title
    const title = document.getElementById('gameOverScreenTitle');
    if (title) {
        title.style.animation = 'none';
        setTimeout(() => {
            title.style.animation = 'gameOverShake 0.8s ease-in-out';
        }, 100);
    }
}

export { showEnhancedVictoryScreen, showEnhancedGameOverScreen };

export function showEndGameSummary({ score, winTime, numGuesses, achievements, win, mode, difficulty, usedHelp, scoreDetails }) {
    console.log('showEndGameSummary called');
    const modal = document.getElementById('endGameSummaryModal');
    const content = document.getElementById('endGameSummaryContent');
    const title = document.getElementById('endGameSummaryTitle');
    const subtitle = document.getElementById('endGameSummarySubtitle');
    const scoreBreakdown = document.getElementById('scoreBreakdown');
    const scoreBreakdownContainer = document.getElementById('scoreBreakdownContainer');
    const toggleScoreBreakdown = document.getElementById('toggleScoreBreakdown');
    const bestScoreComparison = document.getElementById('bestScoreComparison');
    const animatedAchievements = document.getElementById('animatedAchievements');
    if (!modal || !content) return
    modal.classList.remove('hidden');
    modal.style.zIndex = '10010';
    document.body.style.overflow = 'hidden';
    setTimeout(() => { modal.classList.add('fade-in'); }, 10);
    title.textContent = win ? 'You Win!' : 'Game Over';
    let subtitleText = '';
    const modeName = mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : '';
    const diffName = difficulty ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1) : '';
    subtitleText = `${modeName} Mode – ${diffName}`;
    if (usedHelp) subtitleText += ' – Hints Used';
    else subtitleText += ' – No Hints Used';
    if (subtitle) subtitle.textContent = subtitleText;
    if (scoreBreakdown && scoreBreakdownContainer && toggleScoreBreakdown) {
        let breakdownHtml = '';
        if (scoreDetails) {
            breakdownHtml += `<div>Base Score: <b>1000</b></div>`;
            breakdownHtml += `<div>-50 points per guess (×${scoreDetails.numGuesses - 1})</div>`;
            breakdownHtml += `<div>-2 points per second (×${scoreDetails.winTime})</div>`;
            if (scoreDetails.usedHelp) breakdownHtml += `<div>-100 points for using a hint</div>`;
            breakdownHtml += `<div>Difficulty Multiplier: <b>×${scoreDetails.multiplier}</b></div>`;
            breakdownHtml += `<div style='margin-top:0.5em;font-weight:600;'>Final Score: <span class='score-pop'>${score}</span></div>`;
        } else {
            breakdownHtml = 'No breakdown available.';
        }
        scoreBreakdown.innerHTML = breakdownHtml;
        scoreBreakdown.classList.add('hidden');
        toggleScoreBreakdown.textContent = 'Show Score Breakdown';
        toggleScoreBreakdown.onclick = () => {
            scoreBreakdown.classList.toggle('hidden');
            if (scoreBreakdown.classList.contains('hidden')) {
                toggleScoreBreakdown.textContent = 'Show Score Breakdown';
            } else {
                toggleScoreBreakdown.textContent = 'Hide Score Breakdown';
            }
        };
    }
    const state = getGameState();
    let bestScore = 0;
    if (state.stats && state.stats.bestByMode && mode && state.stats.bestByMode[mode] !== undefined && state.stats.bestByMode[mode] !== null && state.stats.bestByMode[mode] !== Infinity) {
        bestScore = state.stats.bestByMode[mode];
    }
    if (bestScoreComparison) {
        if (score !== undefined && bestScore !== undefined && bestScore !== null && bestScore !== Infinity) {
            bestScoreComparison.textContent = `Best score in ${modeName} Mode: ${bestScore}`;
        } else {
            bestScoreComparison.textContent = '';
        }
    }
    setTimeout(() => {
        const scorePop = content.querySelector('.score-pop');
        if (scorePop) scorePop.classList.add('score-pop');
    }, 100);
    if (animatedAchievements) {
        animatedAchievements.innerHTML = '';
        if (achievements && achievements.length > 0) {
            let delay = 0;
            achievements.forEach(({ name, tier }, idx) => {
                const span = document.createElement('span');
                span.className = `summary-achievement ${tier} animated-achievement`;
                span.style.animationDelay = `${0.3 + idx * 0.25}s`;
                span.textContent = `${name} ${tier.charAt(0).toUpperCase() + tier.slice(1)}`;
                animatedAchievements.appendChild(span);
            });
        } else {
            animatedAchievements.innerHTML = `<div class="summary-achievements" style="opacity:0.7;">No achievements this round</div>`;
        }
    }
    let highestTier = 'bronze';
    if (achievements && achievements.length > 0) {
        const tierOrder = ['platinum','gold','silver','bronze'];
        for (const tier of tierOrder) {
            if (achievements.some(a => a.tier === tier)) {
                highestTier = tier;
                break;
            }
        }
    }
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.classList.remove('tier-bronze','tier-silver','tier-gold','tier-platinum');
        modalContent.classList.add('tier-' + highestTier);
    }
    let html = '';
    html += `<div class="summary-row"><span class="summary-label">Score:</span><span class="summary-value score-pop">${score ?? 0}</span></div>`;
    html += `<div class="summary-row"><span class="summary-label">Time:</span><span class="summary-value">${winTime ?? 0} sec</span></div>`;
    html += `<div class="summary-row"><span class="summary-label">Guesses:</span><span class="summary-value">${numGuesses ?? 0}</span></div>`;
    html += `<div class="summary-row"><span class="summary-label">Mode:</span><span class="summary-value">${modeName}</span></div>`;
    content.innerHTML = html;
    const playAgainBtn = document.getElementById('playAgainBtn');
    const closeSummaryBtn = document.getElementById('closeSummaryBtn');
    if (playAgainBtn) {
        playAgainBtn.onclick = () => {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
            const guessInput = document.getElementById('guessInput');
            const submitGuess = document.getElementById('submitGuess');
            const helpButton = document.getElementById('helpButton');
            if (guessInput) guessInput.disabled = false;
            if (submitGuess) submitGuess.disabled = false;
            if (helpButton) helpButton.disabled = false;
            window.startNewGame && window.startNewGame();
        };
    }
    if (closeSummaryBtn) {
        closeSummaryBtn.onclick = () => {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
            const guessInput = document.getElementById('guessInput');
            const submitGuess = document.getElementById('submitGuess');
            const helpButton = document.getElementById('helpButton');
            if (guessInput) guessInput.disabled = false;
            if (submitGuess) submitGuess.disabled = false;
            if (helpButton) helpButton.disabled = false;
            window.startNewGame && window.startNewGame();
        };
    }
}

const origDisplayFeedbackMessage = window.displayFeedbackMessage;
window.displayFeedbackMessage = function(msg, type, extra) {
    if (extra && extra.endGameSummary) {
        showEndGameSummary(extra.endGameSummary);
    }
    if (origDisplayFeedbackMessage) origDisplayFeedbackMessage.apply(this, arguments);
};

export function showGameSummaryIfNeeded(result) {
    if (!result) return;
    if (result.type === 'success' || (result.type === 'error' && !(result.message && result.message.includes('valid number between')))) {
        const state = getGameState();
        const achievements = state.achievementsEarnedThisRound || [];
        let multiplier = 1;
        if (state.difficulty === 'medium') multiplier = 1.2;
        else if (state.difficulty === 'hard') multiplier = 1.4;
        else if (state.difficulty === 'chaos') multiplier = 1.6;
        
        const gameData = {
            score: result.score,
            winTime: result.winTime,
            numGuesses: result.numGuesses,
            achievements,
            win: result.type === 'success',
            mode: result.mode,
            difficulty: state.difficulty,
            usedHelp: state.usedHelp,
            targetNumber: state.currentNumber,
            guessHistory: state.guessHistory || [],
            minRange: state.minRange,
            maxRange: state.maxRange,
            scoreDetails: {
                numGuesses: result.numGuesses,
                winTime: result.winTime,
                usedHelp: state.usedHelp,
                multiplier
            }
        };
        
        if (result.type === 'success') {
            showEnhancedVictoryScreen(gameData);
        } else {
            showEnhancedGameOverScreen(gameData);
        }
    }
}

function updateTimerCircle(timeLeft, totalTime) {
    const container = document.getElementById('timerCircleContainer');
    if (!container) return;
    if (typeof timeLeft !== 'number' || typeof totalTime !== 'number' || totalTime <= 0) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }
    container.classList.remove('hidden');
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const percent = Math.max(0, Math.min(1, timeLeft / totalTime));
    let colorClass = '';
    if (percent <= 0.33) colorClass = 'danger';
    else if (percent <= 0.66) colorClass = 'warning';
    else colorClass = '';
    container.innerHTML = `
      <svg class="timer-svg" width="64" height="64">
        <circle class="timer-bg" cx="32" cy="32" r="${radius}" fill="none" />
        <circle class="timer-fg ${colorClass}" cx="32" cy="32" r="${radius}" fill="none"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${circumference * (1 - percent)}"
        />
      </svg>
      <div class="timer-text">${timeLeft}</div>
    `;
}

function updateVictoryScreenContent(gameData, wasPerfect) {
    const state = getGameState();
    
    const perfectIndicator = document.getElementById('perfectGameIndicator');
    const perfectCount = document.getElementById('perfectGamesCount');
    
    if (wasPerfect && perfectIndicator) {
        perfectIndicator.classList.remove('hidden');
        if (perfectCount) {
            perfectCount.textContent = state.stats.perfectGames || 0;
        }
    } else if (perfectIndicator) {
        perfectIndicator.classList.add('hidden');
    }
    
    const victoryScore = document.getElementById('victoryScore');
    const victoryTime = document.getElementById('victoryTime');
    const victoryGuesses = document.getElementById('victoryGuesses');
    const victorySubtitle = document.getElementById('victorySubtitle');
    
    if (victoryScore) victoryScore.textContent = gameData.score || 0;
    if (victoryTime) victoryTime.textContent = `${gameData.winTime || 0} sec`;
    if (victoryGuesses) victoryGuesses.textContent = gameData.numGuesses || 0;
    
    if (victorySubtitle) {
        const modeName = gameData.mode ? gameData.mode.charAt(0).toUpperCase() + gameData.mode.slice(1) : '';
        const diffName = gameData.difficulty ? gameData.difficulty.charAt(0).toUpperCase() + gameData.difficulty.slice(1) : '';
        let subtitle = `${modeName} Mode – ${diffName}`;
        if (gameData.usedHelp) subtitle += ' – Hints Used';
        else subtitle += ' – No Hints Used';
        victorySubtitle.textContent = subtitle;
    }
    
    updateVictoryAchievements(gameData.achievements);
    
    updateNextAchievementHint();

    const playerInfoLine = document.getElementById('playerInfoLineVictory');
    if (playerInfoLine) {
        const playerName = (window.localStorage && localStorage.getItem('guessRushPlayerName')) || state.playerName || '';
        const initials = playerName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
        const tierOrder = ['platinum','gold','silver','bronze'];
        let highestTier = 'bronze';
        if (state.achievementsTiers) {
            for (const tier of tierOrder) {
                if (Object.values(state.achievementsTiers).some(arr => arr.includes(tier))) {
                    highestTier = tier;
                    break;
                }
            }
        }
        playerInfoLine.innerHTML = `
            <span class="player-avatar player-tier-${highestTier}" style="width:2em;height:2em;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:#ececec;font-weight:700;font-size:1.1em;">${initials}</span>
            <span class="player-name" style="font-weight:600;">${playerName}</span>
            <span class="player-tier-badge ${highestTier}" style="padding:0.18em 0.7em;border-radius:1em;font-size:0.98em;font-weight:500;background:var(--tier-${highestTier},#eee);color:#333;">${highestTier.charAt(0).toUpperCase() + highestTier.slice(1)}</span>
        `;
    }

    const feedbackElement = document.getElementById('personalizedFeedbackVictory');
    if (feedbackElement) {
        let feedbackMessage = '';
        if (gameData.numGuesses === 1) {
            feedbackMessage = '🎯 Perfect! First try!';
        } else if (gameData.numGuesses <= 3) {
            feedbackMessage = `🚀 Excellent! Solved in ${gameData.numGuesses} guesses!`;
        } else if (gameData.numGuesses <= 5) {
            feedbackMessage = `👍 Great job! Solved in ${gameData.numGuesses} guesses!`;
        } else if (gameData.numGuesses <= 8) {
            feedbackMessage = `✅ Well done! Solved in ${gameData.numGuesses} guesses!`;
        } else {
            feedbackMessage = `🎉 Victory! Solved in ${gameData.numGuesses} guesses!`;
        }
        
        if (gameData.winTime <= 30) {
            feedbackMessage += ' ⚡ Lightning fast!';
        } else if (gameData.winTime <= 60) {
            feedbackMessage += ' ⏱️ Quick thinking!';
        }
        
        feedbackElement.textContent = feedbackMessage;
    }

    const selfComparison = document.getElementById('selfComparisonVictory');
    if (selfComparison) {
        const state = getGameState();
        const mode = gameData.mode;
        const score = gameData.score;
        let bestScore = null;
        if (state.stats && state.stats.bestByMode && mode && state.stats.bestByMode[mode] !== undefined && state.stats.bestByMode[mode] !== null && state.stats.bestByMode[mode] !== Infinity) {
            bestScore = state.stats.bestByMode[mode];
        }
        if (bestScore !== null && bestScore !== undefined) {
            if (score > bestScore) {
                selfComparison.innerHTML = `<span class='arrow-best'>⭐</span> <b>New Personal Best!</b> <span style='color:#28a745;'>(+${score - bestScore})</span>`;
            } else if (score === bestScore) {
                selfComparison.innerHTML = `<span class='arrow-best'>⭐</span> <b>Tied Personal Best!</b>`;
            } else {
                selfComparison.innerHTML = `<span class='arrow-down'>↓</span> <span>Best: <b>${bestScore}</b></span> <span style='color:#dc3545;'>(-${bestScore - score})</span>`;
            }
        } else {
            selfComparison.innerHTML = `<span>First game in this mode!</span>`;
        }
    }
}

function updateVictoryAchievements(achievements) {
    const achievementsList = document.getElementById('victoryAchievementsList');
    if (!achievementsList) return;
    
    achievementsList.innerHTML = '';
    
    if (achievements && achievements.length > 0) {
        achievements.forEach((achievement, index) => {
            const achievementEl = document.createElement('div');
            achievementEl.className = `achievement-victory ${achievement.tier}`;
            achievementEl.style.animationDelay = `${index * 0.2}s`;
            achievementEl.textContent = `${achievement.name} ${achievement.tier.charAt(0).toUpperCase() + achievement.tier.slice(1)}`;
            achievementsList.appendChild(achievementEl);
        });
    } else {
        const noAchievements = document.createElement('div');
        noAchievements.className = 'achievement-victory';
        noAchievements.textContent = 'No achievements this round';
        noAchievements.style.opacity = '0.7';
        achievementsList.appendChild(noAchievements);
    }
}

function updateNextAchievementHint() {
    const state = getGameState();
    const hintContainer = document.getElementById('nextAchievementHint');
    const hintText = document.getElementById('nextAchievementText');
    
    if (!hintContainer || !hintText) return;
    
    findNextAchievement(state).then(nextAchievement => {
        if (nextAchievement) {
            hintText.textContent = nextAchievement.description;
            hintContainer.classList.remove('hidden');
        } else {
            hintContainer.classList.add('hidden');
        }
    });
}

async function findNextAchievement(state) {
    const { tieredAchievements } = await import('./achievements.js');
    
    for (const [name, tiers] of Object.entries(tieredAchievements)) {
        for (const tierData of tiers) {
            const currentTier = state.achievementsTiers[name] ? state.achievementsTiers[name][0] : null;
            const tierIndex = ['bronze', 'silver', 'gold', 'platinum'].indexOf(tierData.tier);
            const currentIndex = currentTier ? ['bronze', 'silver', 'gold', 'platinum'].indexOf(currentTier) : -1;
            
            if (tierIndex > currentIndex) {
                if (tierData.condition) {
                    return {
                        name,
                        tier: tierData.tier,
                        description: tierData.description
                    };
                }
            }
        }
    }
    
    return null;
}

function setupVictoryScreenListeners(modal) {
    const playAgainBtn = document.getElementById('victoryPlayAgain');
    if (playAgainBtn) {
        playAgainBtn.onclick = () => {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
            startNewGame();
        };
    }
    
    const closeBtn = document.getElementById('victoryClose');
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
            startNewGame();
        };
    }
    
    const shareWhatsApp = document.getElementById('shareWhatsApp');
    const shareFacebook = document.getElementById('shareFacebook');
    const copyResult = document.getElementById('copyResult');
    
    if (shareWhatsApp) {
        shareWhatsApp.onclick = () => shareToWhatsApp();
    }
    
    if (shareFacebook) {
        shareFacebook.onclick = () => shareToFacebook();
    }
    
    if (copyResult) {
        copyResult.onclick = () => copyResultToClipboard();
    }
    
    const escListener = (e) => {
        if (e.key === 'Escape') {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
            document.removeEventListener('keydown', escListener);
        }
    };
    document.addEventListener('keydown', escListener);
}

function shareToWhatsApp() {
    const shareText = generateShareText();
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
}

function shareToFacebook() {
    const shareText = generateShareText();
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
}

async function copyResultToClipboard() {
    const shareText = generateShareText();
    try {
        await navigator.clipboard.writeText(shareText);
        
        const copyBtn = document.getElementById('copyResult');
        if (copyBtn) {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<span class="share-icon">✅</span> Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        }
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
}

function generateShareText() {
    const state = getGameState();
    const perfectGames = state.stats.perfectGames || 0;
    
    let text = `🎉 Just won a game in GuessRush! 🎉\n`;
    text += `Perfect Games: ${perfectGames} ⭐\n`;
    text += `Can you beat my score? Play now!\n`;
    text += `🔗 ${window.location.href}`;
    
    return text;
}

function updateGameOverScreenContent(gameData) {
    const state = getGameState();
    const playerInfoLine = document.getElementById('playerInfoLineGameOver');
    if (playerInfoLine) {
        const playerName = (window.localStorage && localStorage.getItem('guessRushPlayerName')) || state.playerName || '';
        const initials = playerName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
        const tierOrder = ['platinum','gold','silver','bronze'];
        let highestTier = 'bronze';
        if (state.achievementsTiers) {
            for (const tier of tierOrder) {
                if (Object.values(state.achievementsTiers).some(arr => arr.includes(tier))) {
                    highestTier = tier;
                    break;
                }
            }
        }
        playerInfoLine.innerHTML = `
            <span class="player-avatar player-tier-${highestTier}" style="width:2em;height:2em;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:#ececec;font-weight:700;font-size:1.1em;">${initials}</span>
            <span class="player-name" style="font-weight:600;">${playerName}</span>
            <span class="player-tier-badge ${highestTier}" style="padding:0.18em 0.7em;border-radius:1em;font-size:0.98em;font-weight:500;background:var(--tier-${highestTier},#eee);color:#333;">${highestTier.charAt(0).toUpperCase() + highestTier.slice(1)}</span>
        `;
    }
    const targetNumber = document.getElementById('targetNumber');
    if (targetNumber) {
        targetNumber.textContent = gameData.targetNumber || '?';
    }
    
    const gameOverAttempts = document.getElementById('gameOverAttempts');
    const gameOverTime = document.getElementById('gameOverTime');
    const gameOverMode = document.getElementById('gameOverMode');
    const gameOverSubtitle = document.getElementById('gameOverSubtitle');
    
    if (gameOverAttempts) gameOverAttempts.textContent = gameData.numGuesses || 0;
    if (gameOverTime) gameOverTime.textContent = `${gameData.winTime || 0} sec`;
    if (gameOverMode) {
        const modeName = gameData.mode ? gameData.mode.charAt(0).toUpperCase() + gameData.mode.slice(1) : 'Classic';
        gameOverMode.textContent = modeName;
    }
    
    if (gameOverSubtitle) {
        const modeName = gameData.mode ? gameData.mode.charAt(0).toUpperCase() + gameData.mode.slice(1) : '';
        const diffName = gameData.difficulty ? gameData.difficulty.charAt(0).toUpperCase() + gameData.difficulty.slice(1) : '';
        let subtitle = `${modeName} Mode – ${diffName}`;
        if (gameData.usedHelp) subtitle += ' – Hints Used';
        else subtitle += ' – No Hints Used';
        gameOverSubtitle.textContent = subtitle;
    }
    
    updateNearMissAnalysis(gameData);

    const feedbackElement = document.getElementById('personalizedFeedbackGameOver');
    if (feedbackElement) {
        const guessHistory = gameData.guessHistory || [];
        const targetNumber = gameData.targetNumber;
        
        let feedbackMessage = '';
        if (guessHistory.length > 0 && targetNumber) {
            const lastGuess = guessHistory[guessHistory.length - 1];
            const difference = Math.abs(lastGuess.value - targetNumber);
            
            if (difference <= 2) {
                feedbackMessage = '😱 So close! You were almost there!';
            } else if (difference <= 5) {
                feedbackMessage = '😅 Almost got it! That was close!';
            } else if (difference <= 10) {
                feedbackMessage = '🤔 Good effort! You were on the right track!';
            } else {
                feedbackMessage = '💪 Keep trying! You\'ll get it next time!';
            }
        } else {
            feedbackMessage = '💪 Don\'t give up! Try again!';
        }
        
        feedbackElement.textContent = feedbackMessage;
    }

    const selfComparison = document.getElementById('selfComparisonGameOver');
    if (selfComparison) {
        const state = getGameState();
        const mode = gameData.mode;
        let score = (typeof gameData.score === 'number' && !isNaN(gameData.score)) ? gameData.score : 0;
        let bestScore = null;
        if (state.stats && state.stats.bestByMode && mode && state.stats.bestByMode[mode] !== undefined && state.stats.bestByMode[mode] !== null && state.stats.bestByMode[mode] !== Infinity) {
            bestScore = state.stats.bestByMode[mode];
        }
        if (bestScore !== null && bestScore !== undefined && !isNaN(bestScore)) {
            if (score > bestScore) {
                selfComparison.innerHTML = `<span class='arrow-best'>⭐</span> <b>New Personal Best!</b> <span style='color:#28a745;'>(+${score - bestScore})</span>`;
            } else if (score === bestScore) {
                selfComparison.innerHTML = `<span class='arrow-best'>⭐</span> <b>Tied Personal Best!</b>`;
            } else {
                const diff = bestScore - score;
                selfComparison.innerHTML = `<span class='arrow-down'>↓</span> <span>Best: <b>${bestScore}</b></span> ${(!isNaN(diff) ? `<span style='color:#dc3545;'>(-${diff})</span>` : '')}`;
            }
        } else {
            selfComparison.innerHTML = `<span>First game in this mode!</span>`;
        }
    }
}

function updateNearMissAnalysis(gameData) {
    const nearMissContainer = document.getElementById('nearMissAnalysis');
    const nearMissText = document.getElementById('nearMissText');
    
    if (!nearMissContainer || !nearMissText) return;
    
    const guessHistory = gameData.guessHistory || [];
    const targetNumber = gameData.targetNumber;
    
    if (!targetNumber || guessHistory.length === 0) {
        nearMissContainer.classList.add('hidden');
        return;
    }
    
    let closestGuess = null;
    let minDifference = Infinity;
    
    guessHistory.forEach(guess => {
        const difference = Math.abs(guess.value - targetNumber);
        if (difference < minDifference) {
            minDifference = difference;
            closestGuess = guess;
        }
    });
    
    const range = gameData.maxRange - gameData.minRange;
    const nearMissThreshold = Math.max(5, Math.floor(range * 0.1));
    
    if (minDifference <= nearMissThreshold && closestGuess) {
        nearMissContainer.classList.remove('hidden');
        
        let analysisText = '';
        if (minDifference <= 2) {
            analysisText = `You were only ${minDifference} away! That's incredibly close!`;
        } else if (minDifference <= 5) {
            analysisText = `You were ${minDifference} numbers away. Almost got it!`;
        } else if (minDifference <= 10) {
            analysisText = `You were ${minDifference} numbers away. Good effort!`;
        } else {
            analysisText = `You were ${minDifference} numbers away. Keep trying!`;
        }
        
        if (closestGuess.value < targetNumber) {
            analysisText += ' The number was higher than your closest guess.';
        } else {
            analysisText += ' The number was lower than your closest guess.';
        }
        
        nearMissText.textContent = analysisText;
    } else {
        nearMissContainer.classList.add('hidden');
    }
}

function setupGameOverScreenListeners(modal) {
    const tryAgainBtn = document.getElementById('gameOverPlayAgain');
    if (tryAgainBtn) {
        tryAgainBtn.onclick = () => {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
            startNewGame();
        };
    }
    
    const closeBtn = document.getElementById('gameOverClose');
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
            startNewGame();
        };
    }
    
    const shareDefeatWhatsApp = document.getElementById('shareDefeatWhatsApp');
    const shareDefeatFacebook = document.getElementById('shareDefeatFacebook');
    const copyDefeatResult = document.getElementById('copyDefeatResult');
    
    if (shareDefeatWhatsApp) {
        shareDefeatWhatsApp.onclick = () => shareDefeatToWhatsApp();
    }
    
    if (shareDefeatFacebook) {
        shareDefeatFacebook.onclick = () => shareDefeatToFacebook();
    }
    
    if (copyDefeatResult) {
        copyDefeatResult.onclick = () => copyDefeatResultToClipboard();
    }
    
    const escListener = (e) => {
        if (e.key === 'Escape') {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
            document.removeEventListener('keydown', escListener);
        }
    };
    document.addEventListener('keydown', escListener);
}

function shareDefeatToWhatsApp() {
    const shareText = generateDefeatShareText();
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
}

function shareDefeatToFacebook() {
    const shareText = generateDefeatShareText();
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
}

async function copyDefeatResultToClipboard() {
    const shareText = generateDefeatShareText();
    try {
        await navigator.clipboard.writeText(shareText);
        const copyBtn = document.getElementById('copyDefeatResult');
        if (copyBtn) {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<span class="share-icon">✅</span> Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        }
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
}

function generateDefeatShareText() {
    const state = getGameState();
    const perfectGames = state.stats.perfectGames || 0;
    
    const defeatMessages = [
        "😅 Just lost a game in GuessRush! The number was right there...",
        "🤦‍♂️ Epic fail in GuessRush! Can you do better?",
        "😤 Lost again in GuessRush! This game is harder than it looks!",
        "🎯 So close yet so far in GuessRush! The number was teasing me!",
        "💀 Another defeat in GuessRush! My guessing skills need work!",
        "😵‍💫 Lost in GuessRush! The number was playing hide and seek!",
        "🤡 Epic guessing fail in GuessRush! Can you beat my record?",
        "😭 Defeated by a random number in GuessRush! The struggle is real!"
    ];
    
    const randomMessage = defeatMessages[Math.floor(Math.random() * defeatMessages.length)];
    
    let text = `${randomMessage}\n`;
    text += `Perfect Games: ${perfectGames} ⭐\n`;
    text += `Think you can do better? Try it!\n`;
    text += `🔗 ${window.location.href}`;
    
    return text;
} 

async function showNearAchievementTracker(type, gameData) {
    const panel = document.getElementById(type === 'Victory' ? 'nearAchievementVictory' : 'nearAchievementGameOver');
    if (!panel) return;
    panel.innerHTML = '';
    const state = getGameState();
    const { tieredAchievements } = await import('./achievements.js');
    const tierOrder = ['bronze','silver','gold','platinum'];
    for (const [name, tiers] of Object.entries(tieredAchievements)) {
        for (let i = 0; i < tiers.length; i++) {
            const tierData = tiers[i];
            const currentTier = state.achievementsTiers[name] ? state.achievementsTiers[name][0] : null;
            const tierIndex = tierOrder.indexOf(tierData.tier);
            const currentIndex = currentTier ? tierOrder.indexOf(currentTier) : -1;
            if (tierIndex > currentIndex) {
                let near = false, needed = null;
                if (name === 'Total Wins' && state.stats && state.stats.gamesWon !== undefined) {
                    const winsNeeded = [1,10,25,50][tierIndex] - state.stats.gamesWon;
                    if (winsNeeded > 0 && winsNeeded <= 2) {
                        near = true; needed = winsNeeded;
                    }
                } else if (name === 'Perfect Game' && state.stats && state.stats.perfectGames !== undefined) {
                    const perfectNeeded = [1,3,5,10][tierIndex] - state.stats.perfectGames;
                    if (perfectNeeded > 0 && perfectNeeded <= 2) {
                        near = true; needed = perfectNeeded;
                    }
                } else if (name === 'Streak Master' && state.streakCurrent !== undefined) {
                    const streakNeeded = [1,4,8,12][tierIndex] - state.streakCurrent;
                    if (streakNeeded > 0 && streakNeeded <= 2) {
                        near = true; needed = streakNeeded;
                    }
                }
                if (near) {
                    panel.innerHTML = `<span class='hint-icon'>💡</span> <span>Only <span class='hint-number'>${needed}</span> more to unlock <b>${name} (${tierData.tier.charAt(0).toUpperCase() + tierData.tier.slice(1)})</b>!</span>`;
                    return;
                }
            }
        }
    }
    panel.innerHTML = '';
} 