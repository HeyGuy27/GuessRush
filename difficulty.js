import { getGameState, setGameState } from './state.js';


export function updateDifficultySettings() {
    const state = getGameState();
    if (state.gameMode === 'doublechaos') {
        return;
    }
    if (state.gameMode === 'practice') {
        switch (state.difficulty) {
            case 'easy':
                setGameState(state => ({ ...state, minRange: 1, maxRange: 100 }));
                break;
            case 'medium':
                setGameState(state => ({ ...state, minRange: 1, maxRange: 250 }));
                break;
            case 'hard':
                setGameState(state => ({ ...state, minRange: 1, maxRange: 500 }));
                break;
            case 'chaos':
                setGameState(state => ({ ...state, minRange: 1, maxRange: 1000 }));
                break;
        }
        setGameState(state => ({ ...state, maxAttempts: Infinity, attemptsLeft: Infinity }));
    } else {
        setGameState(state => ({ ...state, minRange: 1 }));
        if (state.gameMode === 'streak') {
            setGameState(state => ({
                ...state,
                maxRange: 100,
                maxAttempts: 12,
                attemptsLeft: 12,
                streakCurrent: 0,
                streakMaxRange: 100
            }));
        } else if (state.gameMode === 'sudden') {
            switch (state.difficulty) {
                case 'easy':
                    setGameState(state => ({ ...state, maxRange: 100 }));
                    break;
                case 'medium':
                    setGameState(state => ({ ...state, maxRange: 250 }));
                    break;
                case 'hard':
                    setGameState(state => ({ ...state, maxRange: 500 }));
                    break;
                case 'chaos':
                    setGameState(state => ({ ...state, maxRange: 1000 }));
                    break;
            }
            setGameState(state => ({ ...state, maxAttempts: 1, attemptsLeft: 1 }));
        } else {
            switch (state.difficulty) {
                case 'easy':
                    setGameState(state => ({ ...state, maxRange: 100, maxAttempts: 12 }));
                    break;
                case 'medium':
                    setGameState(state => ({ ...state, maxRange: 250, maxAttempts: 10 }));
                    break;
                case 'hard':
                    setGameState(state => ({ ...state, maxRange: 500, maxAttempts: 8 }));
                    break;
                case 'chaos':
                    setGameState(state => ({ ...state, maxRange: 1000, maxAttempts: 5 }));
                    break;
            }
            setGameState(state => ({ ...state, attemptsLeft: state.maxAttempts }));
        }
    }
    // No UI updates here; UI should be updated separately.
} 