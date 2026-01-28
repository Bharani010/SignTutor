import { HandLandmarker } from '@mediapipe/tasks-vision';

class GestureAnalyzer {
    constructor() {
        // Thresholds for finger states (in degrees)
        this.CURL_THRESHOLDS = {
            OPEN: 160,   // Above this is definitely open
            CLOSED: 100   // Below this is definitely closed
        };
        
        // Confidence smoothing
        this.confidenceHistory = [];
        this.HISTORY_SIZE = 10;
        
        // False positive reduction
        this.successStartTime = null;
        this.HOLD_TIME_MS = 500;
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
        const letterAnalyzers = {
            'A': () => this.analyzeLetterA(hand, fingerStates),
            'B': () => this.analyzeLetterB(hand, fingerStates),
            'C': () => this.analyzeLetterC(hand, fingerStates),
            'D': () => this.analyzeLetterD(hand, fingerStates),
            'E': () => this.analyzeLetterE(hand, fingerStates),
            'F': () => this.analyzeLetterF(hand, fingerStates),
            'G': () => this.analyzeLetterG(hand, fingerStates),
            'H': () => this.analyzeLetterH(hand, fingerStates),
            'I': () => this.analyzeLetterI(hand, fingerStates),
            'J': () => this.analyzeLetterJ(hand, fingerStates), // Motion-based
            'K': () => this.analyzeLetterK(hand, fingerStates),
            'L': () => this.analyzeLetterL(hand, fingerStates),
            'M': () => this.analyzeLetterM(hand, fingerStates),
            'N': () => this.analyzeLetterN(hand, fingerStates),
            'O': () => this.analyzeLetterO(hand, fingerStates),
            'P': () => this.analyzeLetterP(hand, fingerStates),
            'Q': () => this.analyzeLetterQ(hand, fingerStates),
            'R': () => this.analyzeLetterR(hand, fingerStates),
            'S': () => this.analyzeLetterS(hand, fingerStates),
            'T': () => this.analyzeLetterT(hand, fingerStates),
            'U': () => this.analyzeLetterU(hand, fingerStates),
            'V': () => this.analyzeLetterV(hand, fingerStates),
            'W': () => this.analyzeLetterW(hand, fingerStates),
            'X': () => this.analyzeLetterX(hand, fingerStates),
            'Y': () => this.analyzeLetterY(hand, fingerStates),
            'Z': () => this.analyzeLetterZ(hand, fingerStates), // Motion-based
        };

        if (letterAnalyzers[targetLetter]) {
            const result = letterAnalyzers[targetLetter]();
            return this.applyConfidenceSmoothing(result);
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

    // --- Helper: Calculate distance between two points ---
    getDistance(p1, p2) {
        return Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
    }

    // --- Helper: Detect fist shape ---
    detectFist(fingerStates) {
        const fingers = ['Index', 'Middle', 'Ring', 'Pinky'];
        let score = 0;
        fingers.forEach(f => {
            score += this.getAngleScore(fingerStates[f].angle, 'CLOSED');
        });
        return score / fingers.length;
    }

    // --- Helper: Detect open palm ---
    detectOpenPalm(fingerStates) {
        const fingers = ['Index', 'Middle', 'Ring', 'Pinky'];
        let score = 0;
        fingers.forEach(f => {
            score += this.getAngleScore(fingerStates[f].angle, 'OPEN');
        });
        return score / fingers.length;
    }

    // --- Helper: Detect pointing finger (index extended, others closed) ---
    detectPointingFinger(fingerStates) {
        const indexScore = this.getAngleScore(fingerStates['Index'].angle, 'OPEN');
        const otherScore = (
            this.getAngleScore(fingerStates['Middle'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Ring'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Pinky'].angle, 'CLOSED')
        ) / 3;
        return (indexScore * 0.6 + otherScore * 0.4);
    }

    // --- Helper: Detect V shape (index and middle extended) ---
    detectVShape(fingerStates) {
        const indexScore = this.getAngleScore(fingerStates['Index'].angle, 'OPEN');
        const middleScore = this.getAngleScore(fingerStates['Middle'].angle, 'OPEN');
        const otherScore = (
            this.getAngleScore(fingerStates['Ring'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Pinky'].angle, 'CLOSED')
        ) / 2;
        return (indexScore * 0.35 + middleScore * 0.35 + otherScore * 0.3);
    }

    // --- Helper: Detect OK/F shape (thumb and index touching) ---
    detectOkayShape(hand, fingerStates) {
        const thumbTip = hand[4];
        const indexTip = hand[8];
        const dist = this.getDistance(thumbTip, indexTip);
        
        // Check if thumb and index are close (touching)
        const touchScore = dist < 0.05 ? 1 : (dist < 0.1 ? 0.5 : 0);
        
        // Check if other fingers are extended
        const otherScore = (
            this.getAngleScore(fingerStates['Middle'].angle, 'OPEN') +
            this.getAngleScore(fingerStates['Ring'].angle, 'OPEN') +
            this.getAngleScore(fingerStates['Pinky'].angle, 'OPEN')
        ) / 3;
        
        return (touchScore * 0.5 + otherScore * 0.5);
    }

    // --- Helper: Detect L shape (thumb and index at 90 degrees) ---
    detectLShape(hand, fingerStates) {
        const thumbScore = this.getAngleScore(fingerStates['Thumb'].angle, 'OPEN');
        const indexScore = this.getAngleScore(fingerStates['Index'].angle, 'OPEN');
        const otherScore = (
            this.getAngleScore(fingerStates['Middle'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Ring'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Pinky'].angle, 'CLOSED')
        ) / 3;
        
        return (thumbScore * 0.35 + indexScore * 0.35 + otherScore * 0.3);
    }

    // --- Helper: Detect curved fingers (C, O shape) ---
    detectCurvedFingers(fingerStates) {
        const fingers = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
        let score = 0;
        fingers.forEach(f => {
            const angle = fingerStates[f].angle;
            // Semi-closed is ideal for curved (around 120-140 degrees)
            if (angle >= 110 && angle <= 150) {
                score += 1;
            } else if (angle >= 100 && angle <= 160) {
                score += 0.7;
            } else {
                score += 0.3;
            }
        });
        return score / fingers.length;
    }

    // --- Helper: Get palm orientation ---
    getPalmOrientation(hand) {
        const wrist = hand[0];
        const middleMCP = hand[9];
        
        // Calculate palm normal vector
        const palmVector = {
            x: middleMCP.x - wrist.x,
            y: middleMCP.y - wrist.y,
            z: middleMCP.z - wrist.z
        };
        
        // Determine dominant direction
        const absX = Math.abs(palmVector.x);
        const absY = Math.abs(palmVector.y);
        const absZ = Math.abs(palmVector.z);
        
        if (absZ > absX && absZ > absY) {
            return palmVector.z > 0 ? 'forward' : 'back';
        } else if (absY > absX) {
            return palmVector.y > 0 ? 'down' : 'up';
        } else {
            return palmVector.x > 0 ? 'right' : 'left';
        }
    }

    // --- Helper: Apply confidence smoothing ---
    applyConfidenceSmoothing(result) {
        // Add to history
        this.confidenceHistory.push(result.confidence);
        if (this.confidenceHistory.length > this.HISTORY_SIZE) {
            this.confidenceHistory.shift();
        }
        
        // Calculate running average
        const avgConfidence = this.confidenceHistory.reduce((a, b) => a + b, 0) / this.confidenceHistory.length;
        
        // Apply false positive reduction (hold time requirement)
        if (avgConfidence > 0.9) {
            if (!this.successStartTime) {
                this.successStartTime = Date.now();
            }
            const holdTime = Date.now() - this.successStartTime;
            if (holdTime < this.HOLD_TIME_MS) {
                // Still in hold period
                return {
                    ...result,
                    confidence: avgConfidence,
                    isCorrect: false,
                    feedback: 'Hold steady...'
                };
            }
            // Hold time met!
            return {
                ...result,
                confidence: avgConfidence,
                isCorrect: true
            };
        } else {
            // Reset hold time if confidence drops
            this.successStartTime = null;
            return {
                ...result,
                confidence: avgConfidence
            };
        }
    }

    // --- Helper: Normalize hand size ---
    normalizeHand(hand) {
        // Calculate hand size (wrist to middle finger tip)
        const wrist = hand[0];
        const middleTip = hand[12];
        const handSize = this.getDistance(wrist, middleTip);
        
        // Normalize all landmarks
        return hand.map(landmark => ({
            x: landmark.x / handSize,
            y: landmark.y / handSize,
            z: landmark.z / handSize
        }));
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

    // --- Letter C Analysis ---
    analyzeLetterC(hand, fingerStates) {
        const corrections = [];
        const curvedScore = this.detectCurvedFingers(fingerStates);
        
        if (curvedScore < 0.6) corrections.push('Curve your fingers more');
        
        return {
            isCorrect: curvedScore > 0.85,
            confidence: curvedScore,
            feedback: curvedScore > 0.85 ? 'Great C shape!' : 'Form a C curve',
            corrections
        };
    }

    // --- Letter D Analysis ---
    analyzeLetterD(hand, fingerStates) {
        const corrections = [];
        let totalScore = 0;
        
        // Index should be OPEN
        const indexScore = this.getAngleScore(fingerStates['Index'].angle, 'OPEN');
        totalScore += indexScore * 0.5;
        if (indexScore < 0.6) corrections.push('Straighten index finger');
        
        // Other fingers should be CLOSED and touching thumb
        const otherScore = (
            this.getAngleScore(fingerStates['Middle'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Ring'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Pinky'].angle, 'CLOSED')
        ) / 3;
        totalScore += otherScore * 0.5;
        if (otherScore < 0.6) corrections.push('Curl other fingers to thumb');
        
        return {
            isCorrect: totalScore > 0.85,
            confidence: totalScore,
            feedback: totalScore > 0.85 ? 'Perfect D!' : 'Keep trying',
            corrections
        };
    }

    // --- Letter E Analysis ---
    analyzeLetterE(hand, fingerStates) {
        const corrections = [];
        const fistScore = this.detectFist(fingerStates);
        
        // All fingers should be tightly curled
        if (fistScore < 0.7) corrections.push('Curl all fingers tighter');
        
        return {
            isCorrect: fistScore > 0.88,
            confidence: fistScore,
            feedback: fistScore > 0.88 ? 'Perfect E!' : 'Make a tight fist',
            corrections
        };
    }

    // --- Letter F Analysis ---
    analyzeLetterF(hand, fingerStates) {
        const corrections = [];
        const okScore = this.detectOkayShape(hand, fingerStates);
        
        if (okScore < 0.6) corrections.push('Touch thumb and index, extend other fingers');
        
        return {
            isCorrect: okScore > 0.82,
            confidence: okScore,
            feedback: okScore > 0.82 ? 'Perfect F!' : 'Form OK shape',
            corrections
        };
    }

    // --- Letter G Analysis ---
    analyzeLetterG(hand, fingerStates) {
        const corrections = [];
        let totalScore = 0;
        
        // Index and thumb should be OPEN and parallel
        const indexScore = this.getAngleScore(fingerStates['Index'].angle, 'OPEN');
        const thumbScore = this.getAngleScore(fingerStates['Thumb'].angle, 'OPEN');
        totalScore += (indexScore + thumbScore) / 2 * 0.7;
        
        if (indexScore < 0.6) corrections.push('Extend index finger');
        if (thumbScore < 0.6) corrections.push('Extend thumb');
        
        // Other fingers should be CLOSED
        const otherScore = (
            this.getAngleScore(fingerStates['Middle'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Ring'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Pinky'].angle, 'CLOSED')
        ) / 3;
        totalScore += otherScore * 0.3;
        
        return {
            isCorrect: totalScore > 0.85,
            confidence: totalScore,
            feedback: totalScore > 0.85 ? 'Perfect G!' : 'Point sideways',
            corrections
        };
    }

    // --- Letter H Analysis ---
    analyzeLetterH(hand, fingerStates) {
        const corrections = [];
        let totalScore = 0;
        
        // Index and middle should be OPEN
        const indexScore = this.getAngleScore(fingerStates['Index'].angle, 'OPEN');
        const middleScore = this.getAngleScore(fingerStates['Middle'].angle, 'OPEN');
        totalScore += (indexScore + middleScore) / 2 * 0.7;
        
        if (indexScore < 0.6) corrections.push('Extend index finger');
        if (middleScore < 0.6) corrections.push('Extend middle finger');
        
        // Other fingers should be CLOSED
        const otherScore = (
            this.getAngleScore(fingerStates['Ring'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Pinky'].angle, 'CLOSED')
        ) / 2;
        totalScore += otherScore * 0.3;
        
        return {
            isCorrect: totalScore > 0.85,
            confidence: totalScore,
            feedback: totalScore > 0.85 ? 'Perfect H!' : 'Two fingers horizontal',
            corrections
        };
    }

    // --- Letter I Analysis ---
    analyzeLetterI(hand, fingerStates) {
        const corrections = [];
        let totalScore = 0;
        
        // Pinky should be OPEN
        const pinkyScore = this.getAngleScore(fingerStates['Pinky'].angle, 'OPEN');
        totalScore += pinkyScore * 0.6;
        if (pinkyScore < 0.6) corrections.push('Extend pinky finger');
        
        // Other fingers should be CLOSED
        const otherScore = (
            this.getAngleScore(fingerStates['Index'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Middle'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Ring'].angle, 'CLOSED')
        ) / 3;
        totalScore += otherScore * 0.4;
        if (otherScore < 0.6) corrections.push('Close other fingers');
        
        return {
            isCorrect: totalScore > 0.85,
            confidence: totalScore,
            feedback: totalScore > 0.85 ? 'Perfect I!' : 'Pinky up only',
            corrections
        };
    }

    // --- Letter J Analysis (motion required) ---
    analyzeLetterJ(hand, fingerStates) {
        // J starts with I shape then draws a hook
        // For now, just check for I shape (motion detection would be added with MotionDetector)
        const corrections = [];
        let totalScore = 0;
        
        const pinkyScore = this.getAngleScore(fingerStates['Pinky'].angle, 'OPEN');
        totalScore += pinkyScore * 0.6;
        
        const otherScore = (
            this.getAngleScore(fingerStates['Index'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Middle'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Ring'].angle, 'CLOSED')
        ) / 3;
        totalScore += otherScore * 0.4;
        
        corrections.push('Draw a J motion with your pinky');
        
        return {
            isCorrect: false, // Motion required
            confidence: totalScore * 0.7, // Reduced since motion not detected
            feedback: 'Make I shape, then hook down',
            corrections
        };
    }

    // --- Letter K Analysis ---
    analyzeLetterK(hand, fingerStates) {
        const corrections = [];
        let totalScore = 0;
        
        // Index and middle should be OPEN with thumb between
        const vScore = this.detectVShape(fingerStates);
        totalScore += vScore * 0.7;
        
        if (vScore < 0.6) corrections.push('Extend index and middle fingers');
        
        // Check thumb position (should be between the two fingers)
        const thumbScore = this.getAngleScore(fingerStates['Thumb'].angle, 'OPEN');
        totalScore += thumbScore * 0.3;
        
        return {
            isCorrect: totalScore > 0.85,
            confidence: totalScore,
            feedback: totalScore > 0.85 ? 'Perfect K!' : 'V with thumb',
            corrections
        };
    }

    // --- Letter L Analysis ---
    analyzeLetterL(hand, fingerStates) {
        const corrections = [];
        const lScore = this.detectLShape(hand, fingerStates);
        
        if (lScore < 0.6) corrections.push('Form L shape with thumb and index');
        
        return {
            isCorrect: lScore > 0.85,
            confidence: lScore,
            feedback: lScore > 0.85 ? 'Perfect L!' : 'Make L shape',
            corrections
        };
    }

    // --- Letter M Analysis ---
    analyzeLetterM(hand, fingerStates) {
        const corrections = [];
        let totalScore = 0;
        
        // First three fingers should wrap over thumb
        const threeFingers = (
            this.getAngleScore(fingerStates['Index'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Middle'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Ring'].angle, 'CLOSED')
        ) / 3;
        totalScore += threeFingers * 0.7;
        
        // Pinky should be closed
        const pinkyScore = this.getAngleScore(fingerStates['Pinky'].angle, 'CLOSED');
        totalScore += pinkyScore * 0.3;
        
        if (threeFingers < 0.6) corrections.push('Wrap three fingers over thumb');
        
        return {
            isCorrect: totalScore > 0.85,
            confidence: totalScore,
            feedback: totalScore > 0.85 ? 'Perfect M!' : 'Three fingers over thumb',
            corrections
        };
    }

    // --- Letter N Analysis ---
    analyzeLetterN(hand, fingerStates) {
        const corrections = [];
        let totalScore = 0;
        
        // First two fingers should wrap over thumb
        const twoFingers = (
            this.getAngleScore(fingerStates['Index'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Middle'].angle, 'CLOSED')
        ) / 2;
        totalScore += twoFingers * 0.7;
        
        // Other fingers should be closed
        const otherScore = (
            this.getAngleScore(fingerStates['Ring'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Pinky'].angle, 'CLOSED')
        ) / 2;
        totalScore += otherScore * 0.3;
        
        if (twoFingers < 0.6) corrections.push('Wrap two fingers over thumb');
        
        return {
            isCorrect: totalScore > 0.85,
            confidence: totalScore,
            feedback: totalScore > 0.85 ? 'Perfect N!' : 'Two fingers over thumb',
            corrections
        };
    }

    // --- Letter O Analysis ---
    analyzeLetterO(hand, fingerStates) {
        const corrections = [];
        const curvedScore = this.detectCurvedFingers(fingerStates);
        
        // Check if fingertips are close together (forming circle)
        const thumbTip = hand[4];
        const indexTip = hand[8];
        const dist = this.getDistance(thumbTip, indexTip);
        const circleScore = dist < 0.05 ? 1 : (dist < 0.1 ? 0.7 : 0.3);
        
        const totalScore = (curvedScore * 0.5 + circleScore * 0.5);
        
        if (totalScore < 0.7) corrections.push('Form a circle with all fingertips');
        
        return {
            isCorrect: totalScore > 0.85,
            confidence: totalScore,
            feedback: totalScore > 0.85 ? 'Perfect O!' : 'Make a circle',
            corrections
        };
    }

    // --- Letter P Analysis ---
    analyzeLetterP(hand, fingerStates) {
        // P is like K but pointing downward
        const corrections = [];
        const vScore = this.detectVShape(fingerStates);
        
        if (vScore < 0.6) corrections.push('Extend index and middle, angle downward');
        
        return {
            isCorrect: vScore > 0.82,
            confidence: vScore,
            feedback: vScore > 0.82 ? 'Perfect P!' : 'K shape angled down',
            corrections
        };
    }

    // --- Letter Q Analysis ---
    analyzeLetterQ(hand, fingerStates) {
        // Q is like G but pointing downward
        const corrections = [];
        let totalScore = 0;
        
        const indexScore = this.getAngleScore(fingerStates['Index'].angle, 'OPEN');
        const thumbScore = this.getAngleScore(fingerStates['Thumb'].angle, 'OPEN');
        totalScore += (indexScore + thumbScore) / 2 * 0.7;
        
        if (indexScore < 0.6 || thumbScore < 0.6) {
            corrections.push('Point index and thumb downward');
        }
        
        const otherScore = (
            this.getAngleScore(fingerStates['Middle'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Ring'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Pinky'].angle, 'CLOSED')
        ) / 3;
        totalScore += otherScore * 0.3;
        
        return {
            isCorrect: totalScore > 0.85,
            confidence: totalScore,
            feedback: totalScore > 0.85 ? 'Perfect Q!' : 'G shape angled down',
            corrections
        };
    }

    // --- Letter R Analysis ---
    analyzeLetterR(hand, fingerStates) {
        const corrections = [];
        let totalScore = 0;
        
        // Index and middle should be OPEN and crossed
        const indexScore = this.getAngleScore(fingerStates['Index'].angle, 'OPEN');
        const middleScore = this.getAngleScore(fingerStates['Middle'].angle, 'OPEN');
        totalScore += (indexScore + middleScore) / 2 * 0.6;
        
        // Check if fingers are crossed
        const indexTip = hand[8];
        const middleTip = hand[12];
        const crossDist = this.getDistance(indexTip, middleTip);
        const crossScore = crossDist < 0.05 ? 1 : (crossDist < 0.08 ? 0.7 : 0.3);
        totalScore += crossScore * 0.2;
        
        // Other fingers should be CLOSED
        const otherScore = (
            this.getAngleScore(fingerStates['Ring'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Pinky'].angle, 'CLOSED')
        ) / 2;
        totalScore += otherScore * 0.2;
        
        if (totalScore < 0.7) corrections.push('Cross index and middle fingers');
        
        return {
            isCorrect: totalScore > 0.85,
            confidence: totalScore,
            feedback: totalScore > 0.85 ? 'Perfect R!' : 'Cross your fingers',
            corrections
        };
    }

    // --- Letter S Analysis ---
    analyzeLetterS(hand, fingerStates) {
        const corrections = [];
        let totalScore = 0;
        
        // Make a fist
        const fistScore = this.detectFist(fingerStates);
        totalScore += fistScore * 0.7;
        
        // Thumb should be in front (over fingers)
        const thumbTip = hand[4];
        const indexMCP = hand[5];
        const dist = this.getDistance(thumbTip, indexMCP);
        const thumbScore = dist < 0.1 ? 1 : (dist < 0.15 ? 0.7 : 0.3);
        totalScore += thumbScore * 0.3;
        
        if (totalScore < 0.7) corrections.push('Make fist with thumb in front');
        
        return {
            isCorrect: totalScore > 0.85,
            confidence: totalScore,
            feedback: totalScore > 0.85 ? 'Perfect S!' : 'Thumb over fingers',
            corrections
        };
    }

    // --- Letter T Analysis ---
    analyzeLetterT(hand, fingerStates) {
        const corrections = [];
        let totalScore = 0;
        
        // Make a fist
        const fistScore = this.detectFist(fingerStates);
        totalScore += fistScore * 0.6;
        
        // Thumb should be between index and middle
        const thumbScore = this.getAngleScore(fingerStates['Thumb'].angle, 'CLOSED');
        totalScore += thumbScore * 0.4;
        
        if (totalScore < 0.7) corrections.push('Tuck thumb between fingers');
        
        return {
            isCorrect: totalScore > 0.85,
            confidence: totalScore,
            feedback: totalScore > 0.85 ? 'Perfect T!' : 'Thumb between fingers',
            corrections
        };
    }

    // --- Letter U Analysis ---
    analyzeLetterU(hand, fingerStates) {
        const corrections = [];
        let totalScore = 0;
        
        // Index and middle should be OPEN and together
        const indexScore = this.getAngleScore(fingerStates['Index'].angle, 'OPEN');
        const middleScore = this.getAngleScore(fingerStates['Middle'].angle, 'OPEN');
        totalScore += (indexScore + middleScore) / 2 * 0.7;
        
        // Check if fingers are together
        const indexTip = hand[8];
        const middleTip = hand[12];
        const dist = this.getDistance(indexTip, middleTip);
        const togetherScore = dist < 0.03 ? 1 : (dist < 0.06 ? 0.7 : 0.3);
        totalScore += togetherScore * 0.1;
        
        // Other fingers should be CLOSED
        const otherScore = (
            this.getAngleScore(fingerStates['Ring'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Pinky'].angle, 'CLOSED')
        ) / 2;
        totalScore += otherScore * 0.2;
        
        if (totalScore < 0.7) corrections.push('Keep two fingers together');
        
        return {
            isCorrect: totalScore > 0.85,
            confidence: totalScore,
            feedback: totalScore > 0.85 ? 'Perfect U!' : 'Two fingers together',
            corrections
        };
    }

    // --- Letter V Analysis ---
    analyzeLetterV(hand, fingerStates) {
        const corrections = [];
        const vScore = this.detectVShape(fingerStates);
        
        if (vScore < 0.7) corrections.push('Spread index and middle in V shape');
        
        return {
            isCorrect: vScore > 0.85,
            confidence: vScore,
            feedback: vScore > 0.85 ? 'Perfect V!' : 'Make V shape',
            corrections
        };
    }

    // --- Letter W Analysis ---
    analyzeLetterW(hand, fingerStates) {
        const corrections = [];
        let totalScore = 0;
        
        // Index, middle, and ring should be OPEN
        const threeScore = (
            this.getAngleScore(fingerStates['Index'].angle, 'OPEN') +
            this.getAngleScore(fingerStates['Middle'].angle, 'OPEN') +
            this.getAngleScore(fingerStates['Ring'].angle, 'OPEN')
        ) / 3;
        totalScore += threeScore * 0.7;
        
        // Pinky should be CLOSED
        const pinkyScore = this.getAngleScore(fingerStates['Pinky'].angle, 'CLOSED');
        totalScore += pinkyScore * 0.3;
        
        if (totalScore < 0.7) corrections.push('Extend three fingers');
        
        return {
            isCorrect: totalScore > 0.85,
            confidence: totalScore,
            feedback: totalScore > 0.85 ? 'Perfect W!' : 'Three fingers up',
            corrections
        };
    }

    // --- Letter X Analysis ---
    analyzeLetterX(hand, fingerStates) {
        const corrections = [];
        let totalScore = 0;
        
        // Index should be semi-curled (hook shape)
        const indexAngle = fingerStates['Index'].angle;
        const hookScore = (indexAngle >= 110 && indexAngle <= 140) ? 1 : 0.5;
        totalScore += hookScore * 0.7;
        
        // Other fingers should be CLOSED
        const otherScore = (
            this.getAngleScore(fingerStates['Middle'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Ring'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Pinky'].angle, 'CLOSED')
        ) / 3;
        totalScore += otherScore * 0.3;
        
        if (totalScore < 0.7) corrections.push('Curve index finger like a hook');
        
        return {
            isCorrect: totalScore > 0.85,
            confidence: totalScore,
            feedback: totalScore > 0.85 ? 'Perfect X!' : 'Hook your index',
            corrections
        };
    }

    // --- Letter Y Analysis ---
    analyzeLetterY(hand, fingerStates) {
        const corrections = [];
        let totalScore = 0;
        
        // Thumb and pinky should be OPEN
        const thumbScore = this.getAngleScore(fingerStates['Thumb'].angle, 'OPEN');
        const pinkyScore = this.getAngleScore(fingerStates['Pinky'].angle, 'OPEN');
        totalScore += (thumbScore + pinkyScore) / 2 * 0.7;
        
        // Other fingers should be CLOSED
        const otherScore = (
            this.getAngleScore(fingerStates['Index'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Middle'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Ring'].angle, 'CLOSED')
        ) / 3;
        totalScore += otherScore * 0.3;
        
        if (totalScore < 0.7) corrections.push('Extend thumb and pinky only');
        
        return {
            isCorrect: totalScore > 0.85,
            confidence: totalScore,
            feedback: totalScore > 0.85 ? 'Perfect Y!' : 'Hang loose',
            corrections
        };
    }

    // --- Letter Z Analysis (motion required) ---
    analyzeLetterZ(hand, fingerStates) {
        // Z starts with I shape then draws a zigzag
        const corrections = [];
        let totalScore = 0;
        
        const pinkyScore = this.getAngleScore(fingerStates['Pinky'].angle, 'OPEN');
        totalScore += pinkyScore * 0.6;
        
        const otherScore = (
            this.getAngleScore(fingerStates['Index'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Middle'].angle, 'CLOSED') +
            this.getAngleScore(fingerStates['Ring'].angle, 'CLOSED')
        ) / 3;
        totalScore += otherScore * 0.4;
        
        corrections.push('Draw a Z motion with your pinky');
        
        return {
            isCorrect: false, // Motion required
            confidence: totalScore * 0.7,
            feedback: 'Make I shape, then zigzag',
            corrections
        };
    }
}

export const gestureAnalyzer = new GestureAnalyzer();
