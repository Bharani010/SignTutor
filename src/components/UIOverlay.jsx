import React from 'react';
import { useLearningStore } from '../store/LearningStore';
import { ASL_LETTERS } from '../data/aslData';
import { CheckCircle2, ArrowRight, RefreshCw, SkipForward, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

const UIOverlay = () => {
    const {
        currentLevelIndex,
        feedback,
        corrections,
        confidence,
        isCorrect,
        nextLevel,
        skipLevel
    } = useLearningStore();

    const currentItem = ASL_LETTERS[currentLevelIndex];

    if (!currentItem) return null;

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 z-10">
            {/* Top Bar: Instruction & Skip */}
            <div className="flex justify-between items-start">
                <div className="ios-glass p-6 rounded-[32px] animate-enter pointer-events-auto max-w-sm backdrop-blur-xl bg-white/80 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-caption">Current Sign</span>
                    </div>
                    <h2 className="text-4xl font-bold mb-2 text-primary tracking-tight">{currentItem.name}</h2>
                    <p className="text-body mb-4 leading-relaxed text-slate-600">{currentItem.description}</p>

                    <div className="flex flex-wrap gap-2">
                        {currentItem.tips.map((tip, idx) => (
                            <span key={idx} className="px-3 py-1 rounded-full bg-slate-100 text-[13px] font-semibold text-slate-600">
                                {tip}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-4 items-end">
                    {/* Reference Image */}
                    {currentItem.image && (
                        <div className="ios-glass p-3 rounded-[24px] animate-enter pointer-events-auto bg-white/80 shadow-sm" style={{ animationDelay: '0.1s' }}>
                            <img
                                src={currentItem.image}
                                alt={currentItem.name}
                                className="w-28 h-28 rounded-2xl bg-white object-contain p-2"
                            />
                        </div>
                    )}

                    {/* Skip Button */}
                    <button
                        onClick={skipLevel}
                        className="ios-glass px-4 py-2 rounded-full pointer-events-auto bg-white/60 hover:bg-white/90 text-slate-500 hover:text-slate-800 text-sm font-semibold transition-all flex items-center gap-2 shadow-sm"
                    >
                        Skip <SkipForward size={16} />
                    </button>
                </div>
            </div>

            {/* Toast Notifications for Corrections */}
            <div className="absolute top-24 right-8 flex flex-col gap-3 pointer-events-none z-50 w-80">
                {corrections.map((correction, idx) => (
                    <div
                        key={`${correction}-${idx}`}
                        className="ios-glass p-4 rounded-2xl bg-white/90 shadow-lg border-l-4 border-red-500 animate-slideInRight flex items-start gap-3 pointer-events-auto backdrop-blur-xl"
                    >
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 leading-none mb-1">Correction Needed</h4>
                            <p className="text-sm text-slate-600 font-medium leading-snug">{correction}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Bar: Feedback & Controls */}
            <div className="flex items-end justify-center">
                <div className={clsx(
                    "ios-glass p-6 rounded-[32px] animate-enter pointer-events-auto w-full max-w-xl transition-all duration-500 bg-white/90 shadow-lg",
                    isCorrect ? "ring-4 ring-green-400/30" : ""
                )} style={{ animationDelay: '0.2s' }}>

                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-5">
                            <div className={clsx(
                                "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm",
                                isCorrect ? "bg-green-500 text-white scale-110" : "bg-slate-100 text-slate-400"
                            )}>
                                {isCorrect ? (
                                    <CheckCircle2 className="w-7 h-7" />
                                ) : (
                                    <RefreshCw className={clsx("w-7 h-7", confidence > 0.3 && "animate-spin")} />
                                )}
                            </div>
                            <div>
                                <h3 className="text-headline mb-1 text-primary">
                                    {isCorrect ? 'Excellent!' : 'Keep going...'}
                                </h3>
                                <p className="text-body text-slate-500">{feedback}</p>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Confidence</div>
                            <span className="text-4xl font-bold tabular-nums tracking-tighter text-slate-900">
                                {Math.round(confidence * 100)}
                                <span className="text-xl text-slate-400 ml-1">%</span>
                            </span>
                        </div>
                    </div>

                    {/* Confidence Bar */}
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-6">
                        <div
                            className={clsx(
                                "h-full transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)",
                                isCorrect ? "bg-green-500" : "bg-blue-500"
                            )}
                            style={{ width: `${Math.max(5, confidence * 100)}%` }}
                        />
                    </div>

                    {/* Action Button */}
                    {isCorrect ? (
                        <button
                            onClick={nextLevel}
                            className="ios-btn ios-btn-success w-full flex items-center justify-center gap-2 group text-white"
                        >
                            Next Letter
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    ) : (
                        <div className="h-[54px] flex items-center justify-center text-slate-400 text-sm font-semibold bg-slate-50 rounded-full">
                            Hold steady to verify
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UIOverlay;
