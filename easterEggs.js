import { getGameState, setGameState, _internalGameState } from './state.js';
import { saveDiscovery } from './storage.js';


const EASTER_EGG_IDS = {
    "Beginner's luck… or are you a genius in disguise? 🎓🕵️": "beginners_luck",
    "Calculated… maybe. 🤔📐": "calculated",
    "Stop showing off. We get it. 😎": "stop_showing_off",
    "You either know what you're doing... or you're way too proud. 😏": "no_hints_master",
    "Is this… luck or witchcraft? 🔮": "witchcraft",
    "No logic. No plan. Just vibes. ✨": "just_vibes",
    "Spray and pray, huh? 💥🎯": "spray_pray",
    "Testing the boundaries? You'd make a great QA engineer. ⌨️": "qa_engineer",
    "You're playing emotional hot/cold. 😵‍💫": "emotional_hotcold",
    "Colder than your ex! 🧊💔": "colder_ex",
    "Guessing the number of your own guess? That's deep. 🌀": "meta_guess"
};

/**
 * Evaluate easter egg conditions based on player behavior
 * @param {number} currentGuess - The current guess value
 * @param {number} targetNumber - The target number
 * @param {boolean} isWin - Whether this guess won the game
 * @param {number} attemptNumber - The attempt number (1-based)
 * @param {boolean} usedHelp - Whether hints were used in this game
 * @returns {string|null} Easter egg message or null
 */
export function evaluateEasterEggs(currentGuess, targetNumber, isWin, attemptNumber, usedHelp) {
    const state = _internalGameState();
    const easterEggs = state.easterEggs || {
        guessTimestamps: [],
        consecutiveFirstGuessWins: 0,
        gamesPlayedWithoutHints: 0,
        lastThreeGuessesDistances: [],
        recentGuessesWithoutHints: 0,
        consecutiveFastGuesses: 0,
        lastFastGuessTime: null,
        consecutiveBoundaryGuesses: 0,
        lastBoundaryGuess: null,
        recentWinGuesses: [],
        consecutiveFarGuessesWithoutHints: 0,
        lastTriggeredEgg: null,
        hasTriggeredMetaGuess: false
    };
    
    // Helper function to check and set triggered egg
    const checkAndSetTrigger = (message) => {
        if (message && easterEggs.lastTriggeredEgg === message) {
            return null; 
        }
        easterEggs.lastTriggeredEgg = message;
        return message;
    };
    
    const distance = Math.abs(currentGuess - targetNumber);
    const now = Date.now();
    
    // Update guess timestamps (keep last 10)
    easterEggs.guessTimestamps = [...easterEggs.guessTimestamps, now].slice(-10);
    
    // Update last three guesses distances
    easterEggs.lastThreeGuessesDistances = [...easterEggs.lastThreeGuessesDistances, distance].slice(-3);
    
    // Collect all potential easter egg messages with priorities
    // Higher priority = more rare/impressive (will be selected if multiple trigger)
    const potentialMessages = [];
    
    // Priority 10 (highest - most rare): Beginner's luck
    if (isWin && attemptNumber === 1 && state.stats.gamesPlayed === 0) {
        easterEggs.consecutiveFirstGuessWins = 1;
        potentialMessages.push({ message: "Beginner's luck… or are you a genius in disguise? 🎓🕵️", priority: 10 });
    }
    
    // Priority 9: Calculated (2 consecutive first guess wins)
    if (isWin && attemptNumber === 1 && easterEggs.consecutiveFirstGuessWins >= 2) {
        easterEggs.consecutiveFirstGuessWins = 0;
        potentialMessages.push({ message: "Calculated… maybe. 🤔📐", priority: 9 });
    }
    
    // Priority 8: Stop showing off (3 consecutive wins < 3 guesses)
    if (isWin) {
        easterEggs.recentWinGuesses = [...easterEggs.recentWinGuesses, attemptNumber].slice(-3);
        if (easterEggs.recentWinGuesses.length >= 3 &&
            easterEggs.recentWinGuesses.every(g => g < 3)) {
            easterEggs.recentWinGuesses = [];
            potentialMessages.push({ message: "Stop showing off. We get it. 😎", priority: 8 });
        }
    }
    
    // Priority 7: You either know what you're doing (5 games without hints)
    if (isWin && !usedHelp) {
        easterEggs.gamesPlayedWithoutHints++;
        if (easterEggs.gamesPlayedWithoutHints >= 5) {
            easterEggs.gamesPlayedWithoutHints = 0;
            potentialMessages.push({ message: "You either know what you're doing... or you're way too proud. 😏", priority: 7 });
        }
    } else if (isWin && usedHelp) {
        easterEggs.gamesPlayedWithoutHints = 0;
    }
    
    // Priority 6: Is this luck or witchcraft (first guess win)
    if (isWin && attemptNumber === 1) {
        easterEggs.consecutiveFirstGuessWins++;
        if (easterEggs.consecutiveFirstGuessWins === 1 && state.stats.gamesPlayed > 0) {
            potentialMessages.push({ message: "Is this… luck or witchcraft? 🔮", priority: 6 });
        }
    } else if (isWin && attemptNumber > 1) {
        easterEggs.consecutiveFirstGuessWins = 0;
    }
    
    // Priority 5: No logic. No plan. Just vibes (10 consecutive far guesses)
    if (!usedHelp) {
        if (distance > 30) {
            easterEggs.consecutiveFarGuessesWithoutHints = (easterEggs.consecutiveFarGuessesWithoutHints || 0) + 1;
            if (easterEggs.consecutiveFarGuessesWithoutHints >= 10) {
                easterEggs.consecutiveFarGuessesWithoutHints = 0;
                potentialMessages.push({ message: "No logic. No plan. Just vibes. ✨", priority: 5 });
            }
        } else {
            easterEggs.consecutiveFarGuessesWithoutHints = 0;
        }
    } else {
        easterEggs.consecutiveFarGuessesWithoutHints = 0;
    }
    
    // Priority 4: Spray and pray (10 guesses in 5 seconds)
    if (easterEggs.guessTimestamps.length >= 10) {
        const timeSpan = easterEggs.guessTimestamps[easterEggs.guessTimestamps.length - 1] - easterEggs.guessTimestamps[0];
        if (timeSpan < 5000) {
            easterEggs.guessTimestamps = [];
            potentialMessages.push({ message: "Spray and pray, huh? 💥🎯", priority: 4 });
        }
    }
    
    // Priority 3: Testing boundaries (3 consecutive boundary guesses)
    if (currentGuess === state.minRange || currentGuess === state.maxRange) {
        if (easterEggs.lastBoundaryGuess === currentGuess) {
            easterEggs.consecutiveBoundaryGuesses++;
        } else {
            easterEggs.consecutiveBoundaryGuesses = 1;
        }
        easterEggs.lastBoundaryGuess = currentGuess;
        
        if (easterEggs.consecutiveBoundaryGuesses >= 3) {
            easterEggs.consecutiveBoundaryGuesses = 0;
            potentialMessages.push({ message: "Testing the boundaries? You'd make a great QA engineer. ⌨️", priority: 3 });
        }
    } else {
        easterEggs.consecutiveBoundaryGuesses = 0;
        easterEggs.lastBoundaryGuess = null;
    }
    
    // Priority 2: Emotional hot/cold pattern
    if (easterEggs.lastThreeGuessesDistances.length >= 3) {
        const [first, second, third] = easterEggs.lastThreeGuessesDistances;
        if (first < 10 && second > 40 && third < 10) {
            potentialMessages.push({ message: "You're playing emotional hot/cold. 😵‍💫", priority: 2 });
        }
    }
    
    // Priority 1: Colder than your ex
    if (easterEggs.lastThreeGuessesDistances.length >= 3 &&
        easterEggs.lastThreeGuessesDistances.every(d => d > 50)) {
        potentialMessages.push({ message: "Colder than your ex! 🧊💔", priority: 1 });
    }
    
    // Priority 0 (lowest but still special): Meta guess (only once per game)
    if (currentGuess === attemptNumber && !easterEggs.hasTriggeredMetaGuess) {
        easterEggs.hasTriggeredMetaGuess = true;
        potentialMessages.push({ message: "Guessing the number of your own guess? That's deep. 🌀", priority: 0 });
    }
    
    // Select the highest priority message (most rare)
    if (potentialMessages.length > 0) {
        const selected = potentialMessages.reduce((best, current) => 
            current.priority > best.priority ? current : best
        );
        
        const finalMessage = checkAndSetTrigger(selected.message);
        if (finalMessage) {
            // Save discovery if this is a new Easter Egg
            const eggId = EASTER_EGG_IDS[finalMessage];
            if (eggId) {
                const isNewDiscovery = saveDiscovery(eggId);
                if (isNewDiscovery) {
                    // Trigger new discovery event for UI
                    window.dispatchEvent(new CustomEvent('newDiscovery', { 
                        detail: { id: eggId, message: finalMessage } 
                    }));
                    console.log("New Discovery Unlocked: " + eggId);
                } else {
                    // Already discovered, do not show popup again
                    setGameState(state => ({ ...state, easterEggs: easterEggs }));
                    return null;
                }
            }
            setGameState(state => ({ ...state, easterEggs: easterEggs }));
            return finalMessage;
        }
    }
    
    // Reset consecutive first guess wins on non-first-guess attempts (if not win)
    if (!isWin && attemptNumber > 1) {
        easterEggs.consecutiveFirstGuessWins = 0;
    }
    
    // Save updated easter egg state (only if no message was returned)
    setGameState(state => ({
        ...state,
        easterEggs: easterEggs
    }));
    
    return null;
}

