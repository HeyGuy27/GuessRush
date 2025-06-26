import { initGame, updatePlayerNameDisplay } from './ui.js';
import { checkFirstTimeUser } from './welcome.js';

// Entry point
window.addEventListener('DOMContentLoaded', () => {
    // Check if this is a first-time user
    const isFirstTime = checkFirstTimeUser();
    
    // Initialize the game
    initGame();
    
    // If not first time, update player name display
    if (!isFirstTime) {
        updatePlayerNameDisplay();
    }
}); 