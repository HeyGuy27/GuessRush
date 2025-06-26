import { getGameState, setGameState, _internalGameState } from './state.js';
import { unlockAchievement, tieredAchievements } from './achievements.js';
import { getItem, setItem } from './storage.js';
import { CHAOS_INTERVAL_MS, BLITZ_TIME_SEC } from './config.js';
import { updateDifficultySettings } from './difficulty.js';

let guessHistory = [];
/**
 * Handle a player guess, including validation, feedback, and state updates.
 * @returns {object} Result object with type/message and additional info.
 */
export function handleGuess() {
    const state = getGameState();
    if ((state.gameMode === 'bot' || state.gameMode === 'breakthebot') && state.botTurn) {
        return { type: 'error', message: "Wait for your turn!" };
    }
    if (state.gameMode === 'doublechaos' && !state.chaosStarted) {
        setGameState(state => ({ ...state, chaosStarted: true }));
        startDoubleChaosTimer();
    }
    if (state.gameMode === 'blitz' && !state.blitzStarted) {
        setGameState(state => ({ ...state, blitzStarted: true }));
        startBlitzTimer();
    }
    if (state.gameMode === 'chaos' && !state.chaosStarted) {
        startChaosTimer();
        setGameState(state => ({ ...state, chaosStarted: true }));
    }
    const guess = parseInt(document.getElementById('guessInput').value);
    const number = state.currentNumber;
    const min = state.minRange;
    const max = state.maxRange;
    const range = max - min;
    if (state.gameMode !== 'breakthebot' && state.attemptsLeft <= 0) {
        return { type: 'error', message: 'No attempts left! Start a new game.' };
    }
    if (isNaN(guess) || guess < min || guess > max) {
        return { type: 'error', message: `Please enter a valid number between ${min} and ${max}!` };
    }
    setGameState(state => ({
        ...state,
        attemptsLeft: state.gameMode === 'breakthebot' ? state.attemptsLeft : state.attemptsLeft - 1,
        stats: {
            ...state.stats,
            totalAttempts: state.stats.totalAttempts + 1
        }
    }));
    let guessType = '';
    let feedback = '';
    let hot = false, cold = false;
    if (guess === number) {
        guessType = 'correct';
        if (state.gameMode === 'bot') {
            setGameState(state => ({ ...state, botTurn: false }));
        }
        if (state.gameMode === 'streak') {
            return handleStreakWin();
        } else {
            return handleWin();
        }
    } else {
        const diff = Math.abs(guess - number);
        let direction = '';
        if (guess < number && guess < max) direction = 'higher';
        else if (guess > number && guess > min) direction = 'lower';
        if (state.gameMode === 'reverse') {
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
            } else if (state.gameMode === 'math') {
                const mathHint = getMathHint(number);
                feedback = direction ? `${mathHint}. Try ${direction}!` : mathHint;
            } else {
                feedback = direction ? `Try ${direction}!` : 'Try again!';
            }
        }
        const newState = getGameState();
        if (newState.gameMode === 'streak' && newState.attemptsLeft === 0) {
            return handleStreakLoss();
        } else if (newState.attemptsLeft === 0) {
            if (newState.gameMode === 'sudden') {
                setTimeout(() => {
                    startNewGame();
                }, 1500); 
            }
            return handleLoss();
        }
        if (newState.gameMode === 'bot' || newState.gameMode === 'breakthebot') {
            setGameState(state => ({ ...state, botTurn: true }));
            setTimeout(() => {
                if (newState.gameMode === 'breakthebot') {
                    breakTheBotTakeTurn();
                } else {
                    botTakeTurn();
                }
            }, 800);
        }
    }
    guessHistory.push({ value: guess, type: guessType });
    const realState = _internalGameState();
    if (guess === number) {
        const numGuesses = guessHistory.length;
        if (numGuesses === state.maxAttempts) {
            unlockAchievement(realState, 'Never Give Up', 'bronze');
        }
        if (guessHistory.length >= 4) {
            const last3 = guessHistory.slice(-4, -1);
            if (last3.every(g => g.type === 'cold')) {
                unlockAchievement(realState, 'Comeback King', 'bronze');
            }
        }
    }
    return { type: 'hint', message: feedback, hot, cold };
}