/**
 * Reset easter egg tracking when starting a new game
 * Only resets per-game tracking, keeps cross-game counters
 */
export function resetEasterEggTracking() {
    setGameState(state => {
        const currentEasterEggs = state.easterEggs || {
            guessTimestamps: [],
            consecutiveFirstGuessWins: 0,
            gamesPlayedWithoutHints: 0,
            lastThreeGuessesDistances: [],
            recentGuessesWithoutHints: 0,
            consecutiveFastGuesses: 0,
            lastFastGuessTime: null,
            consecutiveBoundaryGuesses: 0,
            lastBoundaryGuess: null,
            recentWinGuesses: [],
            consecutiveFarGuessesWithoutHints: 0,
            lastTriggeredEgg: null,
            hasTriggeredMetaGuess: false
        };
        return {
            ...state,
            easterEggs: {
                ...currentEasterEggs,
                // Reset per-game tracking
                lastThreeGuessesDistances: [],
                recentGuessesWithoutHints: 0,
                consecutiveFastGuesses: 0,
                lastFastGuessTime: null,
                consecutiveBoundaryGuesses: 0,
                lastBoundaryGuess: null,
                consecutiveFarGuessesWithoutHints: 0,
                hasTriggeredMetaGuess: false,
                lastTriggeredEgg: null
                // Keep cross-game tracking: guessTimestamps, consecutiveFirstGuessWins, 
                // gamesPlayedWithoutHints, recentWinGuesses
            }
        };
    });
}

