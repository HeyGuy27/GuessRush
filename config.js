export const tierColors = { bronze: '#cd7f32', silver: '#b0b0b0', gold: '#ffd700', platinum: '#00e6e6' };
export const tierIcons = { bronze: '\ud83e\udd49', silver: '\ud83e\udd48', gold: '\ud83e\udd47', platinum: '\ud83c\udfc6' };
export const tierNames = ['bronze', 'silver', 'gold', 'platinum'];

export const modeExplanations = {
  classic: "Guess the hidden number within the range and limited attempts.",
  chaos: "The number changes every 15 seconds! Try to guess before it changes.",
  math: "Get math hints to help you guess the number.",
  daily: "Daily challenge - try to win once a day.",
  streak: "Win? The range increases and attempts decrease! How long can your streak last?",
  reverse: "Hot/Cold is reversed! Hot = far, Cold = close.",
  blitz: "You have only 30 seconds to guess the number!",
  sudden: "Only one guess! Hit or miss.",
  doublechaos: "Range and number change every 15 seconds!",
  breakthebot: "Try to outsmart the bot! Take turns guessing. If the bot finds the number first, you lose."
};

export const difficultyExplanations = {
  easy: "Guess a number between 1-100. 12 attempts.",
  medium: "Guess a number between 1-250. 10 attempts.",
  hard: "Guess a number between 1-500. 8 attempts.",
  chaos: "Guess a number between 1-1000. 5 attempts. The number may change!"
};

export function getDifficultyExplanation(difficulty, gameMode) {
    if (gameMode === 'doublechaos') {
        const baseExplanations = {
            easy: "Guess a number between 1-200.",
            medium: "Guess a number between 1-400.",
            hard: "Guess a number between 1-600.",
            chaos: "Guess a number between 1-1000."
        };
        let base = baseExplanations[difficulty] || baseExplanations.easy;
        const attempts = { easy: 12, medium: 10, hard: 8, chaos: 6 };
        return `${base} ${attempts[difficulty] || 12} attempts.`;
    }
    if (gameMode === 'breakthebot') {
        const baseExplanations = {
            easy: "Guess a number between 1-100.",
            medium: "Guess a number between 1-250.",
            hard: "Guess a number between 1-500.",
            chaos: "Guess a number between 1-1000."
        };
        return baseExplanations[difficulty] || baseExplanations.easy;
    }
    if (gameMode === 'streak') {
        return "Each win increases the range by 50 and decreases your attempts by 1. Can you survive all 12 rounds?";
    }
    const baseExplanations = {
        easy: "Guess a number between 1-100.",
        medium: "Guess a number between 1-250.",
        hard: "Guess a number between 1-500.",
        chaos: "Guess a number between 1-1000."
    };
    let base = baseExplanations[difficulty] || baseExplanations.easy;
    if (difficulty === 'chaos' && gameMode === 'chaos') {
        base += " The number may change!";
    }
    if (gameMode === 'sudden') {
        return `${base} 1 attempt only.`;
    } else if (gameMode === 'practice') {
        return `${base} Unlimited attempts.`;
    } else {
        const attempts = {
            easy: 12,
            medium: 10,
            hard: 8,
            chaos: 5
        };
        return `${base} ${attempts[difficulty] || 12} attempts.`;
    }
}

export const DEFAULT_RANGES = {
  easy: { min: 1, max: 100, attempts: 12 },
  medium: { min: 1, max: 250, attempts: 10 },
  hard: { min: 1, max: 500, attempts: 8 },
  chaos: { min: 1, max: 1000, attempts: 5 }
};

export const CHAOS_INTERVAL_MS = 15000;
export const BLITZ_TIME_SEC = 30; 
