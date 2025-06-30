import { getGameState, setGameState } from './state.js';

const defaultPersonalBests = {
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
};

const defaultAdvancedStats = {
    classic: { easy: baseStats(), medium: baseStats(), hard: baseStats(), chaos: baseStats() },
    chaos: { easy: baseStats(), medium: baseStats(), hard: baseStats(), chaos: baseStats() },
    math: { easy: baseStats(), medium: baseStats(), hard: baseStats(), chaos: baseStats() },
    blitz: { easy: baseStats(), medium: baseStats(), hard: baseStats(), chaos: baseStats() },
    bot: { easy: baseStats(), medium: baseStats(), hard: baseStats(), chaos: baseStats() },
    breakthebot: { easy: baseStats(), medium: baseStats(), hard: baseStats(), chaos: baseStats() },
    doublechaos: { easy: baseStats(), medium: baseStats(), hard: baseStats(), chaos: baseStats() },
    streak: { easy: baseStats(), medium: baseStats(), hard: baseStats(), chaos: baseStats() },
    sudden: { easy: baseStats(), medium: baseStats(), hard: baseStats(), chaos: baseStats() },
    reverse: { easy: baseStats(), medium: baseStats(), hard: baseStats(), chaos: baseStats() }
};

const defaultRanking = {
    currentLevel: 1,
    currentTitle: 'Novice',
    totalExperience: 0,
    levelThresholds: [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000],
    titles: ['Novice', 'Apprentice', 'Explorer', 'Strategist', 'Mastermind', 'Virtuoso', 'Legend', 'Mythic', 'Divine', 'Transcendent']
};

function baseStats() {
    return { gamesPlayed: 0, gamesWon: 0, totalTime: 0, totalAttempts: 0, totalScore: 0 };
}

/**
 * Update personal bests for a specific mode
 * @param {string} mode - Game mode
 * @param {number} score - Current score
 * @param {number} time - Time taken in seconds
 * @param {number} efficiency - Efficiency score (0-100)
 */
export function updatePersonalBests(mode, score, time, efficiency) {
    setGameState(state => {
        const personalBests = { ...defaultPersonalBests, ...(state.stats.personalBests || {}) };
        const currentBests = personalBests[mode] || { bestScore: Infinity, bestTime: Infinity, bestEfficiency: 0 };
        const newBests = { ...currentBests };

        if (currentBests.bestScore === Infinity || currentBests.bestScore === undefined || score > currentBests.bestScore) {
            newBests.bestScore = score;
        }
        if (
            currentBests.bestTime === Infinity ||
            currentBests.bestTime === undefined ||
            currentBests.bestTime === null ||
            currentBests.bestTime === 0 ||
            (time > 0 && time < currentBests.bestTime)
        ) {
            newBests.bestTime = time;
        }
        if (currentBests.bestEfficiency === 0 || currentBests.bestEfficiency === undefined || efficiency > currentBests.bestEfficiency) {
            newBests.bestEfficiency = efficiency;
        }

        return {
            ...state,
            stats: {
                ...state.stats,
                personalBests: {
                    ...personalBests,
                    [mode]: newBests
                }
            }
        };
    });
}

/**
 * Update advanced statistics for a specific mode and difficulty
 * @param {string} mode - Game mode
 * @param {string} difficulty - Game difficulty
 * @param {boolean} won - Whether the game was won
 * @param {number} time - Time taken in seconds
 * @param {number} attempts - Number of attempts used
 * @param {number} score - Score achieved
 */
export function updateAdvancedStats(mode, difficulty, won, time, attempts, score) {
    setGameState(state => {
        const advancedStats = { ...defaultAdvancedStats, ...(state.stats.advancedStats || {}) };
        const modeStats = { ...advancedStats[mode], ...(state.stats.advancedStats?.[mode] || {}) };
        const currentStats = modeStats[difficulty] || baseStats();
        
        const newStats = {
            gamesPlayed: currentStats.gamesPlayed + 1,
            gamesWon: currentStats.gamesWon + (won ? 1 : 0),
            totalTime: currentStats.totalTime + time,
            totalAttempts: currentStats.totalAttempts + attempts,
            totalScore: currentStats.totalScore + score
        };
        
        return {
            ...state,
            stats: {
                ...state.stats,
                advancedStats: {
                    ...advancedStats,
                    [mode]: {
                        ...modeStats,
                        [difficulty]: newStats
                    }
                }
            }
        };
    });
}

/**
 * Calculate experience points for a game
 * @param {boolean} won - Whether the game was won
 * @param {number} score - Score achieved
 * @param {string} difficulty - Game difficulty
 * @param {number} attempts - Number of attempts used
 * @param {number} time - Time taken in seconds
 * @returns {number} Experience points earned
 */
