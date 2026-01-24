"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTour } from '../lib/tour-context';

export default function ProductTour() {
    const { isTourVisible, currentStep, steps, nextStep, prevStep, skipTour } = useTour();
    const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
    const [isCentered, setIsCentered] = useState(false);
    const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, placement: 'right' as 'right' | 'left' | 'top' | 'bottom' });
    const popoverRef = useRef<HTMLDivElement>(null);

    const updatePosition = useCallback(() => {
        const step = steps[currentStep];

        if (!step?.targetId) {
            setCoords(null);
            setIsCentered(true);
            return;
        }

        let element = document.getElementById(step.targetId);

        // Fallback or dynamic visibility check
        if (!element && step.targetId === 'sidebar-settings-link') {
            element = document.getElementById('sidebar-user-menu-trigger');
        }

        if (element) {
            // Scroll element into view first
            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

            // Small delay to wait for scroll/layout stability
            setTimeout(() => {
                const rect = element!.getBoundingClientRect();
                const screenWidth = window.innerWidth;
                const screenHeight = window.innerHeight;
                const tooltipWidth = 360; // Standard w-[360px]
                const tooltipHeight = 250; // Estimated max height
                const gap = 20;

                setCoords({
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                });
                setIsCentered(false);

                // Determine best placement
                let placement: 'right' | 'left' | 'top' | 'bottom' = 'right';
                let top = rect.top + (rect.height / 2);
                let left = rect.left + rect.width + gap;

                // Check right side space
                if (left + tooltipWidth > screenWidth - gap) {
                    // Try left side
                    left = rect.left - tooltipWidth - gap;
                    placement = 'left';

                    // Check left side space
                    if (left < gap) {
                        // Try bottom
                        left = Math.max(gap, Math.min(screenWidth - tooltipWidth - gap, rect.left + (rect.width / 2) - (tooltipWidth / 2)));
                        top = rect.top + rect.height + gap;
                        placement = 'bottom';

                        // Check bottom space
                        if (top + tooltipHeight > screenHeight - gap) {
                            // Try top
                            top = rect.top - tooltipHeight - gap;
                            placement = 'top';
                        }
                    }
                }

                // Final boundary check for top/bottom
                if (placement === 'right' || placement === 'left') {
                    // Force top within screen
                    top = Math.max(gap + (tooltipHeight / 2), Math.min(screenHeight - gap - (tooltipHeight / 2), top));
                }

                setPopoverPos({ top, left, placement });
            }, 100);
        } else {
            setCoords(null);
            setIsCentered(true);
        }
    }, [currentStep, steps]);

    useEffect(() => {
        if (isTourVisible) {
            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
        }
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isTourVisible, updatePosition]);

    if (!isTourVisible) return null;

    const currentTourStep = steps[currentStep];
    const hasSpotlight = coords && !isCentered;

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] pointer-events-auto transition-all duration-500"
                style={{
                    clipPath: hasSpotlight ? `polygon(
                        0% 0%, 
                        0% 100%, 
                        ${coords.left}px 100%, 
                        ${coords.left}px ${coords.top}px, 
                        ${coords.left + coords.width}px ${coords.top}px, 
                        ${coords.left + coords.width}px ${coords.top + coords.height}px, 
                        ${coords.left}px ${coords.top + coords.height}px, 
                        ${coords.left}px 100%, 
                        100% 100%, 
                        100% 0%
                    )` : 'none'
                }}
                onClick={skipTour}
            />

            {/* Spotlight Border */}
            {hasSpotlight && (
                <div
                    className="absolute border-2 border-blue-500 rounded-lg shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-500"
                    style={{
                        top: coords.top - 4,
                        left: coords.left - 4,
                        width: coords.width + 8,
                        height: coords.height + 8
                    }}
                />
            )}

            {/* Tooltip Card */}
            <div
                ref={popoverRef}
                className="absolute pointer-events-auto transition-all duration-500 flex flex-col"
                style={isCentered ? {
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 'min(90vw, 400px)'
                } : {
                    top: popoverPos.top,
                    left: popoverPos.left,
                    transform: (popoverPos.placement === 'right' || popoverPos.placement === 'left') ? 'translateY(-50%)' : 'none',
                    width: 'min(90vw, 360px)',
                    maxHeight: 'min(80vh, 500px)'
                }}
            >
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-blue-100 dark:border-blue-900/50 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                    {/* Progress Header */}
                    <div className="px-6 pt-6 flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                            Step {currentStep + 1} of {steps.length}
                        </span>
                        <button
                            onClick={skipTour}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="px-8 py-4 overflow-y-auto custom-scrollbar">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 leading-tight">
                            {currentTourStep.title}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                            {currentTourStep.description}
                        </p>
                    </div>

                    {/* Sticky Footer */}
                    <div className="px-8 pb-8 pt-4 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between gap-4">
                        <button
                            onClick={skipTour}
                            className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors"
                        >
                            Skip Tour
                        </button>
                        <div className="flex gap-2">
                            {currentStep > 0 && (
                                <button
                                    onClick={prevStep}
                                    className="px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                                >
                                    Back
                                </button>
                            )}
                            <button
                                onClick={nextStep}
                                className="px-7 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 active:scale-95"
                            >
                                {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                            </button>
                        </div>
                    </div>

                    {/* Arrow (only if not centered) */}
                    {!isCentered && coords && (
                        <div className={`absolute w-4 h-4 bg-white dark:bg-slate-800 border-blue-100 dark:border-blue-900/50 rotate-45 pointer-events-none ${popoverPos.placement === 'right' ? 'top-1/2 -left-2 -translate-y-1/2 border-l border-b' :
                                popoverPos.placement === 'left' ? 'top-1/2 -right-2 -translate-y-1/2 border-r border-t' :
                                    popoverPos.placement === 'top' ? '-bottom-2 left-1/2 -translate-x-1/2 border-r border-b' :
                                        ' -top-2 left-1/2 -translate-x-1/2 border-l border-t'
                            }`} />
                    )}
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #334155;
                }
            `}</style>
        </div>
    );
}