export function handleWin() {
    const state = getGameState();
    const realState = _internalGameState();
    setGameState(state => ({
        ...state,
        stats: {
            ...state.stats,
            gamesPlayed: state.stats.gamesPlayed + 1,
            gamesWon: state.stats.gamesWon + 1
        }
    }));

    if (state.gameMode === 'blitz') {
        if (state.blitzInterval) clearInterval(state.blitzInterval);
        if (state.blitzTimeout) clearTimeout(state.blitzTimeout);
        const chaosTimer = document.getElementById('chaosTimer');
        if (chaosTimer) chaosTimer.classList.add('hidden');
    }

    if (state.gameMode === 'bot' || state.gameMode === 'breakthebot') {
        if (state.difficulty === 'easy') unlockAchievement(realState, 'Bot Buster (Easy)', 'bronze');
        if (state.difficulty === 'medium') unlockAchievement(realState, 'Bot Buster (Medium)', 'silver');
        if (state.difficulty === 'hard') unlockAchievement(realState, 'Bot Buster (Hard)', 'gold');
        if (state.difficulty === 'chaos') unlockAchievement(realState, 'Bot Buster (Chaos)', 'platinum');
    }

    if (state.gameMode === 'doublechaos') {
        if (state.difficulty === 'easy') unlockAchievement(realState, 'Into the Storm', 'bronze');
        if (state.difficulty === 'medium') unlockAchievement(realState, 'Chaos Handler', 'silver');
        if (state.difficulty === 'hard') unlockAchievement(realState, 'Master of Mayhem', 'gold');
        if (state.difficulty === 'chaos') unlockAchievement(realState, 'Lord of the Double Chaos', 'platinum');
    }

    const numGuesses = realState.maxAttempts - realState.attemptsLeft;
    const winTime = realState.startTime ? Math.round((Date.now() - realState.startTime) / 1000) : 0;
    const usedHelp = realState.usedHelp;
    const mode = realState.gameMode;
    const range = realState.maxRange - realState.minRange;
    const difficulty = realState.difficulty;
    const score = calculateScore({ numGuesses, winTime, usedHelp, difficulty });

    if (state.gameMode === 'blitz') {
        if (winTime < 60) unlockAchievement(realState, 'Blitz Champion', 'bronze');
        if (winTime < 20) unlockAchievement(realState, 'Blitz Champion', 'silver');
        if (winTime < 10) unlockAchievement(realState, 'Blitz Champion', 'gold');
        if (numGuesses === 1 && winTime < 60) unlockAchievement(realState, 'Blitz Champion', 'platinum');
    }

    setGameState(state => {
        const prevBest = state.stats.bestScore;
        const prevBestMode = state.stats.bestByMode[mode];
        const prevAvg = state.stats.avgWinTime || 0;
        const gamesWon = state.stats.gamesWon + 1;
        const prevModesWon = state.stats.modesWon || {};
        const modeWins = (prevModesWon[mode] || 0) + 1;
        return {
            ...state,
            stats: {
                ...state.stats,
                bestScore: Math.max(prevBest === Infinity ? 0 : prevBest, score),
                bestByMode: {
                    ...state.stats.bestByMode,
                    [mode]: Math.max(prevBestMode === Infinity ? 0 : prevBestMode, score)
                },
                totalScore: (state.stats.totalScore || 0) + score,
                avgWinTime: ((prevAvg * (gamesWon - 1)) + winTime) / gamesWon,
                modesWon: {
                    ...prevModesWon,
                    [mode]: modeWins
                }
            }
        };
    });

    // Unlock Total Wins achievement tiers
    const totalWins = _internalGameState().stats.gamesWon;
    if (totalWins >= 50) unlockAchievement(realState, 'Total Wins', 'platinum');
    else if (totalWins >= 25) unlockAchievement(realState, 'Total Wins', 'gold');
    else if (totalWins >= 10) unlockAchievement(realState, 'Total Wins', 'silver');
    else if (totalWins >= 1) unlockAchievement(realState, 'Total Wins', 'bronze');

    if (!realState.achievements.has('First Win')) {
        unlockAchievement(realState, 'First Win', 'bronze');
    }
    // Lightning Fast
    if (numGuesses < 6) unlockAchievement(realState, 'Lightning Fast', 'bronze');
    if (numGuesses < 4) unlockAchievement(realState, 'Lightning Fast', 'silver');
    if (numGuesses === 1) unlockAchievement(realState, 'Lightning Fast', 'gold');
    // Persistent
    if (numGuesses === realState.maxAttempts) unlockAchievement(realState, 'Persistent', 'bronze');
    if (numGuesses >= Math.floor(0.9 * realState.maxAttempts)) unlockAchievement(realState, 'Persistent', 'silver');
    if (numGuesses === realState.maxAttempts - 1) unlockAchievement(realState, 'Persistent', 'gold');
    if (numGuesses === realState.maxAttempts && !usedHelp) unlockAchievement(realState, 'Persistent', 'platinum');
    // Help Seeker
    if (usedHelp) unlockAchievement(realState, 'Help Seeker', 'bronze');
    // Range Master
    if (range >= 250) unlockAchievement(realState, 'Range Master', 'bronze');
    if (range >= 500) unlockAchievement(realState, 'Range Master', 'silver');
    if (range >= 1000) unlockAchievement(realState, 'Range Master', 'gold');
    if (range >= 2000) unlockAchievement(realState, 'Range Master', 'platinum');
    // Speed Demon
    if (winTime !== null && winTime < 30) unlockAchievement(realState, 'Speed Demon', 'bronze');
    if (winTime !== null && winTime < 20) unlockAchievement(realState, 'Speed Demon', 'silver');
    if (winTime !== null && winTime < 10) unlockAchievement(realState, 'Speed Demon', 'gold');
    updateDailyStats(true);

    if (realState.gameMode === 'daily') {
        const result = {
            win: true,
            attempts: numGuesses,
            number: realState.currentNumber,
            time: winTime
        };
        saveDailyResult(result);
        return { type: 'daily_already_played', result };
    }

    return {
        type: 'success',
        message: `Congratulations! You guessed the number!<br><b>Score: ${score}</b>`,
        numGuesses,
        winTime,
        mode: realState.gameMode,
        score
    };
}

