/**
 * StorageService
 * Handles persistent storage of user progress, settings, and achievements
 */

class StorageService {
    constructor() {
        this.KEYS = {
            USER_PROFILE: 'signtutor_user_profile',
            LETTER_MASTERY: 'signtutor_letter_mastery',
            WORD_PROGRESS: 'signtutor_word_progress',
            SENTENCE_PROGRESS: 'signtutor_sentence_progress',
            SESSION_HISTORY: 'signtutor_session_history',
            ACHIEVEMENTS: 'signtutor_achievements',
            SETTINGS: 'signtutor_settings',
            STREAKS: 'signtutor_streaks'
        };
        
        // Debounce save operations
        this.saveTimers = {};
        this.DEBOUNCE_MS = 1000;
    }

    /**
     * Generic get from localStorage
     * @param {String} key - Storage key
     * @param {*} defaultValue - Default value if not found
     * @returns {*} Stored value or default
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            if (item === null) {
                return defaultValue;
            }
            return JSON.parse(item);
        } catch (error) {
            console.error(`Failed to get ${key} from storage:`, error);
            return defaultValue;
        }
    }

    /**
     * Generic set to localStorage
     * @param {String} key - Storage key
     * @param {*} value - Value to store
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Failed to set ${key} in storage:`, error);
        }
    }

    /**
     * Debounced save to avoid excessive writes
     * @param {String} key - Storage key
     * @param {*} value - Value to store
     * @param {Number} delay - Debounce delay in ms
     */
    debouncedSave(key, value, delay = this.DEBOUNCE_MS) {
        // Clear existing timer
        if (this.saveTimers[key]) {
            clearTimeout(this.saveTimers[key]);
        }
        
        // Set new timer
        this.saveTimers[key] = setTimeout(() => {
            this.set(key, value);
            delete this.saveTimers[key];
        }, delay);
    }

    /**
     * Get user profile
     * @returns {Object} User profile
     */
    getUserProfile() {
        return this.get(this.KEYS.USER_PROFILE, {
            name: 'Guest',
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
            totalPracticeTime: 0,
            level: 1,
            xp: 0,
            streak: 0,
            longestStreak: 0
        });
    }

    /**
     * Update user profile
     * @param {Object} profile - Profile data to update
     */
    updateUserProfile(profile) {
        const current = this.getUserProfile();
        const updated = {
            ...current,
            ...profile,
            lastActiveAt: new Date().toISOString()
        };
        this.debouncedSave(this.KEYS.USER_PROFILE, updated);
    }

