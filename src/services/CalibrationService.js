/**
 * CalibrationService
 * Handles hand size and distance calibration for improved gesture recognition
 */

class CalibrationService {
    constructor() {
        this.STORAGE_KEY = 'signtutor_calibration';
        this.calibrationData = this.loadCalibration();
    }

    /**
     * Load calibration data from localStorage
     * @returns {Object} Calibration data
     */
    loadCalibration() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load calibration:', error);
        }
        
        // Default calibration values
        return {
            handSize: 1.0,        // Normalized hand size multiplier
            distance: 1.0,        // Distance from camera multiplier
            cameraHeight: 1.0,    // Camera height adjustment
            isCalibrated: false,
            calibratedAt: null
        };
    }

    /**
     * Save calibration data to localStorage
     */
    saveCalibration() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.calibrationData));
        } catch (error) {
            console.error('Failed to save calibration:', error);
        }
    }

    /**
     * Perform calibration using hand landmarks
     * @param {Array} landmarks - Hand landmarks from MediaPipe
     * @returns {Object} Calibration result
     */
    calibrate(landmarks) {
        if (!landmarks || landmarks.length === 0) {
            return {
                success: false,
                message: 'No hand detected'
            };
        }

        const hand = landmarks[0];
        
        // Calculate hand size (distance from wrist to middle finger tip)
        const wrist = hand[0];
        const middleTip = hand[12];
        const handSize = Math.hypot(
            middleTip.x - wrist.x,
            middleTip.y - wrist.y,
            middleTip.z - wrist.z
        );
        
        // Calculate distance from camera (using z-depth)
        const avgZ = hand.reduce((sum, landmark) => sum + landmark.z, 0) / hand.length;
        const distance = Math.abs(avgZ);
        
        // Calculate camera height (y position of wrist)
        const cameraHeight = wrist.y;
        
        // Store reference values
        this.calibrationData = {
            handSize: handSize || 1.0,
            distance: distance || 1.0,
            cameraHeight: cameraHeight || 0.5,
            isCalibrated: true,
            calibratedAt: new Date().toISOString()
        };
        
        this.saveCalibration();
        
        return {
            success: true,
            message: 'Calibration successful!',
            data: this.calibrationData
        };
    }

    /**
     * Normalize hand landmarks based on calibration
     * @param {Array} landmarks - Hand landmarks from MediaPipe
     * @returns {Array} Normalized landmarks
     */
    normalizeLandmarks(landmarks) {
        if (!landmarks || landmarks.length === 0 || !this.calibrationData.isCalibrated) {
            return landmarks;
        }

        const hand = landmarks[0];
        
        // Calculate current hand size
        const wrist = hand[0];
        const middleTip = hand[12];
        const currentHandSize = Math.hypot(
            middleTip.x - wrist.x,
            middleTip.y - wrist.y,
            middleTip.z - wrist.z
        );
        
        // Calculate size multiplier
        const sizeMultiplier = this.calibrationData.handSize / currentHandSize;
        
        // Normalize all landmarks
        return landmarks.map(handLandmarks => {
            return handLandmarks.map(landmark => ({
                x: landmark.x * sizeMultiplier,
                y: landmark.y * sizeMultiplier,
                z: landmark.z * sizeMultiplier
            }));
        });
    }

    /**
     * Get adjustment factors for gesture analysis
     * @returns {Object} Adjustment factors
     */
    getAdjustmentFactors() {
        if (!this.calibrationData.isCalibrated) {
            return {
                sizeAdjustment: 1.0,
                distanceAdjustment: 1.0,
                heightAdjustment: 1.0
            };
        }

        return {
            sizeAdjustment: this.calibrationData.handSize,
            distanceAdjustment: this.calibrationData.distance,
            heightAdjustment: this.calibrationData.cameraHeight
        };
    }

    /**
     * Check if calibration is needed
     * @returns {Boolean} True if calibration is recommended
     */
    needsCalibration() {
        if (!this.calibrationData.isCalibrated) {
            return true;
        }

        // Check if calibration is old (> 7 days)
        if (this.calibrationData.calibratedAt) {
            const calibratedDate = new Date(this.calibrationData.calibratedAt);
            const daysSince = (Date.now() - calibratedDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSince > 7) {
                return true;
            }
        }

        return false;
    }

    /**
     * Reset calibration to defaults
     */
    reset() {
        this.calibrationData = {
            handSize: 1.0,
            distance: 1.0,
            cameraHeight: 1.0,
            isCalibrated: false,
            calibratedAt: null
        };
        this.saveCalibration();
    }

    /**
     * Get current calibration status
     * @returns {Object} Calibration status
     */
    getStatus() {
        return {
            isCalibrated: this.calibrationData.isCalibrated,
            calibratedAt: this.calibrationData.calibratedAt,
            needsCalibration: this.needsCalibration(),
            data: { ...this.calibrationData }
        };
    }

    /**
     * Perform quick calibration check with sample
     * @param {Array} landmarks - Hand landmarks sample
     * @returns {Object} Quick check result
     */
    quickCheck(landmarks) {
        if (!landmarks || landmarks.length === 0) {
            return {
                status: 'no_hand',
                message: 'Please show your hand to the camera'
            };
        }

        const hand = landmarks[0];
        const wrist = hand[0];
        const middleTip = hand[12];
        
        const handSize = Math.hypot(
            middleTip.x - wrist.x,
            middleTip.y - wrist.y,
            middleTip.z - wrist.z
        );
        
        // Check if hand is too close or too far
        if (handSize > 0.4) {
            return {
                status: 'too_close',
                message: 'Move your hand further from the camera'
            };
        } else if (handSize < 0.15) {
            return {
                status: 'too_far',
                message: 'Move your hand closer to the camera'
            };
        }
        
        // Check if hand is centered
        const centerX = hand.reduce((sum, l) => sum + l.x, 0) / hand.length;
        const centerY = hand.reduce((sum, l) => sum + l.y, 0) / hand.length;
        
        if (centerX < 0.3 || centerX > 0.7) {
            return {
                status: 'off_center_x',
                message: 'Center your hand horizontally'
            };
        }
        
        if (centerY < 0.2 || centerY > 0.8) {
            return {
                status: 'off_center_y',
                message: 'Center your hand vertically'
            };
        }
        
        return {
            status: 'good',
            message: 'Hand position looks good!',
            handSize
        };
    }
}

export const calibrationService = new CalibrationService();
