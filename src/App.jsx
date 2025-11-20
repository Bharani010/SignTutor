import React, { useCallback } from 'react';
import CameraFeed from './components/CameraFeed';
import UIOverlay from './components/UIOverlay';
import { useLearningStore } from './store/LearningStore';
import { gestureAnalyzer } from './services/GestureAnalyzer';
import { ASL_LETTERS } from './data/aslData';

function App() {
  const { currentLevelIndex, setFeedback } = useLearningStore();

  const handleLandmarks = useCallback((landmarks) => {
    const targetLetter = ASL_LETTERS[currentLevelIndex];
    if (!targetLetter) return;

    const result = gestureAnalyzer.analyze(landmarks, targetLetter.id);

    setFeedback(result.feedback, result.confidence, result.isCorrect);
  }, [currentLevelIndex, setFeedback]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950">
      <header className="mb-6 text-center animate-fade-in">
        <h1 className="text-4xl font-bold mb-2 text-gradient tracking-tight">SignTutor AI</h1>
        <p className="text-slate-400">Interactive ASL Learning Assistant</p>
      </header>

      <div className="relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900">
        <CameraFeed onLandmarksDetected={handleLandmarks} />
        <UIOverlay />
      </div>
    </div>
  );
}

export default App;