    /**
     * Get letter mastery data (0-100% for each letter)
     * @returns {Object} Letter mastery map
     */
    getLetterMastery() {
        const defaultMastery = {};
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
            defaultMastery[letter] = {
                mastery: 0,
                attempts: 0,
                successes: 0,
                lastPracticed: null
            };
        });
        return this.get(this.KEYS.LETTER_MASTERY, defaultMastery);
    }

    /**
     * Update letter mastery
     * @param {String} letter - Letter ID
     * @param {Boolean} success - Whether attempt was successful
     * @param {Number} confidence - Confidence score 0-1
     */
    updateLetterMastery(letter, success, confidence = 0) {
        const mastery = this.getLetterMastery();
        
        if (!mastery[letter]) {
            mastery[letter] = { mastery: 0, attempts: 0, successes: 0, lastPracticed: null };
        }
        
        mastery[letter].attempts++;
        if (success) {
            mastery[letter].successes++;
        }
        
        // Calculate mastery percentage (weighted average of success rate and confidence)
        const successRate = mastery[letter].successes / mastery[letter].attempts;
        mastery[letter].mastery = Math.round((successRate * 70 + confidence * 30));
        mastery[letter].lastPracticed = new Date().toISOString();
        
        this.debouncedSave(this.KEYS.LETTER_MASTERY, mastery);
    }

    /**
     * Get word progress
     * @returns {Object} Word progress map
     */
    getWordProgress() {
        return this.get(this.KEYS.WORD_PROGRESS, {});
    }

    /**
     * Update word progress
     * @param {String} wordId - Word ID
     * @param {Boolean} completed - Whether word was completed
     * @param {Number} confidence - Average confidence score
     */
    updateWordProgress(wordId, completed, confidence = 0) {
        const progress = this.getWordProgress();
        
        if (!progress[wordId]) {
            progress[wordId] = { attempts: 0, completions: 0, bestConfidence: 0, lastPracticed: null };
        }
        
        progress[wordId].attempts++;
        if (completed) {
            progress[wordId].completions++;
        }
        progress[wordId].bestConfidence = Math.max(progress[wordId].bestConfidence, confidence);
        progress[wordId].lastPracticed = new Date().toISOString();
        
        this.debouncedSave(this.KEYS.WORD_PROGRESS, progress);
    }

    /**
     * Get sentence progress
     * @returns {Object} Sentence progress map
     */
    getSentenceProgress() {
        return this.get(this.KEYS.SENTENCE_PROGRESS, {});
    }

    /**
     * Update sentence progress
     * @param {String} sentenceId - Sentence ID
     * @param {Boolean} completed - Whether sentence was completed
     * @param {Number} confidence - Average confidence score
     */
    updateSentenceProgress(sentenceId, completed, confidence = 0) {
        const progress = this.getSentenceProgress();
        
        if (!progress[sentenceId]) {
            progress[sentenceId] = { attempts: 0, completions: 0, bestConfidence: 0, lastPracticed: null };
        }
        
        progress[sentenceId].attempts++;
        if (completed) {
            progress[sentenceId].completions++;
        }
        progress[sentenceId].bestConfidence = Math.max(progress[sentenceId].bestConfidence, confidence);
        progress[sentenceId].lastPracticed = new Date().toISOString();
        
        this.debouncedSave(this.KEYS.SENTENCE_PROGRESS, progress);
    }

    /**
     * Get session history
     * @returns {Array} Session history
     */
    getSessionHistory() {
        return this.get(this.KEYS.SESSION_HISTORY, []);
    }

    /**
     * Add session to history
     * @param {Object} session - Session data
     */
    addSession(session) {
        const history = this.getSessionHistory();
        
        history.push({
            ...session,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 100 sessions
        if (history.length > 100) {
            history.shift();
        }
        
        this.set(this.KEYS.SESSION_HISTORY, history);
    }

    /**
     * Get achievements
     * @returns {Object} Achievements map
     */
    getAchievements() {
        return this.get(this.KEYS.ACHIEVEMENTS, {});
    }

    /**
     * Unlock achievement
     * @param {String} achievementId - Achievement ID
     * @param {Object} data - Achievement data
     */
    unlockAchievement(achievementId, data = {}) {
        const achievements = this.getAchievements();
        
        if (!achievements[achievementId]) {
            achievements[achievementId] = {
                unlockedAt: new Date().toISOString(),
                ...data
            };
            
            this.set(this.KEYS.ACHIEVEMENTS, achievements);
            return true; // Newly unlocked
        }
        
        return false; // Already unlocked
    }

    /**
     * Get streaks data
     * @returns {Object} Streaks data
     */
    getStreaks() {
        return this.get(this.KEYS.STREAKS, {
            currentStreak: 0,
            longestStreak: 0,
            lastPracticeDate: null,
            practiceHistory: {}
        });
    }

    /**
     * Update streak data
     */
    updateStreak() {
        const streaks = this.getStreaks();
        const today = new Date().toISOString().split('T')[0];
        const lastDate = streaks.lastPracticeDate;
        
        if (lastDate === today) {
            // Already practiced today, no change
            return streaks;
        }
        
        // Check if practiced yesterday
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        if (lastDate === yesterday) {
            // Continue streak
            streaks.currentStreak++;
        } else if (lastDate) {
            // Streak broken, reset
            streaks.currentStreak = 1;
        } else {
            // First practice
            streaks.currentStreak = 1;
        }
        
        // Update longest streak
        streaks.longestStreak = Math.max(streaks.longestStreak, streaks.currentStreak);
        streaks.lastPracticeDate = today;
        
        // Track practice history (for heatmap)
        if (!streaks.practiceHistory) {
            streaks.practiceHistory = {};
        }
        streaks.practiceHistory[today] = (streaks.practiceHistory[today] || 0) + 1;
        
        this.set(this.KEYS.STREAKS, streaks);
        return streaks;
    }

    /**
     * Get settings
     * @returns {Object} Settings
     */
    getSettings() {
        return this.get(this.KEYS.SETTINGS, {
            camera: {
                deviceId: null,
                resolution: 'auto',
                mirror: true,
                showLandmarks: true
            },
            recognition: {
                sensitivity: 0.85,
                holdTime: 500,
                motionSensitivity: 0.7
            },
            visual: {
                darkMode: false,
                reducedMotion: false,
                colorBlindMode: false,
                fontSize: 'medium'
            },
            audio: {
                soundEffects: true,
                textToSpeech: false,
                volume: 0.7
            },
            progress: {
                dailyGoal: 10,
                showReminders: true
            }
        });
    }

    /**
     * Update settings
     * @param {Object} settings - Settings to update
     */
    updateSettings(settings) {
        const current = this.getSettings();
        const updated = {
            ...current,
            ...settings
        };
        this.set(this.KEYS.SETTINGS, updated);
    }

    /**
     * Export all data as JSON
     * @returns {Object} All data
     */
    exportData() {
        return {
            profile: this.getUserProfile(),
            letterMastery: this.getLetterMastery(),
            wordProgress: this.getWordProgress(),
            sentenceProgress: this.getSentenceProgress(),
            sessionHistory: this.getSessionHistory(),
            achievements: this.getAchievements(),
            streaks: this.getStreaks(),
            settings: this.getSettings(),
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Import data from JSON
     * @param {Object} data - Data to import
     * @returns {Boolean} Success
     */
    importData(data) {
        try {
            if (data.profile) this.set(this.KEYS.USER_PROFILE, data.profile);
            if (data.letterMastery) this.set(this.KEYS.LETTER_MASTERY, data.letterMastery);
            if (data.wordProgress) this.set(this.KEYS.WORD_PROGRESS, data.wordProgress);
            if (data.sentenceProgress) this.set(this.KEYS.SENTENCE_PROGRESS, data.sentenceProgress);
            if (data.sessionHistory) this.set(this.KEYS.SESSION_HISTORY, data.sessionHistory);
            if (data.achievements) this.set(this.KEYS.ACHIEVEMENTS, data.achievements);
            if (data.streaks) this.set(this.KEYS.STREAKS, data.streaks);
            if (data.settings) this.set(this.KEYS.SETTINGS, data.settings);
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }

    /**
     * Reset all progress (keeps settings)
     */
    resetProgress() {
        localStorage.removeItem(this.KEYS.USER_PROFILE);
        localStorage.removeItem(this.KEYS.LETTER_MASTERY);
        localStorage.removeItem(this.KEYS.WORD_PROGRESS);
        localStorage.removeItem(this.KEYS.SENTENCE_PROGRESS);
        localStorage.removeItem(this.KEYS.SESSION_HISTORY);
        localStorage.removeItem(this.KEYS.ACHIEVEMENTS);
        localStorage.removeItem(this.KEYS.STREAKS);
    }

    /**
     * Clear all data (including settings)
     */
    clearAll() {
        Object.values(this.KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    }
}

export const storageService = new StorageService();