export function handleLoss() {
    const state = getGameState();
    if (state.gameMode === 'blitz') {
        if (state.blitzInterval) clearInterval(state.blitzInterval);
        if (state.blitzTimeout) clearTimeout(state.blitzTimeout);
        const chaosTimer = document.getElementById('chaosTimer');
        if (chaosTimer) chaosTimer.classList.add('hidden');
    }
    setGameState(state => ({
        ...state,
        stats: {
            ...state.stats,
            gamesPlayed: state.stats.gamesPlayed + 1
        }
    }));
    updateDailyStats(false);

    if (state.gameMode === 'daily') {
        const result = {
            win: false,
            attempts: state.maxAttempts,
            number: state.currentNumber,
            time: state.startTime ? Math.round((Date.now() - state.startTime) / 1000) : null
        };
        saveDailyResult(result);
        return { type: 'daily_already_played', result };
    }

    return {
        type: 'error',
        message: `Game Over! The number was ${state.currentNumber}`,
        numGuesses: state.maxAttempts,
        mode: state.gameMode,
        time: state.startTime ? Math.round((Date.now() - state.startTime) / 1000) : null
    };
}

export function handleStreakWin() {
    let state = getGameState();

    if (!state.stats.streak) {
        setGameState(state => ({
            ...state,
            stats: {
                ...state.stats,
                streak: { current: 0, max: 0, gamesPlayed: 0, gamesWon: 0, bestStreak: 0 }
            }
        }));
        state = getGameState();
    }

    if (!state.streakCurrent) setGameState(state => ({ ...state, streakCurrent: 0 }));
    if (!state.streakMaxRange) setGameState(state => ({ ...state, streakMaxRange: 100 }));
    
    setGameState(state => ({
        ...state,
        streakCurrent: state.streakCurrent + 1,
        stats: {
            ...state.stats,
            streak: {
                ...state.stats.streak,
                gamesPlayed: state.stats.streak.gamesPlayed + 1
            }
        }
    }));
    
    const streak = getGameState().streakCurrent;
    const tiers = tieredAchievements['Streak Master'];
    let newTier = null;
    for (let i = tiers.length - 1; i >= 0; i--) {
        if (tiers[i].condition(streak)) {
            newTier = tiers[i].tier;
            break;
        }
    }
    const internalState = _internalGameState();
    const currentTiers = internalState.achievementsTiers['Streak Master'] || [];
    const tierNames = ['bronze', 'silver', 'gold', 'platinum'];
    const currentTierIndex = currentTiers.length > 0 ? tierNames.indexOf(currentTiers[0]) : -1;
    const newTierIndex = newTier ? tierNames.indexOf(newTier) : -1;
    if (newTier && newTierIndex > currentTierIndex) {
        unlockAchievement(internalState, 'Streak Master', newTier);
    }
    
    const newState = getGameState();
    if (newState.streakCurrent > newState.stats.streak.bestStreak) {
        setGameState(state => ({
            ...state,
            stats: {
                ...state.stats,
                streak: {
                    ...state.stats.streak,
                    bestStreak: newState.streakCurrent
                }
            }
        }));
    }
    
    if (newState.streakCurrent === 12) {
        setGameState(state => ({
            ...state,
            stats: {
                ...state.stats,
                streak: {
                    ...state.stats.streak,
                    gamesWon: state.stats.streak.gamesWon + 1
                },
                gamesPlayed: state.stats.gamesPlayed + 1
            }
        }));
        
        unlockAchievement(newState, 'Perfect Streak', 'bronze');
        
        return {
            type: 'success',
            message: 'Amazing! You completed the Streak Mode! 🏆',
            completed: true
        };
    }
    
    setGameState(state => ({
        ...state,
        streakMaxRange: state.streakMaxRange + 50,
        maxRange: state.streakMaxRange + 50,
        maxAttempts: state.maxAttempts - 1,
        attemptsLeft: state.maxAttempts - 1
    }));
    
    const updatedState = getGameState();
    return {
        type: 'success',
        message: `Correct! Streak: <b>${updatedState.streakCurrent}</b> / 12<br>New range: 1-${updatedState.maxRange}<br>Guesses left: ${updatedState.attemptsLeft}`,
        continueStreak: true
    };
}

