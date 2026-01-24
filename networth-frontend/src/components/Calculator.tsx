"use client";

import React, { useState, useEffect, useRef } from 'react';

interface HistoryItem {
    expression: string;
    result: string;
    timestamp: number;
}

export default function Calculator() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'calc' | 'history'>('calc');
    const [expression, setExpression] = useState('');
    const [result, setResult] = useState('0');
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const historyEndRef = useRef<HTMLDivElement>(null);

    // Load history from localStorage on mount
    useEffect(() => {
        const savedHistory = localStorage.getItem('calc_history');
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory));
            } catch (e) {
                console.error('Failed to parse history', e);
            }
        }
    }, []);

    // Save history to localStorage
    useEffect(() => {
        localStorage.setItem('calc_history', JSON.stringify(history));
    }, [history]);

    const scrollToBottom = () => {
        historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (activeTab === 'history') {
            scrollToBottom();
        }
    }, [activeTab]);

    const handleInput = (char: string) => {
        setExpression(prev => {
            // Prevent multiple leading zeros
            if (prev === '0' && char !== '.') return char;
            return prev + char;
        });
    };

    const handleBackspace = () => {
        setExpression(prev => prev.slice(0, -1));
    };

    const clear = () => {
        setExpression('');
        setResult('0');
    };

    const calculate = () => {
        if (!expression) return;

        try {
            // Pre-process expression for evaluation
            let evalExpr = expression
                .replace(/×/g, '*')
                .replace(/÷/g, '/');

            // Simple safety check: only allow numbers, operators, and parentheses
            if (/[^0-9+\-*/().]/.test(evalExpr)) {
                throw new Error('Invalid input');
            }

            // Using Function constructor for evaluation (safer than eval)
            // eslint-disable-next-line no-new-func
            const evaluated = new Function(`return ${evalExpr}`)();

            if (isNaN(evaluated) || !isFinite(evaluated)) {
                throw new Error('Calculation error');
            }

            const resultStr = Number.isInteger(evaluated)
                ? evaluated.toString()
                : parseFloat(evaluated.toFixed(8)).toString();

            setResult(resultStr);

            // Add to history
            const newItem: HistoryItem = {
                expression,
                result: resultStr,
                timestamp: Date.now()
            };

            setHistory(prev => {
                const newHistory = [newItem, ...prev].slice(0, 150);
                return newHistory;
            });

            // Set result as the new expression for follow-up calculations
            setExpression(resultStr);

        } catch (err) {
            setResult('Error');
        }
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem('calc_history');
    };

    const useHistoryItem = (item: HistoryItem) => {
        setExpression(item.result);
        setActiveTab('calc');
    };

    const buttons = [
        ['(', ')', '⌫', '÷'],
        ['7', '8', '9', '×'],
        ['4', '5', '6', '-'],
        ['1', '2', '3', '+'],
        ['0', '.', 'C', '='],
    ];

    return (
        <>
            {/* Calculator Widget */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-0 w-80 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
                    {/* Header/Tabs */}
                    <div className="flex bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setActiveTab('calc')}
                            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'calc' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Calculator
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            History ({history.length})
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="px-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="p-6">
                        {activeTab === 'calc' ? (
                            <>
                                {/* Display */}
                                <div className="bg-slate-100 dark:bg-slate-900/80 rounded-2xl p-4 mb-4 text-right shadow-inner">
                                    <div className="text-xs text-slate-500 min-h-4 font-mono break-all mb-1">
                                        {expression || ' '}
                                    </div>
                                    <div className="text-3xl font-bold text-slate-900 dark:text-white truncate">
                                        {result}
                                    </div>
                                </div>

                                {/* Buttons Grid */}
                                <div className="grid grid-cols-4 gap-2">
                                    {buttons.map((row, i) => (
                                        <React.Fragment key={i}>
                                            {row.map((btn) => {
                                                const isOp = ['÷', '×', '-', '+', '(', ')'].includes(btn);
                                                const isEq = btn === '=';
                                                const isClear = btn === 'C';
                                                const isBack = btn === '⌫';

                                                return (
                                                    <button
                                                        key={btn}
                                                        onClick={() => {
                                                            if (isEq) calculate();
                                                            else if (isClear) clear();
                                                            else if (isBack) handleBackspace();
                                                            else handleInput(btn);
                                                        }}
                                                        className={`h-12 rounded-xl font-bold transition-all active:scale-95 ${isEq ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30' :
                                                            isClear ? 'bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50' :
                                                                isOp ? 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-blue-600' :
                                                                    'bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-sm'
                                                            }`}
                                                    >
                                                        {btn}
                                                    </button>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </>
                        ) : (
                            /* History Tab */
                            <div className="h-[300px] flex flex-col">
                                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                    {history.length > 0 ? (
                                        history.map((item, i) => (
                                            <div
                                                key={i}
                                                onClick={() => useHistoryItem(item)}
                                                className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                                            >
                                                <div className="text-xs text-slate-500 font-mono mb-1">{item.expression} =</div>
                                                <div className="font-bold text-slate-900 dark:text-white">{item.result}</div>
                                                <div className="text-[10px] text-slate-400 mt-1">
                                                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                                            No calculations yet
                                        </div>
                                    )}
                                    <div ref={historyEndRef} />
                                </div>
                                {history.length > 0 && (
                                    <button
                                        onClick={clearHistory}
                                        className="mt-4 w-full py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        Clear History
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <button
                id="calculator-toggle-button"
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95 ${isOpen ? 'bg-slate-800 text-white rotate-90' : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                title="Calculator"
            >
                {isOpen ? '✕' : '🧮'}
            </button>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #475569;
                }
            `}</style>
        </>
    );
}