export function calculateExperience(won, score, difficulty, attempts, time) {
    let exp = 0;
    
    // Base experience for playing
    exp += 10;
    
    // Bonus for winning
    if (won) {
        exp += 50;
        
        // Bonus for high score
        if (score > 1000) exp += 25;
        if (score > 2000) exp += 50;
        if (score > 3000) exp += 100;
        
        // Bonus for efficiency (fewer attempts)
        if (attempts <= 3) exp += 30;
        if (attempts <= 5) exp += 20;
        if (attempts <= 7) exp += 10;
        
        // Bonus for speed
        if (time < 30) exp += 20;
        if (time < 60) exp += 10;
    }
    
    const difficultyMultipliers = { easy: 1, medium: 1.5, hard: 2, chaos: 3 };
    exp *= difficultyMultipliers[difficulty] || 1;
    
    return Math.round(exp);
}

/**
 * Update player ranking and level
 * @param {number} experienceEarned - Experience points earned from the game
 */
export function updateRanking(experienceEarned) {
    setGameState(state => {
        const currentRanking = { ...defaultRanking, ...(state.stats.ranking || {}) };
        const newTotalExp = currentRanking.totalExperience + experienceEarned;
        
        let newLevel = currentRanking.currentLevel;
        for (let i = currentRanking.levelThresholds.length - 1; i >= 0; i--) {
            if (newTotalExp >= currentRanking.levelThresholds[i]) {
                newLevel = i + 1;
                break;
            }
        }
        
        const newTitle = currentRanking.titles[Math.min(newLevel - 1, currentRanking.titles.length - 1)];
        
        return {
            ...state,
            stats: {
                ...state.stats,
                ranking: {
                    ...currentRanking,
                    currentLevel: newLevel,
                    currentTitle: newTitle,
                    totalExperience: newTotalExp
                }
            }
        };
    });
}

/**
 * Get calculated statistics for a specific mode and difficulty
 * @param {string} mode - Game mode
 * @param {string} difficulty - Game difficulty
 * @returns {object} Calculated statistics
 */
export function getCalculatedStats(mode, difficulty) {
    const state = getGameState();
    const advancedStats = state.stats.advancedStats || {};
    const stats = advancedStats[mode]?.[difficulty];

    if (!stats || stats.gamesPlayed === 0) {
        return {
            averageTime: 0,
            averageAttempts: 0,
            successRate: 0,
            averageScore: 0
        };
    }

    return {
        averageTime: Math.round(stats.totalTime / stats.gamesPlayed),
        averageAttempts: Math.round((stats.totalAttempts / stats.gamesPlayed) * 10) / 10,
        successRate: Math.round((stats.gamesWon / stats.gamesPlayed) * 100),
        averageScore: Math.round(stats.totalScore / stats.gamesPlayed)
    };
}

/**
 * Get all personal bests formatted for display
 * @returns {object} Formatted personal bests
 */
export function getFormattedPersonalBests() {
    const state = getGameState();
    const bests = (state.stats && state.stats.personalBests) ? state.stats.personalBests : {};
    const formatted = {};
    for (const [mode, modeBests] of Object.entries(bests)) {
        formatted[mode] = {
            bestScore: modeBests.bestScore === Infinity ? 'N/A' : modeBests.bestScore,
            bestTime: (modeBests.bestTime === Infinity || modeBests.bestTime === null || modeBests.bestTime === undefined || modeBests.bestTime === 'N/A' || modeBests.bestTime === 0) ? '—' : `${modeBests.bestTime}s`,
            bestEfficiency: modeBests.bestEfficiency === 0 ? 'N/A' : `${modeBests.bestEfficiency}%`
        };
    }
    return formatted;
}

/**
 * Get ranking progress information
 * @returns {object} Ranking progress data
 */
export function getRankingProgress() {
    const state = getGameState();
    const ranking = { ...defaultRanking, ...(state.stats.ranking || {}) };
    const currentLevel = ranking.currentLevel;
    const currentExp = ranking.totalExperience;
    
    const currentThreshold = ranking.levelThresholds[currentLevel - 1] || 0;
    
    const nextThreshold = ranking.levelThresholds[currentLevel] || currentThreshold;
    
    const expInCurrentLevel = currentExp - currentThreshold;
    const expNeededForNextLevel = nextThreshold - currentThreshold;
    const progressPercentage = expNeededForNextLevel > 0 ? 
        Math.round((expInCurrentLevel / expNeededForNextLevel) * 100) : 100;
    
    return {
        currentLevel,
        currentTitle: ranking.currentTitle,
        totalExperience: currentExp,
        expInCurrentLevel,
        expNeededForNextLevel,
        progressPercentage,
        nextLevel: currentLevel + 1,
        nextTitle: ranking.titles[currentLevel] || ranking.currentTitle
    };
}

/**
 * Calculate efficiency score (0-100)
 * @param {number} attempts
 * @param {number} maxAttempts 
 * @param {number} time 
 * @param {number} difficulty 
 * @returns {number} 
 */
export function calculateEfficiency(attempts, maxAttempts, time, difficulty) {
    const attemptEfficiency = Math.max(0, 100 - ((attempts / maxAttempts) * 100));
    
    const timeEfficiency = Math.max(0, 100 - (time / 60) * 20); 
    
    const difficultyBonus = { easy: 0, medium: 5, hard: 10, chaos: 15 }[difficulty] || 0;
    
    const efficiency = (attemptEfficiency * 0.7) + (timeEfficiency * 0.3) + difficultyBonus;
    
    return Math.min(100, Math.max(0, Math.round(efficiency)));
} 