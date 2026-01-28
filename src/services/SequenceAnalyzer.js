/**
 * SequenceAnalyzer Service
 * Analyzes sequences of signs to recognize words and sentences
 */

import { gestureAnalyzer } from './GestureAnalyzer';

class SequenceAnalyzer {
    constructor() {
        // Sequence state
        this.currentSequence = [];
        this.targetSequence = [];
        this.currentSignIndex = 0;
        
        // Timing thresholds
        this.MIN_PAUSE_MS = 500;  // Minimum pause between signs
        this.MAX_PAUSE_MS = 3000; // Maximum pause before sequence reset
        this.HOLD_TIME_MS = 800;  // How long to hold correct sign
        
        // State tracking
        this.lastSignTime = null;
        this.lastSignCorrect = false;
        this.currentSignStartTime = null;
        this.signHoldStartTime = null;
    }

    /**
     * Start a new sequence learning session
     * @param {Array} signSequence - Array of sign IDs to learn
     */
    startSequence(signSequence) {
        if (!signSequence || signSequence.length === 0) {
            throw new Error('Sign sequence cannot be empty');
        }
        
        this.targetSequence = [...signSequence];
        this.currentSequence = [];
        this.currentSignIndex = 0;
        this.lastSignTime = null;
        this.lastSignCorrect = false;
        this.currentSignStartTime = Date.now();
        this.signHoldStartTime = null;
    }

    /**
     * Analyze current hand landmarks against target sequence
     * @param {Array} landmarks - Hand landmarks from MediaPipe
     * @returns {Object} Analysis result
     */
    analyze(landmarks) {
        if (this.targetSequence.length === 0) {
            return {
                isComplete: false,
                currentSignIndex: 0,
                totalSigns: 0,
                feedback: 'No sequence loaded',
                corrections: [],
                confidence: 0,
                progress: 0
            };
        }

        // Check if sequence is already complete
        if (this.currentSignIndex >= this.targetSequence.length) {
            return {
                isComplete: true,
                currentSignIndex: this.currentSignIndex,
                totalSigns: this.targetSequence.length,
                feedback: 'Sequence complete!',
                corrections: [],
                confidence: 1,
                progress: 1,
                completedSequence: this.currentSequence
            };
        }

        // Get current target sign
        const targetSign = this.targetSequence[this.currentSignIndex];
        
        // Analyze current hand gesture
        const result = gestureAnalyzer.analyze(landmarks, targetSign);
        
        // Check for timeout (pause too long)
        const now = Date.now();
        if (this.lastSignTime && (now - this.lastSignTime) > this.MAX_PAUSE_MS) {
            // Reset sequence if paused too long
            return this.handleTimeout();
        }

        // Handle sign detection
        if (result.isCorrect) {
            return this.handleCorrectSign(targetSign, result, now);
        } else {
            return this.handleIncorrectSign(targetSign, result);
        }
    }

    /**
     * Handle correct sign detection
     * @param {String} targetSign - Current target sign ID
     * @param {Object} result - Gesture analysis result
     * @param {Number} now - Current timestamp
     * @returns {Object} Analysis result
     */
    handleCorrectSign(targetSign, result, now) {
        // Start hold timer if this is first correct detection
        if (!this.signHoldStartTime) {
            this.signHoldStartTime = now;
        }

        const holdTime = now - this.signHoldStartTime;
        
        // Check if sign has been held long enough
        if (holdTime >= this.HOLD_TIME_MS) {
            // Sign confirmed! Move to next sign
            this.currentSequence.push({
                sign: targetSign,
                timestamp: now,
                confidence: result.confidence,
                holdTime: holdTime
            });
            
            this.currentSignIndex++;
            this.lastSignTime = now;
            this.lastSignCorrect = true;
            this.signHoldStartTime = null;
            
            // Check if sequence is complete
            if (this.currentSignIndex >= this.targetSequence.length) {
                return {
                    isComplete: true,
                    currentSignIndex: this.currentSignIndex,
                    totalSigns: this.targetSequence.length,
                    feedback: 'Excellent! Sequence complete!',
                    corrections: [],
                    confidence: 1,
                    progress: 1,
                    completedSequence: this.currentSequence,
                    stats: this.getStats()
                };
            }
            
            // More signs to go
            return {
                isComplete: false,
                currentSignIndex: this.currentSignIndex,
                totalSigns: this.targetSequence.length,
                feedback: `Great! Now show: ${this.targetSequence[this.currentSignIndex]}`,
                corrections: [],
                confidence: result.confidence,
                progress: this.currentSignIndex / this.targetSequence.length,
                currentTarget: this.targetSequence[this.currentSignIndex],
                justCompleted: targetSign
            };
        } else {
            // Still holding, show progress
            const holdProgress = holdTime / this.HOLD_TIME_MS;
            return {
                isComplete: false,
                currentSignIndex: this.currentSignIndex,
                totalSigns: this.targetSequence.length,
                feedback: `Hold it... ${Math.round(holdProgress * 100)}%`,
                corrections: [],
                confidence: result.confidence,
                progress: (this.currentSignIndex + holdProgress) / this.targetSequence.length,
                currentTarget: targetSign,
                holdProgress
            };
        }
    }

