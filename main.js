import { initGame, updatePlayerNameDisplay } from './ui.js';
import { checkFirstTimeUser } from './welcome.js';


window.addEventListener('DOMContentLoaded', () => {
    const isFirstTime = checkFirstTimeUser();
    
    initGame();
    
    if (!isFirstTime) {
        updatePlayerNameDisplay();
    }
}); 