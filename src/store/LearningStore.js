import { create } from 'zustand';

export const useLearningStore = create((set) => ({
    // Stage Management
    stage: 'letters', // 'letters' | 'words' | 'sentences'
    currentLevelIndex: 0, // Index in the current dataset (e.g., 0 for 'A')

    // Session State
    score: 0,
    streak: 0,

    // Real-time Feedback
    feedback: 'Initializing...', // Text to display
    corrections: [], // Array of strings
    confidence: 0, // 0-100
    isCorrect: false,

    // Camera/System State
    isCameraReady: false,
    isProcessing: false,

    // Actions
    setStage: (stage) => set({ stage, currentLevelIndex: 0 }),
    nextLevel: () => set((state) => ({
        currentLevelIndex: state.currentLevelIndex + 1,
        isCorrect: false,
        confidence: 0,
        feedback: 'Show the sign to the camera',
        corrections: []
    })),
    skipLevel: () => set((state) => ({
        currentLevelIndex: state.currentLevelIndex + 1,
        isCorrect: false,
        confidence: 0,
        feedback: 'Skipped',
        corrections: []
    })),

    setFeedback: (feedback, confidence, isCorrect, corrections = []) => set((state) => {
        // Latch success: once correct, stay correct until next level
        const newIsCorrect = state.isCorrect || isCorrect;

        // If already correct, keep the success feedback and 100% confidence
        if (state.isCorrect) {
            // Only update if we aren't already in the success state fully
            if (state.confidence === 1 && state.feedback === 'Excellent!') {
                return {}; // No change
            }
            return {
                confidence: 1,
                feedback: 'Excellent!',
                isCorrect: true,
                corrections: []
            };
        }

        // Throttling: Only update if significant change
        const confidenceDiff = Math.abs(state.confidence - confidence);
        const feedbackChanged = state.feedback !== feedback;
        const isCorrectChanged = state.isCorrect !== newIsCorrect;
        const correctionsChanged = JSON.stringify(state.corrections) !== JSON.stringify(corrections);

        if (confidenceDiff < 0.05 && !feedbackChanged && !isCorrectChanged && !correctionsChanged) {
            return {}; // No change
        }

        return {
            feedback,
            confidence,
            isCorrect: newIsCorrect,
            corrections
        };
    }),
    setCameraReady: (isReady) => set({ isCameraReady: isReady }),
    incrementScore: () => set((state) => ({ score: state.score + 10, streak: state.streak + 1 })),
    resetStreak: () => set({ streak: 0 }),
}));
