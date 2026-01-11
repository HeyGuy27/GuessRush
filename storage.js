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

/**
 * Save a discovered Easter Egg ID to localStorage
 * @param {string} eggId - Unique ID of the discovered Easter Egg
 * @returns {boolean} - True if successfully saved (or already exists)
 */
export function saveDiscovery(eggId) {
    try {
        let discoveries = getItem('guessRush_discoveries') || [];
        if (!Array.isArray(discoveries)) {
            // Handle legacy data format
            discoveries = [];
        }
        
        // Check if already discovered (handle both string and object formats)
        const alreadyDiscovered = discoveries.some(d => {
            if (typeof d === 'string') {
                return d === eggId;
            }
            return d.id === eggId;
        });
        
        if (!alreadyDiscovered) {
            const discoveryData = {
                id: eggId,
                discoveredAt: new Date().toISOString()
            };
            discoveries.push(discoveryData);
            setItem('guessRush_discoveries', discoveries);
            
            // Check for meta-achievements
            checkMetaAchievements(discoveries.length);
            
            return true; // New discovery
        }
        return false; // Already discovered
    } catch (e) {
        console.warn('Storage saveDiscovery error:', e);
        return false;
    }
}

/**
 * Get all discovered Easter Egg IDs
 * @returns {Array} Array of discovery objects with id and discoveredAt
 */
export function getDiscoveries() {
    try {
        const discoveries = getItem('guessRush_discoveries');
        return Array.isArray(discoveries) ? discoveries : [];
    } catch (e) {
        console.warn('Storage getDiscoveries error:', e);
        return [];
    }
}

/**
 * Check for meta-achievements based on discovery count
 * @param {number} discoveryCount - Current number of discoveries
 */
function checkMetaAchievements(discoveryCount) {
    try {
        // Get existing milestones to prevent duplicate triggers
        let milestones = getItem('guessRush_milestones') || {};
        if (typeof milestones !== 'object' || Array.isArray(milestones)) {
            milestones = {};
        }
        
        // Check for "The Rabbit Hole" (1 discovery)
        if (discoveryCount === 1 && !milestones.rabbitHole) {
            milestones.rabbitHole = true;
            setItem('guessRush_milestones', milestones);
            
            // Trigger meta-achievement notification
            if (typeof window !== 'undefined' && window.showMetaAchievement) {
                window.showMetaAchievement('The Rabbit Hole', "You've taken the first step into the unknown.");
            }
        }
        
        // Check for "The Architect of Secrets" (11 discoveries - all Easter Eggs)
        if (discoveryCount === 11 && !milestones.architectOfSecrets) {
            milestones.architectOfSecrets = true;
            setItem('guessRush_milestones', milestones);
            
            // Trigger grand meta-achievement notification
            if (typeof window !== 'undefined' && window.showMetaAchievement) {
                window.showMetaAchievement('The Architect of Secrets', "You have uncovered every hidden truth. You are the master of the game.", true);
            }
        }
    } catch (e) {
        console.warn('Meta-achievement check error:', e);
    }
} 