import { getGameState, setGameState } from './state.js';
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
    startBlitzTimer as gameLogicStartBlitzTimer
} from './gameLogic.js';
import { updateDifficultySettings } from './difficulty.js';

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
    if (state.gameMode === 'blitz') {
        elements.chaosTimer.classList.remove('hidden');
        if (!state.blitzStarted) {
            elements.timeLeft.textContent = BLITZ_TIME_SEC;
        }
    } else if (state.gameMode === 'chaos' || state.gameMode === 'doublechaos') {
        if (state.chaosStarted) {
            elements.chaosTimer.classList.remove('hidden');
        } else {
            elements.chaosTimer.classList.add('hidden');
            elements.timeLeft.textContent = 15;
        }
    } else {
        elements.chaosTimer.classList.add('hidden');
    }
    updateDailyChallengeInfo(); 
    updateStatsDisplay();
    elements.difficulty.parentElement.style.display = '';
    const diffExp = document.getElementById('difficultyExplanation');
    if (diffExp) diffExp.style.display = '';
}

export function updateStatsDisplay() {
    const state = getGameState();
    const best = state.stats.bestScore;
    const bestByMode = state.stats.bestByMode;
    function showScore(val) { return !val || val === Infinity ? 0 : val; }
    let html = '';
    if (state.stats.gamesPlayed === 0) {
        html += `<div class="no-stats">No stats yet. Play a game to see your stats!</div>`;
    } else {
        html += `<p>Games Played: ${state.stats.gamesPlayed}</p> 
        <p>Games Won: ${state.stats.gamesWon}</p>
        <p>Win Rate: ${state.stats.gamesPlayed ? Math.round((state.stats.gamesWon / state.stats.gamesPlayed) * 100) : 0}%</p>
        <p>Total Guesses: ${state.stats.totalAttempts}</p> 
        <p>Best Score (All Modes): ${showScore(best)}</p>
        <div style="margin-top:0.5rem;">
            <b>Best Score in:</b>
            <ul style="margin:0.2rem 0 0 1.2rem;">
                <li>Classic: ${showScore(bestByMode.classic)}</li>
                <li>Chaos: ${showScore(bestByMode.chaos)}</li>
                <li>Math: ${showScore(bestByMode.math)}</li>
                <li>Daily: ${showScore(bestByMode.daily)}</li>
            </ul>
        </div>`;
    }
    const streak = state.stats.streak;
    if (streak && state.stats.gamesPlayed > 0) {
        html += `<div style="margin-top:1.2rem;">
            <b>Streak Mode Stats:</b>
            <ul style="margin:0.2rem 0 0 1.2rem;">
                <li>Games Played: ${streak.gamesPlayed}</li>
                <li>Games Won: ${streak.gamesWon}</li>
                <li>Best Streak: ${streak.bestStreak}</li>
            </ul>
        </div>`;
    }
    const stats = state.stats.dailyStats;
    if (stats && state.stats.gamesPlayed > 0) {
        html += `<div style="margin-top:1.2rem;">
            <b>Daily Challenge Stats:</b>
            <ul style="margin:0.2rem 0 0 1.2rem;">
                <li>Days Played: ${stats.daysPlayed}</li>
                <li>Days Won: ${stats.daysWon}</li>
                <li>Current Streak: ${stats.currentStreak}</li>
                <li>Max Streak: ${stats.maxStreak}</li>
            </ul>
        </div>`;
    }
    if (state.stats.gamesPlayed > 0) {
        html += `<div style="margin-top:1.2rem;"><b>Total Score:</b> <span>${state.stats.totalScore || 0}</span></div>`;
    }
    elements.statsDisplay.innerHTML = html;
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
    const stats = state.stats;
    if (!stats) return;
    const winRate = stats.gamesPlayed ? ((stats.gamesWon / stats.gamesPlayed) * 100).toFixed(1) : 0;
    const avgAttempts = stats.gamesWon ? (stats.totalAttempts / stats.gamesWon).toFixed(2) : 0;
    const avgTime = stats.avgWinTime ? stats.avgWinTime.toFixed(1) : 'N/A';
    let favMode = 'N/A', maxWins = 0;
    if (stats.modesWon) {
        for (const [mode, wins] of Object.entries(stats.modesWon)) {
            if (wins > maxWins) {
                favMode = mode;
                maxWins = wins;
            }
        }
    }
    const bestScore = (stats.bestScore === undefined || stats.bestScore === null || stats.bestScore === Infinity) ? 0 : stats.bestScore;
    let summaryTable = `<table style='width:100%;margin-top:1em;border-collapse:collapse;'>
        <tr style='background:#f0f0f0;'><th>Mode</th><th>Best Score</th></tr>`;
    if (stats.bestByMode) {
        for (const [mode, score] of Object.entries(stats.bestByMode)) {
            let show = (score === undefined || score === null || score === Infinity) ? 0 : score;
            summaryTable += `<tr><td>${mode}</td><td>${show}</td></tr>`;
        }
    }
    summaryTable += '</table>';
    const html = `
        <div><b>Win Rate:</b> ${winRate}%</div>
        <div><b>Avg Attempts to Win:</b> ${avgAttempts}</div>
        <div><b>Avg Win Time:</b> ${avgTime}</div>
        <div><b>Favorite Mode:</b> ${favMode}</div>
        <div><b>Best Score (All Modes):</b> ${bestScore}</div>
        <hr style='margin:1em 0;'>
        <div><b>Summary Table:</b></div>
        ${summaryTable}
    `;
    const statsContent = document.getElementById('personalStatsContent');
    if (statsContent) statsContent.innerHTML = html;
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
            modesWon: {}
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
    setGuessHistory(getGuessHistory());
    updateGuessHistoryDisplay();
    updateUI();
    const state = getGameState();
    if (state.gameMode === 'blitz' && getGuessHistory().length === 1) {
        gameLogicStartBlitzTimer();
    }
    if (result) {
        displayFeedbackMessage(result.message, result.type);
        if (!(result.type === 'error' && result.message && result.message.includes('valid number between'))) {
            elements.guessInput.value = '';
        }
        if (state.gameMode === 'streak' && result.continueStreak) {
            showVictoryAnimation();
            showShareResultBtn(true, {
                win: true,
                numGuesses: result.numGuesses,
                mode: result.mode,
                time: result.winTime
            });
            setTimeout(() => {
                import('./gameLogic.js').then(mod => {
                    mod.startNextStreakRound();
                    updateUI();
                });
            }, 1000);
            return;
        }
        if (result.type === 'success' || (result.type === 'error' && result.message && !result.message.includes('valid number between'))) {
            if (result.type === 'success') {
                showVictoryAnimation();
                showShareResultBtn(true, {
                    win: true,
                    numGuesses: result.numGuesses,
                    mode: result.mode,
                    time: result.winTime
                });
            } else if (result.type === 'error') {
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
    const chaosTimer = document.getElementById('chaosTimer');
    const timeLeftElem = document.getElementById('timeLeft');
    if (chaosTimer) chaosTimer.classList.add('hidden');
    if (timeLeftElem) timeLeftElem.textContent = BLITZ_TIME_SEC;
    const result = gameLogicStartNewGame();
    if (result) {
        if (result.type === 'daily_already_played') {
            showDailyResultModal(result.result);
            elements.guessInput.disabled = true;
            elements.submitGuess.disabled = true;
            elements.helpButton.disabled = true;
            return;
        }
        elements.guessInput.value = '';
        elements.feedbackMessage.textContent = '';
        elements.helpButton.disabled = false;
        elements.chaosTimer.classList.add('hidden');
        setGuessHistory([]);
        updateGuessHistoryDisplay();
        const botHistoryDiv = document.getElementById('botGuessHistory');
        if (botHistoryDiv) botHistoryDiv.innerHTML = '';
        updateUI();
        const state = getGameState();
        if (state.gameMode === 'doublechaos') {
            gameLogicStartDoubleChaosTimer();
        }
    }
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

window.updateUI = updateUI; 