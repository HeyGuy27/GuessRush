import { tierNames } from './config.js';
import { showAchievementNotification, updateAchievementsDisplay, saveToLocalStorage } from './ui.js';
import { setGameState } from './state.js';

export const achievementDescriptions = {
    'First Win': 'Win your first game',
    'Lightning Fast': 'Win quickly with few guesses',
    'Streak Master': 'Win multiple games in a row',
    'Bot Buster (Easy)': 'Beat the bot on easy Difficulty',
    'Bot Buster (Medium)': 'Beat the bot on medium Difficulty',
    'Bot Buster (Hard)': 'Beat the bot on hard Difficulty',
    'Bot Buster (Chaos)': 'Beat the bot on chaos Difficulty',
    'Math Whiz': 'Win in math mode',
    'Daily Champion': 'Win the daily challenge',
    'Chaos Master': 'Win in chaos mode',
    'Perfect Score': 'Win with the best possible score',
    'Help Seeker': 'Use hints to win',
    'Persistent': 'Win after many attempts',
    'Lucky Guess': 'Win on your first try',
    'Speed Demon': 'Win in under 10 seconds',
    'Range Master': 'Win with a large number range',
    'Blitz Champion': 'Win in blitz mode',
    'Sudden Death': 'Win in sudden death mode',
    'Reverse Master': 'Win in reverse mode',
    'Double Chaos': 'Win in double chaos mode',
    'Break the Bot': 'Win in break the bot mode',
    'Game Master': 'Win all achievements to unlock this',
    'Into the Storm': 'Win Double Chaos on easy Difficulty',
    'Chaos Handler': 'Win Double Chaos on medium Difficulty',
    'Master of Mayhem': 'Win Double Chaos on hard Difficulty',
    'Lord of the Double Chaos': 'Win Double Chaos on chaos',
    'Total Wins': 'Win games to unlock higher tiers',
    'Perfect Game': 'Win in 1 guess, no hints, under 5 seconds',
};