export function handleStreakLoss() {
    const state = getGameState();
    
    if (!state.stats.streak) {
        setGameState(state => ({
            ...state,
            stats: {
                ...state.stats,
                streak: { current: 0, max: 0, gamesPlayed: 0, gamesWon: 0, bestStreak: 0 }
            }
        }));
    }
    
    if (state.streakCurrent > state.stats.streak.bestStreak) {
        setGameState(state => ({
            ...state,
            stats: {
                ...state.stats,
                streak: {
                    ...state.stats.streak,
                    bestStreak: state.streakCurrent
                }
            }
        }));
    }
    
    return {
        type: 'error',
        message: `Game Over! Your streak: <b>${state.streakCurrent}</b>`
    };
}

export function handleHelp() {
    const state = getGameState();
    if (state.usedHelp) return { type: 'error', message: 'Help already used!' };
    
    setGameState(state => ({ ...state, usedHelp: true }));
    
    const range = state.maxRange - state.minRange;
    const hintRange = Math.floor(range * 0.2);
    const lowerBound = Math.max(state.minRange, state.currentNumber - hintRange);
    const upperBound = Math.min(state.maxRange, state.currentNumber + hintRange);
    
    setGameState(state => ({
        ...state,
        stats: {
            ...state.stats,
            hintsUsed: (state.stats.hintsUsed || 0) + 1
        }
    }));
    
    return {
        type: 'hint',
        message: `The number is between ${lowerBound} and ${upperBound}`
    };
}

