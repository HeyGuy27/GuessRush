import { getItem, setItem } from './storage.js';
import { setGameState } from './state.js';
import { updatePlayerNameDisplay } from './ui.js';

// Welcome flow state
let currentStep = 1;
let playerName = '';
let tutorialNumber = 0;
let tutorialAttempts = 3;
let tutorialGuesses = [];
let previousDistance = null;

// DOM elements
const welcomeOverlay = document.getElementById('welcomeOverlay');
const welcomeStep1 = document.getElementById('welcomeStep1');
const welcomeStep2 = document.getElementById('welcomeStep2');
const welcomeStep3 = document.getElementById('welcomeStep3');
const playerNameInput = document.getElementById('playerNameInputWelcome');
const continueToInfo = document.getElementById('continueToInfo');
const backToName = document.getElementById('backToName');
const continueToTutorial = document.getElementById('continueToTutorial');
const backToInfo = document.getElementById('backToInfo');
const skipTutorial = document.getElementById('skipTutorial');
const finishWelcome = document.getElementById('finishWelcome');
const tutorialGuessInput = document.getElementById('tutorialGuessInput');
const tutorialSubmit = document.getElementById('tutorialSubmit');
const tutorialAttemptsSpan = document.getElementById('tutorialAttempts');
const tutorialFeedback = document.getElementById('tutorialFeedback');
const tutorialHistory = document.getElementById('tutorialHistory');

/**
 * Check if this is the user's first time and show welcome flow
 */
export function checkFirstTimeUser() {
    const hasCompletedWelcome = getItem('guessRushWelcomeCompleted');
    const playerName = getItem('guessRushPlayerName');
    
    if (!hasCompletedWelcome || !playerName) {
        showWelcomeOverlay();
        return true;
    }
    return false;
}

/**
 * Show the welcome overlay
 */
function showWelcomeOverlay() {
    welcomeOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Focus on the name input
    setTimeout(() => {
        playerNameInput.focus();
    }, 100);
    
    // Setup event listeners
    setupWelcomeEventListeners();
}

/**
 * Setup all event listeners for the welcome flow
 */
function setupWelcomeEventListeners() {
    // Step 1: Player Name
    continueToInfo.addEventListener('click', handleContinueToInfo);
    playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleContinueToInfo();
        }
    });
    
    // Step 2: Game Info
    backToName.addEventListener('click', () => showStep(1));
    continueToTutorial.addEventListener('click', () => showStep(3));
    
    // Step 3: Tutorial
    backToInfo.addEventListener('click', () => showStep(2));
    skipTutorial.addEventListener('click', handleFinishWelcome);
    finishWelcome.addEventListener('click', handleFinishWelcome);
    
    // Tutorial game
    tutorialSubmit.addEventListener('click', handleTutorialGuess);
    tutorialGuessInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleTutorialGuess();
        }
    });
}

/**
 * Handle continuing from name input to game info
 */
function handleContinueToInfo() {
    const name = playerNameInput.value.trim();
    if (!name) {
        playerNameInput.style.borderColor = '#dc3545';
        playerNameInput.placeholder = 'Please enter your name';
        return;
    }
    
    playerName = name;
    playerNameInput.style.borderColor = '#ddd';
    showStep(2);
}

/**
 * Show a specific step in the welcome flow
 */
function showStep(step) {
    currentStep = step;
    
    // Hide all steps
    welcomeStep1.classList.add('hidden');
    welcomeStep2.classList.add('hidden');
    welcomeStep3.classList.add('hidden');
    
    // Show the current step
    switch (step) {
        case 1:
            welcomeStep1.classList.remove('hidden');
            playerNameInput.focus();
            break;
        case 2:
            welcomeStep2.classList.remove('hidden');
            break;
        case 3:
            welcomeStep3.classList.remove('hidden');
            startTutorial();
            break;
    }
}

/**
 * Start the tutorial game
 */