    /**
     * Handle incorrect sign detection
     * @param {String} targetSign - Current target sign ID
     * @param {Object} result - Gesture analysis result
     * @returns {Object} Analysis result
     */
    handleIncorrectSign(targetSign, result) {
        // Reset hold timer if sign was incorrect
        this.signHoldStartTime = null;
        
        return {
            isComplete: false,
            currentSignIndex: this.currentSignIndex,
            totalSigns: this.targetSequence.length,
            feedback: result.feedback,
            corrections: result.corrections,
            confidence: result.confidence,
            progress: this.currentSignIndex / this.targetSequence.length,
            currentTarget: targetSign
        };
    }

    /**
     * Handle sequence timeout (pause too long)
     * @returns {Object} Analysis result
     */
    handleTimeout() {
        this.reset();
        return {
            isComplete: false,
            currentSignIndex: 0,
            totalSigns: this.targetSequence.length,
            feedback: 'Timeout - sequence reset',
            corrections: ['Try again! Show the first sign'],
            confidence: 0,
            progress: 0,
            currentTarget: this.targetSequence[0],
            timedOut: true
        };
    }

    /**
     * Get sequence completion statistics
     * @returns {Object} Statistics
     */
    getStats() {
        if (this.currentSequence.length === 0) {
            return null;
        }

        const totalTime = this.currentSequence[this.currentSequence.length - 1].timestamp - 
                         this.currentSequence[0].timestamp;
        
        const avgConfidence = this.currentSequence.reduce(
            (sum, item) => sum + item.confidence, 0
        ) / this.currentSequence.length;
        
        const avgHoldTime = this.currentSequence.reduce(
            (sum, item) => sum + item.holdTime, 0
        ) / this.currentSequence.length;

        return {
            totalTime,
            avgConfidence,
            avgHoldTime,
            signCount: this.currentSequence.length,
            completedSequence: this.currentSequence
        };
    }

    /**
     * Get current sequence progress
     * @returns {Object} Progress info
     */
    getProgress() {
        return {
            currentSignIndex: this.currentSignIndex,
            totalSigns: this.targetSequence.length,
            progress: this.currentSignIndex / Math.max(this.targetSequence.length, 1),
            completedSigns: this.currentSequence.map(s => s.sign),
            remainingSigns: this.targetSequence.slice(this.currentSignIndex)
        };
    }

    /**
     * Skip current sign
     * @returns {Object} Updated progress
     */
    skipCurrentSign() {
        if (this.currentSignIndex < this.targetSequence.length) {
            const skippedSign = this.targetSequence[this.currentSignIndex];
            
            this.currentSequence.push({
                sign: skippedSign,
                timestamp: Date.now(),
                confidence: 0,
                holdTime: 0,
                skipped: true
            });
            
            this.currentSignIndex++;
            this.signHoldStartTime = null;
            this.lastSignTime = Date.now();
        }
        
        return this.getProgress();
    }

    /**
     * Reset sequence to start
     */
    reset() {
        this.currentSequence = [];
        this.currentSignIndex = 0;
        this.lastSignTime = null;
        this.lastSignCorrect = false;
        this.currentSignStartTime = Date.now();
        this.signHoldStartTime = null;
    }

    /**
     * Clear target sequence (end session)
     */
    clear() {
        this.targetSequence = [];
        this.reset();
    }

    /**
     * Get current state for debugging
     * @returns {Object} Current state
     */
    getState() {
        return {
            targetSequence: this.targetSequence,
            currentSequence: this.currentSequence.map(s => s.sign),
            currentSignIndex: this.currentSignIndex,
            isActive: this.targetSequence.length > 0,
            progress: this.getProgress()
        };
    }
}

export const sequenceAnalyzer = new SequenceAnalyzer();