export function generateNumber() {
    const state = getGameState();
    if (state.gameMode === 'daily') {
        return generateDailyNumber();
    }
    if (state.gameMode === 'streak') {
        return Math.floor(Math.random() * (state.streakMaxRange - state.minRange + 1)) + state.minRange;
    }
    return Math.floor(Math.random() * (state.maxRange - state.minRange + 1)) + state.minRange;
}

export function generateDailyNumber() {
    const state = getGameState();
    const today = new Date().toDateString();
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
        hash = ((hash << 5) - hash) + today.charCodeAt(i);
        hash = hash & hash;
    }
    return state.minRange + (Math.abs(hash) % (state.maxRange - state.minRange + 1));
}

export function isPrime(num) {
    if (num <= 1) return false;
    if (num <= 3) return true;
    if (num % 2 === 0 || num % 3 === 0) return false;
    for (let i = 5; i * i <= num; i += 6) {
        if (num % i === 0 || num % (i + 2) === 0) return false;
    }
    return true;
}

export function getDivisors(num) { 
    const divisors = []; 
    for (let i = 1; i <= num; i++) {
        if (num % i === 0) divisors.push(i);
    }
    return divisors;
}

export function getMathHint(number) {
    const state = getGameState();
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
    return hints.length > 0 ? hints[Math.floor(Math.random() * hints.length)] : "This is a number between " + state.minRange + " and " + state.maxRange;
}

export function calculateScore({numGuesses, winTime, usedHelp, difficulty}) {
    let score = 1000;
    score -= 50 * (numGuesses - 1);
    score -= 2 * winTime;
    if (usedHelp) score -= 100;
    let multiplier = 1;
    if (difficulty === 'medium') multiplier = 1.2;
    else if (difficulty === 'hard') multiplier = 1.4;
    else if (difficulty === 'chaos') multiplier = 1.6;
    score = Math.round(score * multiplier);
    return Math.max(0, score);
}

export function startNewGame() {
    setGameState(state => {
        if (state.chaosCountdownInterval) clearInterval(state.chaosCountdownInterval);
        if (state.chaosInterval) clearInterval(state.chaosInterval);
        if (state.chaosTimeout) clearTimeout(state.chaosTimeout);
        let minRange = 1, maxRange = 100, maxAttempts = 12;
        if (state.gameMode === 'doublechaos') {
            if (state.difficulty === 'easy') { maxRange = 200; maxAttempts = 12; }
            else if (state.difficulty === 'medium') { maxRange = 400; maxAttempts = 10; }
            else if (state.difficulty === 'hard') { maxRange = 600; maxAttempts = 8; }
            else if (state.difficulty === 'chaos') { maxRange = 1000; maxAttempts = 6; }
        } else if (state.gameMode === 'breakthebot') {
            maxAttempts = Infinity;
        } else {
            if (state.difficulty === 'easy') { maxRange = 100; maxAttempts = 12; }
            else if (state.difficulty === 'medium') { maxRange = 250; maxAttempts = 10; }
            else if (state.difficulty === 'hard') { maxRange = 500; maxAttempts = 8; }
            else if (state.difficulty === 'chaos') { maxRange = 1000; maxAttempts = 5; }
        }
        let botMin = 0, botMax = 0;
        if (state.gameMode === 'breakthebot') {
            botMin = minRange;
            botMax = maxRange;
        }
        return {
            ...state,
            startTime: Date.now(),
            chaosStarted: false,
            usedHelp: false,
            achievementsEarnedThisRound: [],
            chaosCountdownInterval: null,
            chaosInterval: null,
            chaosTimeout: null,
            botTurn: state.gameMode === 'bot',
            botGuessedNumbers: new Set(),
            botGuesses: [],
            minRange,
            maxRange,
            maxAttempts,
            attemptsLeft: maxAttempts,
            botMin,
            botMax
        };
    });
    if (window.updateUI) window.updateUI();
    const state = getGameState();
    if (state.gameMode === 'daily') {
        const result = getDailyResult();
        if (result) {
            return { type: 'daily_already_played', result };
        }
    }
    const newNumber = generateNumber();
    setGameState(state => ({ ...state, currentNumber: newNumber }));
    guessHistory = [];
    updateDifficultySettings();
    if (getGameState().gameMode === 'chaos') {
        const chaosTimer = document.getElementById('chaosTimer');
        const timeLeftElem = document.getElementById('timeLeft');
        if (chaosTimer) chaosTimer.classList.remove('hidden');
        if (timeLeftElem) timeLeftElem.textContent = 15;
    }
    return { type: 'new_game', number: newNumber };
}

