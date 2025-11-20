import React from 'react';
import { useLearningStore } from '../store/LearningStore';
import { ASL_LETTERS } from '../data/aslData';
import { CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

const UIOverlay = () => {
    const {
        stage,
        currentLevelIndex,
        feedback,
        confidence,
        isCorrect,
        nextLevel
    } = useLearningStore();

    const currentItem = ASL_LETTERS[currentLevelIndex]; // TODO: Handle stages

    if (!currentItem) return null;

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">
            {/* Header / Instruction */}
            <div className="glass-panel p-6 rounded-2xl animate-fade-in pointer-events-auto max-w-md mx-auto w-full text-center">
                <h2 className="text-3xl font-bold text-gradient mb-2">{currentItem.name}</h2>
                <p className="text-secondary mb-4">{currentItem.description}</p>

                <div className="flex justify-center gap-4 text-sm text-slate-300">
                    {currentItem.tips.map((tip, idx) => (
                        <span key={idx} className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                            {tip}
                        </span>
                    ))}
                </div>
            </div>

            {/* Feedback Area */}
            <div className="glass-panel p-6 rounded-2xl animate-fade-in pointer-events-auto max-w-md mx-auto w-full mt-auto">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {isCorrect ? (
                            <CheckCircle className="text-green-400 w-8 h-8" />
                        ) : (
                            <AlertCircle className="text-slate-400 w-8 h-8" />
                        )}
                        <div>
                            <p className="font-semibold text-lg">{isCorrect ? 'Perfect!' : 'Keep trying'}</p>
                            <p className="text-sm text-slate-400">{feedback}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-white">{Math.round(confidence * 100)}%</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">Confidence</div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
                    <div
                        className={clsx(
                            "h-full transition-all duration-500 ease-out",
                            isCorrect ? "bg-green-400" : "bg-blue-500"
                        )}
                        style={{ width: `${confidence * 100}%` }}
                    />
                </div>

                {/* Next Button */}
                {isCorrect && (
                    <button
                        onClick={nextLevel}
                        className="w-full glass-button bg-green-500/20 hover:bg-green-500/30 border-green-500/50 text-green-300 py-3 rounded-xl font-bold flex items-center justify-center gap-2 animate-fade-in"
                    >
                        Next Letter <ArrowRight size={20} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default UIOverlay;
