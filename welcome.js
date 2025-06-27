import { getItem, setItem } from './storage.js';
import { setGameState } from './state.js';
import { updatePlayerNameDisplay } from './ui.js';

let currentStep = 1;
let playerName = '';
let tutorialNumber = 0;
let tutorialAttempts = 3;
let tutorialGuesses = [];
let previousDistance = null;

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


export function checkFirstTimeUser() {
    const hasCompletedWelcome = getItem('guessRushWelcomeCompleted');
    const playerName = getItem('guessRushPlayerName');
    
    if (!hasCompletedWelcome || !playerName) {
        showWelcomeOverlay();
        return true;
    }
    return false;
}


function showWelcomeOverlay() {
    welcomeOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        playerNameInput.focus();
    }, 100);
    
    setupWelcomeEventListeners();
}

function setupWelcomeEventListeners() {
    continueToInfo.addEventListener('click', handleContinueToInfo);
    playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleContinueToInfo();
        }
    });
    
    backToName.addEventListener('click', () => showStep(1));
    continueToTutorial.addEventListener('click', () => showStep(3));
    
    backToInfo.addEventListener('click', () => showStep(2));
    skipTutorial.addEventListener('click', handleFinishWelcome);
    finishWelcome.addEventListener('click', handleFinishWelcome);
    
    tutorialSubmit.addEventListener('click', handleTutorialGuess);
    tutorialGuessInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleTutorialGuess();
        }
    });
}

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

function showStep(step) {
    currentStep = step;
    
    welcomeStep1.classList.add('hidden');
    welcomeStep2.classList.add('hidden');
    welcomeStep3.classList.add('hidden');
    
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

function startTutorial() {
    tutorialNumber = Math.floor(Math.random() * 10) + 1; 
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

function handleTutorialGuess() {
    const guess = parseInt(tutorialGuessInput.value);
    
    if (isNaN(guess) || guess < 1 || guess > 10) {
        tutorialFeedback.textContent = 'Please enter a number between 1 and 10';
        tutorialFeedback.style.color = '#dc3545';
        return;
    }
    
    tutorialAttempts--;
    if (tutorialAttempts < 0) tutorialAttempts = 0;
    tutorialAttemptsSpan.textContent = tutorialAttempts;
    
    tutorialGuesses.push(guess);
    addTutorialGuessToHistory(guess);
    
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

    if (tutorialAttempts === 0 && guess !== tutorialNumber) {
        tutorialGuessInput.disabled = true;
        tutorialSubmit.disabled = true;
        tutorialFeedback.innerHTML = `❌ Out of attempts!<br>Would you like to try the tutorial again or move to the game?`;
        tutorialFeedback.style.color = '#dc3545';
        finishWelcome.classList.remove('hidden');
        if (!document.getElementById('retryTutorialBtn')) {
            const retryBtn = document.createElement('button');
            retryBtn.id = 'retryTutorialBtn';
            retryBtn.className = 'welcome-btn secondary';
            retryBtn.textContent = 'Retry Tutorial';
            retryBtn.onclick = () => {
                startTutorial();
                retryBtn.remove();
            };
            finishWelcome.parentNode.insertBefore(retryBtn, finishWelcome);
        }
        return;
    }
}

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

function handleFinishWelcome() {
    setItem('guessRushPlayerName', playerName);
    
    setItem('guessRushWelcomeCompleted', true);
    
    setGameState(state => ({
        ...state,
        playerName: playerName
    }));
    
    welcomeOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    
    updatePlayerNameDisplay();
} 