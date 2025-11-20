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
        feedback: 'Show the sign to the camera'
    })),

    setFeedback: (feedback, confidence, isCorrect) => set({ feedback, confidence, isCorrect }),
    setCameraReady: (isReady) => set({ isCameraReady: isReady }),
    incrementScore: () => set((state) => ({ score: state.score + 10, streak: state.streak + 1 })),
    resetStreak: () => set({ streak: 0 }),
}));
