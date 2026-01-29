/**
 * MotionDetector Service
 * Tracks hand landmarks over time to detect motion patterns for letters J and Z
 */

class MotionDetector {
    constructor() {
        // Store landmark history (last 60 frames = ~2 seconds at 30fps)
        this.landmarkHistory = [];
        this.MAX_HISTORY = 60;
        
        // Motion detection thresholds
        this.MOTION_THRESHOLD = 0.05; // Minimum movement to register
        this.J_HOOK_THRESHOLD = 0.1;   // Minimum downward hook distance
        this.Z_ZIGZAG_THRESHOLD = 0.08; // Minimum zigzag distance
    }

    /**
     * Add landmark frame to history
     * @param {Array} landmarks - Hand landmarks from MediaPipe
     */
    addFrame(landmarks) {
        if (!landmarks || landmarks.length === 0) return;
        
        const hand = landmarks[0];
        const pinkyTip = hand[20]; // Pinky tip for J and Z
        
        // Store pinky tip position with timestamp
        this.landmarkHistory.push({
            timestamp: Date.now(),
            pinkyTip: { ...pinkyTip }
        });
        
        // Keep only recent history
        if (this.landmarkHistory.length > this.MAX_HISTORY) {
            this.landmarkHistory.shift();
        }
    }

    /**
     * Calculate velocity between two points
     * @param {Object} p1 - First point
     * @param {Object} p2 - Second point
     * @param {Number} timeDelta - Time difference in ms
     * @returns {Object} Velocity vector
     */
    calculateVelocity(p1, p2, timeDelta) {
        if (timeDelta === 0) return { x: 0, y: 0, z: 0 };
        
        const timeSeconds = timeDelta / 1000;
        return {
            x: (p2.x - p1.x) / timeSeconds,
            y: (p2.y - p1.y) / timeSeconds,
            z: (p2.z - p1.z) / timeSeconds
        };
    }

    /**
     * Detect J pattern (hook down motion)
     * J starts with I shape (pinky up), then draws a hook down and to the left
     * @returns {Object} Detection result with confidence
     */
    detectJPattern() {
        if (this.landmarkHistory.length < 15) {
            return { detected: false, confidence: 0, pattern: 'J' };
        }
        
        // Get recent path (last 0.5 seconds at 30fps = ~15 frames)
        const recentPath = this.landmarkHistory.slice(-15);
        const start = recentPath[0].pinkyTip;
        const end = recentPath[recentPath.length - 1].pinkyTip;
        
        // J motion should have:
        // 1. Downward movement (positive y)
        // 2. Slight leftward curve at the end
        const deltaY = end.y - start.y;
        const deltaX = end.x - start.x;
        
        // Check if there's downward motion
        if (deltaY < this.J_HOOK_THRESHOLD) {
            return { detected: false, confidence: 0, pattern: 'J' };
        }
        
        // Check for hook shape (path should curve)
        const midPoint = recentPath[Math.floor(recentPath.length / 2)].pinkyTip;
        const hookAmount = Math.abs(midPoint.x - start.x);
        
        // Calculate confidence based on motion characteristics
        let confidence = 0;
        
        // Strong downward motion increases confidence
        confidence += Math.min(deltaY / this.J_HOOK_THRESHOLD, 1) * 0.5;
        
        // Hook curve increases confidence
        if (hookAmount > 0.02) {
            confidence += 0.3;
        }
        
        // Smooth motion (not jerky) increases confidence
        const velocities = [];
        for (let i = 1; i < recentPath.length; i++) {
            const timeDelta = recentPath[i].timestamp - recentPath[i - 1].timestamp;
            const vel = this.calculateVelocity(
                recentPath[i - 1].pinkyTip,
                recentPath[i].pinkyTip,
                timeDelta
            );
            velocities.push(Math.hypot(vel.x, vel.y, vel.z));
        }
        
        const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
        if (avgVelocity > 0.1 && avgVelocity < 1.0) {
            confidence += 0.2;
        }
        
        return {
            detected: confidence > 0.7,
            confidence,
            pattern: 'J',
            direction: { x: deltaX, y: deltaY }
        };
    }

    /**
     * Detect Z pattern (zigzag motion)
     * Z starts with I shape (pinky up), then draws a Z shape
     * @returns {Object} Detection result with confidence
     */
    detectZPattern() {
        if (this.landmarkHistory.length < 20) {
            return { detected: false, confidence: 0, pattern: 'Z' };
        }
        
        // Get recent path (last ~0.67 seconds)
        const recentPath = this.landmarkHistory.slice(-20);
        
        // Z motion should have three segments:
        // 1. Right and down (first diagonal)
        // 2. Left and down (second diagonal)
        // 3. Right and down (third diagonal)
        
        const segmentSize = Math.floor(recentPath.length / 3);
        const segment1 = recentPath.slice(0, segmentSize);
        const segment2 = recentPath.slice(segmentSize, segmentSize * 2);
        const segment3 = recentPath.slice(segmentSize * 2);
        
        // Calculate direction for each segment
        const dir1 = {
            x: segment1[segment1.length - 1].pinkyTip.x - segment1[0].pinkyTip.x,
            y: segment1[segment1.length - 1].pinkyTip.y - segment1[0].pinkyTip.y
        };
        
        const dir2 = {
            x: segment2[segment2.length - 1].pinkyTip.x - segment2[0].pinkyTip.x,
            y: segment2[segment2.length - 1].pinkyTip.y - segment2[0].pinkyTip.y
        };
        
        const dir3 = {
            x: segment3[segment3.length - 1].pinkyTip.x - segment3[0].pinkyTip.x,
            y: segment3[segment3.length - 1].pinkyTip.y - segment3[0].pinkyTip.y
        };
        
        // Check for zigzag pattern
        let confidence = 0;
        
        // Segment 1: Should move right-down (positive x, positive y)
        if (dir1.x > this.MOTION_THRESHOLD && dir1.y > this.MOTION_THRESHOLD) {
            confidence += 0.33;
        }
        
        // Segment 2: Should move left-down (negative x, positive y)
        if (dir2.x < -this.MOTION_THRESHOLD && dir2.y > this.MOTION_THRESHOLD) {
            confidence += 0.33;
        }
        
        // Segment 3: Should move right-down (positive x, positive y)
        if (dir3.x > this.MOTION_THRESHOLD && dir3.y > this.MOTION_THRESHOLD) {
            confidence += 0.34;
        }
        
        return {
            detected: confidence > 0.7,
            confidence,
            pattern: 'Z',
            segments: { dir1, dir2, dir3 }
        };
    }

    /**
     * Clear motion history
     */
    reset() {
        this.landmarkHistory = [];
    }

    /**
     * Get current motion state for debugging
     * @returns {Object} Current state info
     */
    getState() {
        return {
            historyLength: this.landmarkHistory.length,
            maxHistory: this.MAX_HISTORY,
            hasEnoughData: this.landmarkHistory.length >= 15
        };
    }
}

export const motionDetector = new MotionDetector();