function startTutorial() {
    tutorialNumber = Math.floor(Math.random() * 10) + 1; // 1-10
    tutorialAttempts = 3;
    tutorialGuesses = [];
    previousDistance = null;
    tutorialAttemptsSpan.textContent = tutorialAttempts;
    tutorialFeedback.textContent = '';
    tutorialHistory.innerHTML = '';
    tutorialGuessInput.value = '';
    tutorialGuessInput.disabled = false;
    tutorialSubmit.disabled = false;
    tutorialGuessInput.focus();
    finishWelcome.classList.add('hidden');
}

/**
 * Handle tutorial guess submission
 */
function handleTutorialGuess() {
    const guess = parseInt(tutorialGuessInput.value);
    
    if (isNaN(guess) || guess < 1 || guess > 10) {
        tutorialFeedback.textContent = 'Please enter a number between 1 and 10';
        tutorialFeedback.style.color = '#dc3545';
        return;
    }
    
    tutorialAttempts--;
    tutorialAttemptsSpan.textContent = tutorialAttempts;
    
    // Add guess to history
    tutorialGuesses.push(guess);
    addTutorialGuessToHistory(guess);
    
    // Check if correct
    if (guess === tutorialNumber) {
        tutorialFeedback.textContent = `🎉 Correct! The number was ${tutorialNumber}`;
        tutorialFeedback.style.color = '#28a745';
        tutorialGuessInput.disabled = true;
        tutorialSubmit.disabled = true;
        finishWelcome.classList.remove('hidden');
        setTimeout(() => {
            tutorialFeedback.innerHTML = `🎉 Correct! The number was ${tutorialNumber}<br><small style="color: #666;">Great job! You're ready to play!</small>`;
        }, 1000);
        return;
    }
    
    // Provide feedback
    const difference = Math.abs(guess - tutorialNumber);
    let feedback = '';
    let color = '';
    let direction = '';
    if (guess < tutorialNumber) {
        direction = ' Try higher!';
    } else if (guess > tutorialNumber) {
        direction = ' Try lower!';
    }
    if (previousDistance === null) {
        // First guess
        if (difference <= 2) {
            feedback = '🔥 HOT! You\'re very close!';
            color = '#dc3545';
        } else if (difference <= 5) {
            feedback = '🌡️ WARM! Getting closer!';
            color = '#fd7e14';
        } else {
            feedback = '❄️ COLD! Try a different number.';
            color = '#007bff';
        }
    } else {
        if (difference < previousDistance) {
            feedback = '🌡️ WARM! Getting closer!';
            color = '#fd7e14';
        } else if (difference > previousDistance) {
            feedback = '❄️ COLD! Getting farther!';
            color = '#007bff';
        } else {
            feedback = 'No change!';
            color = '#6c757d';
        }
    }
    previousDistance = difference;
    tutorialFeedback.textContent = feedback + direction;
    tutorialFeedback.style.color = color;
    
    tutorialGuessInput.value = '';
    tutorialGuessInput.focus();
}

/**
 * Add a guess to the tutorial history
 */
function addTutorialGuessToHistory(guess) {
    const difference = Math.abs(guess - tutorialNumber);
    let feedback = '';
    let className = '';
    
    if (guess === tutorialNumber) {
        feedback = 'Correct! 🎉';
        className = 'correct';
    } else if (difference <= 2) {
        feedback = 'HOT';
        className = 'hot';
    } else {
        feedback = 'COLD';
        className = 'cold';
    }
    
    const guessItem = document.createElement('div');
    guessItem.className = 'guess-item';
    guessItem.innerHTML = `
        <span class="guess-number">${guess}</span>
        <span class="guess-feedback ${className}">${feedback}</span>
    `;
    
    tutorialHistory.appendChild(guessItem);
}

/**
 * Handle finishing the welcome flow
 */
function handleFinishWelcome() {
    // Save player name
    setItem('guessRushPlayerName', playerName);
    
    // Mark welcome as completed
    setItem('guessRushWelcomeCompleted', true);
    
    // Update game state with player name
    setGameState(state => ({
        ...state,
        playerName: playerName
    }));
    
    // Hide welcome overlay
    welcomeOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    
    // Update player name display using the existing function
    updatePlayerNameDisplay();
} 