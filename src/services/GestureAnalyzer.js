import { HandLandmarker } from '@mediapipe/tasks-vision';

class GestureAnalyzer {
    constructor() {
        // Thresholds for finger states (in degrees)
        this.CURL_THRESHOLDS = {
            OPEN: 160,   // Above this is definitely open
            CLOSED: 100   // Below this is definitely closed
        };
    }

    analyze(landmarks, targetLetter) {
        if (!landmarks || landmarks.length === 0) {
            return {
                isCorrect: false,
                confidence: 0,
                feedback: 'No hand detected',
                corrections: []
            };
        }

        const hand = landmarks[0]; // Array of 21 landmarks (x, y, z)

        // Calculate state for each finger
        const fingerStates = this.getFingerStates(hand);

        // Dispatch to specific letter analysis
        if (targetLetter === 'A') {
            return this.analyzeLetterA(hand, fingerStates);
        }
        if (targetLetter === 'B') {
            return this.analyzeLetterB(hand, fingerStates);
        }

        return {
            isCorrect: false,
            confidence: 0.1,
            feedback: 'Gesture not yet implemented',
            corrections: []
        };
    }

    // --- Helper: Calculate Angle between 3 points (A-B-C) ---
    calculateAngle(a, b, c) {
        // Vectors BA and BC
        const v1 = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
        const v2 = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };

        // Dot product
        const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;

        // Magnitudes
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

        // Angle in radians
        const angleRad = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));

        // Convert to degrees
        return (angleRad * 180) / Math.PI;
    }

    // --- Helper: Get State of All Fingers ---
    getFingerStates(hand) {
        const fingers = [
            { name: 'Thumb', joints: [2, 3, 4] },  // CMC, MCP, IP (Thumb is special)
            { name: 'Index', joints: [5, 6, 7] },  // MCP, PIP, DIP
            { name: 'Middle', joints: [9, 10, 11] },
            { name: 'Ring', joints: [13, 14, 15] },
            { name: 'Pinky', joints: [17, 18, 19] }
        ];

        const states = {};

        fingers.forEach(f => {
            const angle = this.calculateAngle(
                hand[f.joints[0]],
                hand[f.joints[1]],
                hand[f.joints[2]]
            );

            let state = 'SEMI';
            if (angle > this.CURL_THRESHOLDS.OPEN) state = 'OPEN';
            else if (angle < this.CURL_THRESHOLDS.CLOSED) state = 'CLOSED';

            states[f.name] = { state, angle };
        });

        return states;
    }

    // --- Helper: Calculate Score based on Angle ---
    // target: 'OPEN' (> 160) or 'CLOSED' (< 100)
    getAngleScore(angle, target) {
        if (target === 'OPEN') {
            // 180 is perfect (1), 160 is good (0.8), 100 is bad (0)
            if (angle >= 160) return 1;
            if (angle <= 100) return 0;
            return (angle - 100) / 60; // Linear interpolation
        } else { // CLOSED
            // 0 is perfect (1), 100 is good (0.8), 160 is bad (0)
            if (angle <= 100) return 1;
            if (angle >= 160) return 0;
            return (160 - angle) / 60;
        }
    }

    // --- Letter A Analysis ---
    analyzeLetterA(hand, fingerStates) {
        const corrections = [];
        let totalScore = 0;

        // Weights: Fingers (60%), Thumb Straight (20%), Thumb Pos (20%)

        // 1. Four fingers should be CLOSED
        let fingersScore = 0;
        ['Index', 'Middle', 'Ring', 'Pinky'].forEach(f => {
            const s = this.getAngleScore(fingerStates[f].angle, 'CLOSED');
            fingersScore += s;
            if (s < 0.5) corrections.push(`Curl your ${f} finger`);
        });
        totalScore += (fingersScore / 4) * 0.6;

        // 2. Thumb should be STRAIGHT (OPEN)
        const thumbScore = this.getAngleScore(fingerStates['Thumb'].angle, 'OPEN');
        totalScore += thumbScore * 0.2;
        if (thumbScore < 0.5) corrections.push('Straighten your thumb');

        // 3. Thumb Position: Should be adjacent to Index
        const thumbTip = hand[4];
        const indexMCP = hand[5];
        const dist = Math.hypot(thumbTip.x - indexMCP.x, thumbTip.y - indexMCP.y);

        // Dist < 0.15 is perfect (1), > 0.3 is bad (0)
        let posScore = 0;
        if (dist < 0.15) posScore = 1;
        else if (dist > 0.3) posScore = 0;
        else posScore = (0.3 - dist) / 0.15;

        totalScore += posScore * 0.2;
        if (posScore < 0.5) corrections.push('Keep thumb close to side');

        // Strict check for "Success" state
        const isCorrect = totalScore > 0.92 && corrections.length === 0;

        return {
            isCorrect,
            confidence: totalScore,
            feedback: isCorrect ? 'Great job!' : 'Adjust your hand',
            corrections
        };
    }

    // --- Letter B Analysis ---
    analyzeLetterB(hand, fingerStates) {
        const corrections = [];
        let totalScore = 0;

        // 1. Four fingers should be OPEN
        let fingersScore = 0;
        ['Index', 'Middle', 'Ring', 'Pinky'].forEach(f => {
            const s = this.getAngleScore(fingerStates[f].angle, 'OPEN');
            fingersScore += s;
            if (s < 0.5) corrections.push(`Straighten your ${f} finger`);
        });
        totalScore += (fingersScore / 4) * 0.6;

        // 2. Thumb should be TUCKED
        // Check distance to palm center/pinky base
        const thumbTip = hand[4];
        const pinkyMCP = hand[17];
        const dist = Math.hypot(thumbTip.x - pinkyMCP.x, thumbTip.y - pinkyMCP.y);

        // Dist < 0.2 is perfect (1), > 0.4 is bad (0)
        let thumbScore = 0;
        if (dist < 0.2) thumbScore = 1;
        else if (dist > 0.4) thumbScore = 0;
        else thumbScore = (0.4 - dist) / 0.2;

        totalScore += thumbScore * 0.4; // Thumb is worth 40% for B
        if (thumbScore < 0.5) corrections.push('Tuck thumb across palm');

        const isCorrect = totalScore > 0.92 && corrections.length === 0;

        return {
            isCorrect,
            confidence: totalScore,
            feedback: isCorrect ? 'Perfect!' : 'Keep trying',
            corrections
        };
    }
}

export const gestureAnalyzer = new GestureAnalyzer();
