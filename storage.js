/**
 * Safe localStorage get
 * @param {string} key
 * @returns {any|null}
 */
export function getItem(key) {
    try {
        if (key === 'guessRushTheme' || key === 'guessRushPlayerName' || key === 'guessRushWelcomeCompleted') {
            const value = localStorage.getItem(key);
            if (key === 'guessRushWelcomeCompleted') {
                return value === 'true';
            }
            return value;
        }
        return JSON.parse(localStorage.getItem(key));
    } catch (e) {
        if (typeof window !== 'undefined' && window.displayFeedbackMessage) {
            window.displayFeedbackMessage('Could not load data from storage.', 'error');
        }
        console.warn('Storage get error:', e);
        return null;
    }
}

/**
 * Safe localStorage set
 * @param {string} key
 * @param {any} value
 * @returns {boolean}
 */
export function setItem(key, value) {
    try {
        if (key === 'guessRushTheme' || key === 'guessRushPlayerName' || key === 'guessRushWelcomeCompleted') {
            localStorage.setItem(key, String(value));
        } else {
            localStorage.setItem(key, JSON.stringify(value));
        }
        return true;
    } catch (e) {
        if (typeof window !== 'undefined' && window.displayFeedbackMessage) {
            window.displayFeedbackMessage('Could not save data: storage full or unavailable.', 'error');
        }
        console.warn('Storage set error:', e);
        return false;
    }
}

/**
 * Safe localStorage remove.    
 * @param {string} key
 * @returns {boolean}
 */
export function removeItem(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (e) {
        if (typeof window !== 'undefined' && window.displayFeedbackMessage) {
            window.displayFeedbackMessage('Could not remove data from storage.', 'error');
        }
        console.warn('Storage remove error:', e);
        return false;
    }
} 