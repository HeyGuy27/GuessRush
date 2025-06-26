/**
 * Game state encapsulation and accessors
 */
const _gameState = {
    currentNumber: null,
    attemptsLeft: 0,
    maxAttempts: 12,
    minRange: 1,
    maxRange: 100,
    gameMode: 'classic',
    difficulty: 'easy',
    usedHelp: false,
    achievements: new Set(),
    chaosInterval: null,
    streak: {
        current: 0,
        max: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        bestStreak: 0
    },
    stats: {
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
    },
    botGuesses: new Set(),
    botWon: false,
    botInterval: null,
    startTime: null,
    botGuessedNumbers: new Set(),
    botTurn: false,
    botSkillLevel: 0,
    botMin: 0,
    botMax: 0,
    botGuessCount: 0,
    achievementsTiers: {},
    achievementsEarnedThisRound: [],
    lastRoundAchievements: [],
    blitzStarted: false,
};

/**
 * Get a deep clone of the game state (read-only)
 * @returns {object}
 */
export function getGameState() {
    const clone = JSON.parse(JSON.stringify(_gameState));
    if (Array.isArray(clone.botGuessedNumbers)) {
        clone.botGuessedNumbers = new Set(clone.botGuessedNumbers);
    } else if (!(clone.botGuessedNumbers instanceof Set)) {
        clone.botGuessedNumbers = new Set([]);
    }

    if (clone.botGuesses instanceof Set) {
        clone.botGuesses = Array.from(clone.botGuesses);
    } else if (!Array.isArray(clone.botGuesses)) {
        clone.botGuesses = [];
    }
    return clone;
}

/**
 * Update the game state via a partial object or updater function
 * @param {Object|Function} updater
 */
export function setGameState(updater) {
    if (typeof updater === 'function') {
        const newState = updater(getGameState());
        Object.assign(_gameState, newState);
    } else if (typeof updater === 'object') {
        Object.assign(_gameState, updater);
    }
    // Ensure achievements is always a Set
    if (!(_gameState.achievements instanceof Set)) {
        try {
            _gameState.achievements = new Set(
                Array.isArray(_gameState.achievements)
                    ? _gameState.achievements
                    : []
            );
        } catch {
            _gameState.achievements = new Set();
        }
    }
    if (_gameState.botGuessedNumbers && !(_gameState.botGuessedNumbers instanceof Set)) {
        if (Array.isArray(_gameState.botGuessedNumbers)) {
            _gameState.botGuessedNumbers = new Set(_gameState.botGuessedNumbers);
        } else {
            _gameState.botGuessedNumbers = new Set([]);
        }
    }
}

/**
 * Direct internal access for modules that need to mutate state (not for external use)
 * @returns {object}
 */
export function _internalGameState() {
    return _gameState;
} 