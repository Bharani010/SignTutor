import { HandLandmarker } from '@mediapipe/tasks-vision';

class GestureAnalyzer {
    analyze(landmarks, targetLetter) {
        if (!landmarks || landmarks.length === 0) {
            return {
                isCorrect: false,
                confidence: 0,
                feedback: 'No hand detected',
                corrections: []
            };
        }

        const hand = landmarks[0]; // Array of 21 landmarks

        // Basic heuristic for 'A' (Fist with thumb against side)
        if (targetLetter === 'A') {
            return this.analyzeLetterA(hand);
        }

        // Default for others
        return {
            isCorrect: false,
            confidence: 0.1,
            feedback: 'Gesture not yet implemented',
            corrections: []
        };
    }

    analyzeLetterA(hand) {
        const corrections = [];
        let score = 0;

        // Check if fingers are curled (Tip should be below PIP for upright hand)
        // Note: Y increases downwards. So Tip > PIP means curled down? 
        // Wait, if hand is upright (wrist at bottom), Tip Y should be > PIP Y if curled? 
        // No, Wrist is high Y (bottom of screen), Fingers are low Y (top of screen).
        // So Tip Y > PIP Y means Tip is "lower" (closer to wrist) than PIP. Yes.

        const fingers = [
            { name: 'Index', tip: 8, pip: 6 },
            { name: 'Middle', tip: 12, pip: 10 },
            { name: 'Ring', tip: 16, pip: 14 },
            { name: 'Pinky', tip: 20, pip: 18 }
        ];

        let curledCount = 0;
        fingers.forEach(f => {
            if (hand[f.tip].y > hand[f.pip].y) {
                curledCount++;
            } else {
                corrections.push(`Curl your ${f.name} finger`);
            }
        });

        if (curledCount === 4) score += 0.6;
        else score += (curledCount / 4) * 0.6;

        // Check Thumb (Should be straight up)
        // Thumb Tip (4) should be above Thumb IP (3) (lower Y value)
        if (hand[4].y < hand[3].y) {
            score += 0.2;
        } else {
            corrections.push('Point your thumb up');
        }

        // Thumb should be close to Index MCP (5)
        // Simple distance check
        const dist = Math.hypot(hand[4].x - hand[5].x, hand[4].y - hand[5].y);
        if (dist < 0.1) { // Normalized coordinates
            score += 0.2;
        } else {
            corrections.push('Tuck thumb closer to hand');
        }

        return {
            isCorrect: score > 0.8,
            confidence: score,
            feedback: score > 0.8 ? 'Great job!' : 'Adjust your hand',
            corrections: corrections
        };
    }
}

export const gestureAnalyzer = new GestureAnalyzer();