export const tieredAchievements = {
    'Lightning Fast': [
        { tier: 'bronze', condition: (numGuesses) => numGuesses < 6, description: 'Win in less than 6 guesses' },
        { tier: 'silver', condition: (numGuesses) => numGuesses < 4, description: 'Win in less than 4 guesses' },
        { tier: 'gold', condition: (numGuesses) => numGuesses === 1, description: 'Win on your first guess!' }
    ],
    'Bot Buster (Easy)': [ { tier: 'bronze', condition: () => true, description: 'Beat the bot on Easy Difficulty' } ],
    'Bot Buster (Medium)': [ { tier: 'silver', condition: () => true, description: 'Beat the bot on Medium Difficulty' } ],
    'Bot Buster (Hard)': [ { tier: 'gold', condition: () => true, description: 'Beat the bot on Hard Difficulty' } ],
    'Bot Buster (Chaos)': [ { tier: 'platinum', condition: () => true, description: 'Beat the bot on Chaos Difficulty!' } ],
    'Streak Master': [
        { tier: 'bronze', condition: (streak) => streak >= 1 && streak <= 3, description: 'Win 1-3 games in a row' },
        { tier: 'silver', condition: (streak) => streak >= 4 && streak <= 7, description: 'Win 4-7 games in a row' },
        { tier: 'gold', condition: (streak) => streak >= 8 && streak <= 11, description: 'Win 8-11 games in a row' },
        { tier: 'platinum', condition: (streak) => streak === 12, description: 'Win 12 games in a row!' }
    ],
    'Persistent': [
        { tier: 'bronze', condition: (numGuesses, maxAttempts) => numGuesses === maxAttempts, description: 'Win on your last attempt' },
        { tier: 'silver', condition: (numGuesses, maxAttempts) => numGuesses >= Math.floor(0.9 * maxAttempts), description: 'Win after using 90%+ of attempts' },
        { tier: 'gold', condition: (numGuesses, maxAttempts) => numGuesses === maxAttempts - 1, description: 'Win with only one attempt left' },
        { tier: 'platinum', condition: (numGuesses, maxAttempts, usedHelp) => numGuesses === maxAttempts && !usedHelp, description: 'Win on last attempt without hints' }
    ],
    'Help Seeker': [
        { tier: 'bronze', condition: (hints) => hints > 3, description: 'Win after using more than 3 hints' },
        { tier: 'silver', condition: (hints) => hints > 2, description: 'Win after using more than 2 hints' },
        { tier: 'gold', condition: (hints) => hints > 1, description: 'Win after using more than 1 hint' },
        { tier: 'platinum', condition: (hints) => hints === 0, description: 'Win without using any hints' }
    ],
    'Perfect Score': [
        { tier: 'bronze', condition: (score, stats) => score < 0.8 * (stats.bestScore || 1000), description: 'Score better than 80% of your previous games' },
        { tier: 'silver', condition: (score, stats) => score < 0.9 * (stats.bestScore || 1000), description: 'Score better than 90% of your previous games' },
        { tier: 'gold', condition: (score, stats) => score === stats.bestScore, description: 'Best score ever' },
        { tier: 'platinum', condition: (score, stats, numGuesses, usedHelp, difficulty) => score === 1 && numGuesses === 1 && !usedHelp && difficulty === 'hard', description: 'Best possible score (first guess, no hints, hard mode)' }
    ],
    'Range Master': [
        { tier: 'bronze', condition: (range) => range <= 100, description: 'Win with range 1-100' },
        { tier: 'silver', condition: (range) => range <= 250, description: 'Win with range 1-250' },
        { tier: 'gold', condition: (range) => range <= 500, description: 'Win with range 1-500' },
        { tier: 'platinum', condition: (range) => range <= 1000, description: 'Win with range 1-1000' }
    ],
    'Daily Champion': [
        { tier: 'bronze', condition: (days) => days >= 1, description: 'Win 1 daily challenge' },
        { tier: 'silver', condition: (days) => days >= 5, description: 'Win 5 daily challenges' },
        { tier: 'gold', condition: (days) => days >= 15, description: 'Win 15 daily challenges' },
        { tier: 'platinum', condition: (days, streak) => streak >= 30, description: 'Win 30 daily challenges in a row' }
    ],
    'Blitz Champion': [
        { tier: 'bronze', condition: (time) => time < 60, description: 'Win blitz mode' },
        { tier: 'silver', condition: (time) => time < 20, description: 'Win blitz mode in under 20 seconds' },
        { tier: 'gold', condition: (time) => time < 10, description: 'Win blitz mode in under 10 seconds' },
        { tier: 'platinum', condition: (numGuesses, time) => numGuesses === 1 && time < 60, description: 'Win blitz mode with only one guess' }
    ],
    'Math Whiz': [
        { tier: 'bronze', condition: () => true, description: 'Win math mode' },
        { tier: 'silver', condition: (usedHelp) => !usedHelp, description: 'Win math mode with no hints' },
        { tier: 'gold', condition: (numGuesses) => numGuesses === 1, description: 'Win math mode on first try' },
        { tier: 'platinum', condition: (wins) => wins >= 10, description: 'Win math mode 10 times' }
    ],
    'Comeback King': [
        { tier: 'bronze', condition: (cold) => cold >= 3, description: 'Win after 3 cold guesses in a row' },
        { tier: 'silver', condition: (cold) => cold >= 5, description: 'Win after 5 cold guesses in a row' },
        { tier: 'gold', condition: (cold) => cold >= 7, description: 'Win after 7 cold guesses in a row' },
        { tier: 'platinum', condition: (cold) => cold >= 10, description: 'Win after 10 cold guesses in a row' }
    ],
    'All Rounder': [
        { tier: 'bronze', condition: (modes) => modes >= 3, description: 'Win in 3 different modes' },
        { tier: 'silver', condition: (modes) => modes >= 6, description: 'Win in 6 different modes' },
        { tier: 'gold', condition: (modes) => modes >= 10, description: 'Win in all modes' },
        { tier: 'platinum', condition: (modes, noHints) => modes >= 10 && noHints, description: 'Win in all modes without hints' }
    ],
    'Never Give Up': [ { tier: 'bronze', condition: () => true, description: 'Win using your last attempt' } ],
    'Perfect Streak': [ { tier: 'bronze', condition: () => true, description: 'Complete Streak Mode without a loss' } ],
    'Chaos Master': [ { tier: 'bronze', condition: () => true, description: 'Win in chaos mode' } ],
    'Break the Bot': [ { tier: 'bronze', condition: () => true, description: 'Win in break the bot mode' } ],
    'Double Chaos': [ { tier: 'bronze', condition: () => true, description: 'Win in double chaos mode' } ],
    'Reverse Master': [ { tier: 'bronze', condition: () => true, description: 'Win in reverse mode' } ],
    'Sudden Death': [ { tier: 'bronze', condition: () => true, description: 'Win in sudden death mode' } ],
    'Speed Demon': [
        { tier: 'gold', condition: (seconds) => seconds < 10, description: 'Win in under 10 seconds' },
        { tier: 'silver', condition: (seconds) => seconds < 20, description: 'Win in under 20 seconds' },
        { tier: 'bronze', condition: (seconds) => seconds < 30, description: 'Win in under 30 seconds' }
    ],
    'First Win': [
        { tier: 'bronze', condition: () => true, description: 'Win your first game' }
    ],
    'Total Wins': [
        { tier: 'bronze', condition: (gamesWon) => gamesWon >= 1, description: 'First Win - Win 1 game' },
        { tier: 'silver', condition: (gamesWon) => gamesWon >= 10, description: 'Getting Started - Win 10 games' },
        { tier: 'gold', condition: (gamesWon) => gamesWon >= 25, description: 'Seasoned Winner - Win 25 games' },
        { tier: 'platinum', condition: (gamesWon) => gamesWon >= 50, description: 'Victory Veteran - Win 50 games' }
    ],
    'Into the Storm': [
        { tier: 'bronze', condition: () => true, description: 'Win Double Chaos on easy' }
    ],
    'Chaos Handler': [
        { tier: 'silver', condition: (mode, diff) => mode === 'doublechaos' && diff === 'medium', description: 'Win Double Chaos on medium' }
    ],
    'Master of Mayhem': [
        { tier: 'gold', condition: (mode, diff) => mode === 'doublechaos' && diff === 'hard', description: 'Win Double Chaos on hard' }
    ],
    'Lord of the Double Chaos': [
        { tier: 'platinum', condition: (mode, diff) => mode === 'doublechaos' && diff === 'chaos', description: 'Win Double Chaos on chaos' }
    ],
    'Perfect Game': [
        { tier: 'bronze', condition: (perfectGames) => perfectGames >= 1, description: 'Achieve 1 perfect game' },
        { tier: 'silver', condition: (perfectGames) => perfectGames >= 3, description: 'Achieve 3 perfect games' },
        { tier: 'gold', condition: (perfectGames) => perfectGames >= 5, description: 'Achieve 5 perfect games' },
        { tier: 'platinum', condition: (perfectGames) => perfectGames >= 10, description: 'Achieve 10 perfect games!' }
    ],
};