export function startChaosTimer() {
    const state = getGameState();
    if (state.chaosInterval) clearInterval(state.chaosInterval);
    if (state.chaosCountdownInterval) clearInterval(state.chaosCountdownInterval);
    if (state.chaosTimeout) clearTimeout(state.chaosTimeout);

    let timeLeft = 15;
    const chaosTimer = document.getElementById('chaosTimer');
    const timeLeftElem = document.getElementById('timeLeft');
    if (timeLeftElem) timeLeftElem.textContent = timeLeft;

    // Timeout for game over
    let chaosTimeout = setTimeout(() => {
        handleLoss();
        if (chaosTimer) chaosTimer.classList.add('hidden');
    }, 15000);

    // Countdown interval for UI
    const countdownInterval = setInterval(() => {
        timeLeft--;
        if (timeLeftElem) timeLeftElem.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
        }
    }, 1000);

    // Number changing interval
    const chaosInterval = setInterval(() => {
        const newNumber = generateNumber();
        setGameState(state => ({ ...state, currentNumber: newNumber }));
        timeLeft = 15;
        if (timeLeftElem) timeLeftElem.textContent = timeLeft;
        clearTimeout(chaosTimeout);
        chaosTimeout = setTimeout(() => {
            handleLoss();
            if (chaosTimer) chaosTimer.classList.add('hidden');
        }, 15000);
    }, 15000);

    setGameState(state => ({
        ...state,
        chaosInterval,
        chaosCountdownInterval: countdownInterval,
        chaosTimeout
    }));
}

export function startDoubleChaosTimer() {
    const state = getGameState();
    if (!state.chaosStarted) return;
    if (state.chaosInterval) clearInterval(state.chaosInterval);
    if (state.chaosCountdownInterval) clearInterval(state.chaosCountdownInterval);

    let timeLeft = 15;
    const chaosTimer = document.getElementById('chaosTimer');
    const timeLeftElem = document.getElementById('timeLeft');
    if (chaosTimer) chaosTimer.classList.remove('hidden');
    if (timeLeftElem) timeLeftElem.textContent = timeLeft;

    function setNewRangeAndNumber() {
        const currentState = getGameState();
        let fullMin = 1, fullMax = 200, attempts = 12;
        if (currentState.difficulty === 'medium') { fullMax = 400; attempts = 10; }
        else if (currentState.difficulty === 'hard') { fullMax = 600; attempts = 8; }
        else if (currentState.difficulty === 'chaos') { fullMax = 1000; attempts = 6; }
        let min = Math.floor(Math.random() * (fullMax - fullMin - 10 + 1)) + fullMin;
        let max = Math.floor(Math.random() * (fullMax - min + 1)) + min;
        if (max - min < 10) max = min + 10;
        if (max > fullMax) max = fullMax;
        setGameState(state => ({
            ...state,
            minRange: min,
            maxRange: max,
            maxAttempts: attempts,
            currentNumber: Math.floor(Math.random() * (max - min + 1)) + min
        }));
        guessHistory = [];
        const feedbackElem = document.getElementById('feedbackMessage');
        if (feedbackElem) {
            feedbackElem.textContent = 'The range and number have changed!';
            feedbackElem.classList.add('slide-in');
            setTimeout(() => feedbackElem.classList.remove('slide-in'), 700);
        }
        if (window.updateUI) window.updateUI();
        const rangeElem = document.getElementById('numberRange');
        if (rangeElem) {
            rangeElem.classList.add('range-animate');
            setTimeout(() => rangeElem.classList.remove('range-animate'), 700);
        }
    }

    // Countdown interval for UI
    const countdownInterval = setInterval(() => {
        timeLeft--;
        if (timeLeftElem) timeLeftElem.textContent = timeLeft;
        if (timeLeft <= 0) {
            setNewRangeAndNumber();
            timeLeft = 15;
            if (timeLeftElem) timeLeftElem.textContent = timeLeft;
        }
    }, 1000);

    setGameState(state => ({
        ...state,
        chaosCountdownInterval: countdownInterval,
        chaosInterval: null // not used in doublechaos
    }));
}

