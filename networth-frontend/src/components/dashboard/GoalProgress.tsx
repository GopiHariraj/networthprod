"use client";

import React, { useState, useEffect } from 'react';
import { financialDataApi } from '../../lib/api/financial-data';

import { useCurrency } from '../../lib/currency-context';

interface GoalProgressProps {
    currentNetWorth: number;
    currency: { symbol: string, code: string };
    secondaryGoalsData: {
        goldItems: any[];
        propertyTotal: number;
        stocksTotal: number;
        cashTotal: number;
    };
}

const GoalProgress: React.FC<GoalProgressProps> = ({ currentNetWorth, currency, secondaryGoalsData }) => {
    const { convert } = useCurrency();
    const [activeGoal, setActiveGoal] = useState<any>(null);
    const [secondaryGoals, setSecondaryGoals] = useState<any>(null);
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [editGoalValue, setEditGoalValue] = useState('');
    const [editGoalDate, setEditGoalDate] = useState('');
    const [isSavingGoal, setIsSavingGoal] = useState(false);

    const fetchGoals = async () => {
        try {
            const res = await financialDataApi.goals.getAll();
            const fetchedGoals = res.data;

            if (fetchedGoals && fetchedGoals.length > 0) {
                const primary = fetchedGoals.find((g: any) => g.type === 'NETWORTH');
                if (primary) {
                    setActiveGoal({
                        id: primary.id,
                        goalNetWorth: primary.targetAmount.toString(),
                        targetDate: primary.targetDate.split('T')[0],
                        notes: primary.notes || '',
                        createdAt: primary.createdAt
                    });
                    setEditGoalValue(primary.targetAmount.toString());
                    setEditGoalDate(primary.targetDate.split('T')[0]);
                }

                const secondary = {
                    commodityGrams: fetchedGoals.find((g: any) => g.type === 'GOLD')?.targetAmount.toString() || '',
                    propertyValue: fetchedGoals.find((g: any) => g.type === 'PROPERTY')?.targetAmount.toString() || '',
                    stocks: fetchedGoals.find((g: any) => g.type === 'STOCKS')?.targetAmount.toString() || '',
                    cashAndBank: fetchedGoals.find((g: any) => g.type === 'CASH')?.targetAmount.toString() || '',
                };
                setSecondaryGoals(secondary);
            }
        } catch (e) {
            console.error('Failed to load goals from API', e);
        }
    };

    useEffect(() => {
        fetchGoals();
        const interval = setInterval(fetchGoals, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleSaveGoal = async () => {
        if (!editGoalValue || !editGoalDate) {
            alert('Please enter both goal amount and target date');
            return;
        }

        try {
            setIsSavingGoal(true);
            const payload = {
                name: 'Primary Net Worth Goal',
                type: 'NETWORTH',
                targetAmount: parseFloat(editGoalValue),
                targetDate: new Date(editGoalDate).toISOString(),
                currentAmount: currentNetWorth
            };

            if (activeGoal?.id) {
                await financialDataApi.goals.update(activeGoal.id, payload);
            } else {
                await financialDataApi.goals.create(payload);
            }

            setIsEditingGoal(false);
            setActiveGoal((prev: any) => ({
                ...prev,
                goalNetWorth: editGoalValue,
                targetDate: editGoalDate
            }));
            alert('✅ Net Worth Goal saved successfully!');
        } catch (err) {
            console.error('Failed to save goal', err);
            alert('Failed to save goal to database');
        } finally {
            setIsSavingGoal(false);
        }
    };

    const goalNetWorthRaw = parseFloat(activeGoal?.goalNetWorth) || 0;
    const goalNetWorth = convert(goalNetWorthRaw, 'AED');
    const targetDate = activeGoal?.targetDate ? new Date(activeGoal.targetDate) : null;
    const startDate = activeGoal?.createdAt ? new Date(activeGoal.createdAt) : new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));

    const progressPercentage = goalNetWorth > 0 ? (currentNetWorth / goalNetWorth) * 100 : 0;
    const remainingAmount = Math.max(0, goalNetWorth - currentNetWorth);

    const now = new Date();
    const totalDays = targetDate ? Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const elapsedDays = targetDate ? Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const remainingDays = targetDate ? Math.max(0, Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
    const remainingMonths = Math.ceil(remainingDays / 30);
    const requiredMonthlyIncrease = remainingMonths > 0 ? remainingAmount / remainingMonths : 0;
    const expectedProgress = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;

    let goalStatus: 'ahead' | 'ontrack' | 'behind' = 'ontrack';
    if (progressPercentage > expectedProgress + 5) goalStatus = 'ahead';
    else if (progressPercentage < expectedProgress - 5) goalStatus = 'behind';

    return (
        <div className="mb-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-6 shadow-lg text-white">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-bold">🎯 Net Worth Goal Progress</h2>
                    <p className="text-purple-100 mt-1">Target: {targetDate?.toLocaleDateString() || 'Set a target date'}</p>
                </div>
                <div className="flex gap-3 items-center">
                    <div className={`px-4 py-2 rounded-full font-bold ${goalStatus === 'ahead' ? 'bg-green-500' : goalStatus === 'behind' ? 'bg-red-500' : 'bg-yellow-500'}`}>
                        {goalStatus === 'ahead' ? '🚀 Ahead' : goalStatus === 'behind' ? '⚠️ Behind' : '✅ On Track'}
                    </div>
                    <button
                        onClick={() => setIsEditingGoal(!isEditingGoal)}
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-full text-sm font-medium transition-colors border border-white/40"
                    >
                        {isEditingGoal ? '✕ Cancel' : '✏️ Edit Goal'}
                    </button>
                </div>
            </div>

            {isEditingGoal && (
                <div className="mb-8 p-6 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-300">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">⚙️ Update Your Target</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-purple-200 mb-1 uppercase tracking-wider">Target Net Worth ({currency.code})</label>
                            <input
                                type="number"
                                value={editGoalValue}
                                onChange={(e) => setEditGoalValue(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-white/50 outline-none"
                                placeholder="Enter target amount"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-purple-200 mb-1 uppercase tracking-wider">Target Date</label>
                            <input
                                type="date"
                                value={editGoalDate}
                                onChange={(e) => setEditGoalDate(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white/20 border border-white/30 rounded-xl text-white focus:ring-2 focus:ring-white/50 outline-none"
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleSaveGoal}
                        disabled={isSavingGoal}
                        className="mt-4 w-full py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-lg disabled:opacity-50"
                    >
                        {isSavingGoal ? 'Saving...' : '💾 Save & Sync to Database'}
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                    <div className="text-sm text-purple-200">Current Net Worth</div>
                    <div className="text-3xl font-bold mt-1">{currency.symbol} {currentNetWorth.toLocaleString()}</div>
                </div>
                <div>
                    <div className="text-sm text-purple-200">Goal Net Worth</div>
                    <div className="text-3xl font-bold mt-1">{currency.symbol} {goalNetWorth.toLocaleString()}</div>
                </div>
                <div>
                    <div className="text-sm text-purple-200">Remaining</div>
                    <div className="text-3xl font-bold mt-1">{currency.symbol} {remainingAmount.toLocaleString()}</div>
                </div>
            </div>

            <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                    <span>{progressPercentage.toFixed(1)}% achieved</span>
                    <span>{remainingMonths} months remaining</span>
                </div>
                <div className="w-full bg-purple-800/50 rounded-full h-6">
                    <div
                        className="bg-gradient-to-r from-green-400 to-emerald-500 h-6 rounded-full flex items-center justify-end pr-2 text-xs font-bold transition-all"
                        style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    >
                        {progressPercentage > 10 && `${progressPercentage.toFixed(1)}%`}
                    </div>
                </div>
            </div>

            <div className="bg-purple-700/30 rounded-xl p-4">
                <div className="text-sm text-purple-200">Required Monthly Increase</div>
                <div className="text-2xl font-bold mt-1">{currency.symbol} {requiredMonthlyIncrease.toLocaleString()} / month</div>
                <div className="text-xs text-purple-200 mt-1">To reach your goal on time</div>
            </div>

            {secondaryGoals && (
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {secondaryGoals.commodityGrams && (
                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 flex flex-col justify-between">
                            <div className="text-xs text-purple-200 mb-2 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                🥇 Gold Target
                            </div>
                            <div className="text-xl font-black">
                                {secondaryGoalsData.goldItems.reduce((sum: number, i: any) => sum + (i.grams || 0), 0)}g
                            </div>
                            <div className="text-[10px] text-purple-200/80 mt-1 font-medium">
                                Goal: {secondaryGoals.commodityGrams}g
                            </div>
                        </div>
                    )}
                    {secondaryGoals.propertyValue && (
                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 flex flex-col justify-between">
                            <div className="text-xs text-purple-200 mb-2 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                🏠 Property
                            </div>
                            <div className="text-xl font-black">
                                {currency.symbol} {secondaryGoalsData.propertyTotal.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-purple-200/80 mt-1 font-medium">
                                Target: {currency.symbol} {convert(parseInt(secondaryGoals.propertyValue), 'AED').toLocaleString()}
                            </div>
                        </div>
                    )}
                    {secondaryGoals.stocks && (
                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 flex flex-col justify-between">
                            <div className="text-xs text-purple-200 mb-2 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                📈 Stocks
                            </div>
                            <div className="text-xl font-black">
                                {currency.symbol} {secondaryGoalsData.stocksTotal.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-purple-200/80 mt-1 font-medium">
                                Target: {currency.symbol} {convert(parseInt(secondaryGoals.stocks), 'AED').toLocaleString()}
                            </div>
                        </div>
                    )}
                    {secondaryGoals.cashAndBank && (
                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 flex flex-col justify-between">
                            <div className="text-xs text-purple-200 mb-2 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                🏦 Cash Target
                            </div>
                            <div className="text-xl font-black">
                                {currency.symbol} {secondaryGoalsData.cashTotal.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-purple-200/80 mt-1 font-medium">
                                Target: {currency.symbol} {convert(parseInt(secondaryGoals.cashAndBank), 'AED').toLocaleString()}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GoalProgress;