/**
 * Unlock an achievement tier for a player
 * @param {Object} gameState
 * @param {string} name
 * @param {string|null} tier
 * @returns {boolean} true if unlocked
 */
export function unlockAchievement(gameState, name, tier = null) {
    if (!(gameState.achievements instanceof Set)) {
        try {
            gameState.achievements = new Set(
                Array.isArray(gameState.achievements)
                    ? gameState.achievements
                    : []
            );
        } catch {
            gameState.achievements = new Set();
        }
    }
    if (!gameState.achievementsTiers[name]) {
        gameState.achievementsTiers[name] = [];
    }
    if (!Array.isArray(gameState.achievementsTiers[name])) {
        gameState.achievementsTiers[name] = [gameState.achievementsTiers[name]].filter(Boolean);
    }
    const currentTiers = Array.isArray(gameState.achievementsTiers[name]) ? gameState.achievementsTiers[name] : [];
    const tierIndex = tierNames.indexOf(tier);
    const highest = currentTiers.reduce((max, t) => Math.max(max, tierNames.indexOf(t)), -1);
    if (tierIndex > highest) {
        gameState.achievementsTiers[name] = [tier];
        gameState.achievements.add(name);
        showAchievementNotification(name, tier);
        setGameState(state => {
            const already = state.achievementsEarnedThisRound.some(a => a.name === name && a.tier === tier);
            return already ? {} : {
                achievementsEarnedThisRound: [
                    ...state.achievementsEarnedThisRound.filter(a => a.name !== name),
                    { name, tier }
                ]
            };
        });
        updateAchievementsDisplay();
        saveToLocalStorage();
        return true;
    }
    return false;
}

/**
 * Get the description for an achievement and tier
 * @param {string} name
 * @param {string|null} tier
 * @returns {string}
 */
export function getAchievementDescription(name, tier) {
    if (name === 'Total Wins') {
        return getTotalWinsDescription(tier);
    }
    if (tieredAchievements[name]) {
        const tierData = tieredAchievements[name].find(t => t.tier === tier);
        return tierData ? tierData.description : 'Achievement unlocked!';
    }
    return achievementDescriptions[name] || 'Achievement unlocked!';
}

/**
 * Check for secret achievement after unlocking any achievement
 * @param {object} gameState
 * @returns {boolean}
 */
export function checkSecretAchievement(gameState) {
    const allButSecret = Object.keys(achievementDescriptions).filter(n => n !== 'Game Master');
    const allEarned = allButSecret.every(name => gameState.achievements.has(name));
    if (allEarned && !gameState.achievements.has('Game Master')) {
        unlockAchievement(gameState, 'Game Master', 'platinum');
        return true;
    }
    return false;
}


function getTotalWinsDescription(tier) {
    switch (tier) {
        case 'bronze': return 'First Win - Win 1 game';
        case 'silver': return 'Getting Started - Win 10 games';
        case 'gold': return 'Seasoned Winner - Win 25 games';
        case 'platinum': return 'Victory Veteran - Win 50 games';
        default: return 'Win games to unlock higher tiers';
    }
} 