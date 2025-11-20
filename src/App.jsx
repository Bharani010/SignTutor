import React, { useCallback } from 'react';
import CameraFeed from './components/CameraFeed';
import UIOverlay from './components/UIOverlay';
import { useLearningStore } from './store/LearningStore';
import { gestureAnalyzer } from './services/GestureAnalyzer';
import { ASL_LETTERS } from './data/aslData';

function App() {
  const currentLevelIndex = useLearningStore(state => state.currentLevelIndex);
  const setFeedback = useLearningStore(state => state.setFeedback);

  const handleLandmarks = useCallback((landmarks) => {
    const targetLetter = ASL_LETTERS[currentLevelIndex];
    if (!targetLetter) return;

    try {
      const result = gestureAnalyzer.analyze(landmarks, targetLetter.id);
      setFeedback(result.feedback, result.confidence, result.isCorrect, result.corrections);
    } catch (error) {
      console.error("Gesture Analysis Error:", error);
    }
  }, [currentLevelIndex, setFeedback]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="mesh-bg" />

      <header className="absolute top-8 left-0 right-0 text-center animate-enter z-20" style={{ animationDelay: '0.1s' }}>
        <h1 className="text-title mb-1">SignTutor AI</h1>
        <p className="text-body">Master ASL with real-time feedback</p>
      </header>

      <div className="relative w-full max-w-[1200px] h-[80vh] rounded-[40px] overflow-hidden shadow-2xl border border-white/40 bg-white/50 animate-enter mt-12" style={{ animationDelay: '0.2s' }}>
        <CameraFeed onLandmarksDetected={handleLandmarks} />
        <UIOverlay />
      </div>
    </div>
  );
}

export default App;