export function startBlitzTimer() {
    const state = getGameState();
    if (state.blitzTimeout) clearTimeout(state.blitzTimeout);
    if (state.blitzInterval) clearInterval(state.blitzInterval);

    // Show the timer in the UI
    const chaosTimer = document.getElementById('chaosTimer');
    if (chaosTimer) chaosTimer.classList.remove('hidden');
    const timeLeftElem = document.getElementById('timeLeft');
    if (timeLeftElem) timeLeftElem.textContent = BLITZ_TIME_SEC;

    let timeLeft = BLITZ_TIME_SEC;
    const interval = setInterval(() => {
        timeLeft--;
        if (timeLeftElem) timeLeftElem.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(interval);
            if (chaosTimer) chaosTimer.classList.add('hidden');
            handleBlitzTimeout();
        }
    }, 1000);

    setGameState(state => ({
        ...state,
        blitzTimeout: setTimeout(() => {
            handleBlitzTimeout();
        }, BLITZ_TIME_SEC * 1000),
        blitzInterval: interval
    }));
}

export function handleBlitzTimeout() {
    const lossResult = handleLoss();
    const feedbackElem = document.getElementById('feedbackMessage');
    if (feedbackElem) {
        feedbackElem.textContent = "Time's up! You lost.";
        feedbackElem.className = 'error';
    }
    const guessInput = document.getElementById('guessInput');
    const submitGuess = document.getElementById('submitGuess');
    const helpButton = document.getElementById('helpButton');
    if (guessInput) guessInput.disabled = true;
    if (submitGuess) submitGuess.disabled = true;
    if (helpButton) helpButton.disabled = true;
    setTimeout(() => {
        import('./ui.js').then(mod => {
            mod.startNewGame();
        });
    }, 4000);
}

export function breakTheBotTakeTurn() {
    const state = getGameState();
    if (state.gameMode !== 'breakthebot' || state.botTurn === false) return;

    let botGuess;
    let tries = 0;
    const guessed = state.botGuessedNumbers instanceof Set ? state.botGuessedNumbers : new Set(state.botGuessedNumbers || []);
    const min = state.minRange;
    const max = state.maxRange;
    const number = state.currentNumber;
    let intendedGuess = null;
    function getAvailableNumbers() {
        const arr = [];
        for (let i = min; i <= max; i++) {
            if (!guessed.has(i)) arr.push(i);
        }
        return arr;
    }
    function getClosestAvailable(target, available) {
        if (available.length === 0) return null;
        return available.reduce((prev, curr) => Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev, available[0]);
    }
    const availableNumbers = getAvailableNumbers();
    if (availableNumbers.length === 0) return;
    if (state.difficulty === 'easy') {
        intendedGuess = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
    } else if (state.difficulty === 'medium') {
        if (Math.random() < 0.7) {
            intendedGuess = Math.floor((state.botMin + state.botMax) / 2);
        } else {
            intendedGuess = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
        }
    } else if (state.difficulty === 'hard') {
        if (Math.random() < 0.9) {
            intendedGuess = Math.floor((state.botMin + state.botMax) / 2);
        } else {
            intendedGuess = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
        }
    } else if (state.difficulty === 'chaos') {
        intendedGuess = Math.floor((state.botMin + state.botMax) / 2);
    }
    if (guessed.has(intendedGuess) || intendedGuess < min || intendedGuess > max) {
        botGuess = getClosestAvailable(intendedGuess, availableNumbers);
    } else {
        botGuess = intendedGuess;
    }
    setGameState(state => ({
        ...state,
        botGuessedNumbers: new Set([...guessed, botGuess]),
        botGuessCount: (state.botGuessCount || 0) + 1
    }));
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
    setGameState(state => ({
        ...state,
        botGuesses: [...(state.botGuesses || []), { value: botGuess, type: guessType }]
    }));
    if (['medium', 'hard', 'chaos'].includes(state.difficulty)) {
        if (botGuess < number) {
            setGameState(state => ({ ...state, botMin: botGuess + 1 }));
        } else if (botGuess > number) {
            setGameState(state => ({ ...state, botMax: botGuess - 1 }));
        }
    }
    if (botGuess === number) {
        setGameState(state => ({
            ...state,
            stats: {
                ...state.stats,
                gamesPlayed: state.stats.gamesPlayed + 1
            },
            botTurn: false
        }));
        const feedbackElem = document.getElementById('feedbackMessage');
        if (feedbackElem) {
            feedbackElem.textContent = "The bot found the number! You lost.";
            feedbackElem.className = 'error';
        }
        const guessInput = document.getElementById('guessInput');
        const submitGuess = document.getElementById('submitGuess');
        const helpButton = document.getElementById('helpButton');
        if (guessInput) guessInput.disabled = true;
        if (submitGuess) submitGuess.disabled = true;
        if (helpButton) helpButton.disabled = true;
        setTimeout(() => {
            import('./ui.js').then(mod => {
                mod.startNewGame();
            });
        }, 3000);
        return { type: 'bot_won', guess: botGuess };
    }
    setGameState(state => ({ ...state, botTurn: false }));
    return { type: 'bot_guess', guess: botGuess, feedback, guessType };
}

export function getTodayKey() {
    const today = new Date().toISOString().slice(0, 10);
    return `guessRushDaily_${today}`;
}

export function saveDailyResult(result) {
    setItem(getTodayKey(), result);
}

export function getDailyResult() {
    const data = getItem(getTodayKey());
    return data ? data : null;
}

export function showDailyResultMessage(result) {
    return {
        type: 'daily_result',
        result
    };
}

export function updateDailyStats(win) {
    const today = getTodayDateStr();
    const state = getGameState();
    const stats = state.stats.dailyStats;
    
    if (stats.lastWinDate !== today) {
        setGameState(state => ({
            ...state,
            stats: {
                ...state.stats,
                dailyStats: {
                    ...state.stats.dailyStats,
                    daysPlayed: state.stats.dailyStats.daysPlayed + 1
                }
            }
        }));
        
        if (win) {
            setGameState(state => ({
                ...state,
                stats: {
                    ...state.stats,
                    dailyStats: {
                        ...state.stats.dailyStats,
                        daysWon: state.stats.dailyStats.daysWon + 1,
                        currentStreak: (state.stats.dailyStats.lastWinDate && (new Date(today) - new Date(state.stats.dailyStats.lastWinDate) === 86400000)) 
                            ? state.stats.dailyStats.currentStreak + 1 
                            : 1,
                        lastWinDate: today
                    }
                }
            }));
            
            const newState = getGameState();
            if (newState.stats.dailyStats.currentStreak > newState.stats.dailyStats.maxStreak) {
                setGameState(state => ({
                    ...state,
                    stats: {
                        ...state.stats,
                        dailyStats: {
                            ...state.stats.dailyStats,
                            maxStreak: newState.stats.dailyStats.currentStreak
                        }
                    }
                }));
            }
        } else {
            setGameState(state => ({
                ...state,
                stats: {
                    ...state.stats,
                    dailyStats: {
                        ...state.stats.dailyStats,
                        currentStreak: 0
                    }
                }
            }));
        }
    }
}

export function getTodayDateStr() {
    return new Date().toISOString().slice(0, 10);
}

// Export guessHistory for UI access
export function getGuessHistory() {
    return guessHistory;
}

export function setGuessHistory(history) {
    guessHistory = history;
}

/**
 * Validate and parse dates for daily mode streaks.
 * @param {string} dateStr
 * @returns {Date|null}
 */
function safeParseDate(dateStr) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
}

export function startNextStreakRound() {
    // Only reset what is needed for the next round in streak mode
    setGameState(state => ({
        ...state,
        currentNumber: generateNumber(),
        attemptsLeft: state.maxAttempts,
        usedHelp: false,
        achievementsEarnedThisRound: []
    }));
    guessHistory = [];
} 