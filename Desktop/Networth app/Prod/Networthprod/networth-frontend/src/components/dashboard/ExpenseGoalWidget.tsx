"use client";

import React, { useState, useEffect } from 'react';
import { financialDataApi } from '../../lib/api/financial-data';
import Link from 'next/link';
import { useCurrency } from '../../lib/currency-context';

interface ExpenseGoalWidgetProps {
    currency: any;
}

export default function ExpenseGoalWidget({ currency }: ExpenseGoalWidgetProps) {
    const { convert } = useCurrency();
    const [expenseGoal, setExpenseGoal] = useState<number>(0);
    const [currentSpending, setCurrentSpending] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchExpenseData();
    }, []);

    const fetchExpenseData = async () => {
        try {
            setIsLoading(true);

            // Fetch expense goal
            const goalsRes = await financialDataApi.goals.getAll();
            const expenseGoalData = goalsRes.data.find((g: any) => g.type === 'EXPENSE');

            if (expenseGoalData) {
                setExpenseGoal(parseFloat(expenseGoalData.targetAmount));
            }

            // Fetch current month's expenses
            const expensesRes = await financialDataApi.expenses.getAll();
            const now = new Date();
            const currentMonthExpenses = expensesRes.data.filter((e: any) => {
                const expenseDate = new Date(e.date);
                return expenseDate.getMonth() === now.getMonth() &&
                    expenseDate.getFullYear() === now.getFullYear();
            });

            const total = currentMonthExpenses.reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0);
            setCurrentSpending(total);
        } catch (error) {
            console.error('Failed to fetch expense data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 animate-pulse">
                <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
        );
    }

    if (!expenseGoal || expenseGoal === 0) {
        return (
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 shadow-lg text-white">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                        💸
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Monthly Expense Budget</h3>
                        <p className="text-sm text-amber-100">Set your spending limit</p>
                    </div>
                </div>
                <Link
                    href="/goals"
                    className="block w-full mt-4 px-6 py-3 bg-white text-orange-600 font-bold rounded-xl hover:bg-amber-50 transition-colors text-center"
                >
                    🎯 Set Monthly Budget
                </Link>
            </div>
        );
    }

    const convertedSpending = convert(currentSpending, 'AED');
    const convertedGoal = convert(expenseGoal, 'AED');

    const percentage = convertedGoal > 0 ? (convertedSpending / convertedGoal) * 100 : 0;
    const remaining = convertedGoal - convertedSpending;
    const isOverBudget = convertedSpending > convertedGoal;
    const isNearLimit = percentage > 80 && !isOverBudget;

    return (
        <div className={`rounded-2xl p-6 shadow-lg ${isOverBudget
            ? 'bg-gradient-to-br from-red-500 to-rose-600'
            : isNearLimit
                ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                : 'bg-gradient-to-br from-emerald-500 to-teal-600'
            } text-white`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                        💸
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Monthly Expenses</h3>
                        <p className="text-sm opacity-90">
                            {isOverBudget ? 'Over budget!' : isNearLimit ? 'Approaching limit' : 'On track'}
                        </p>
                    </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3">
                    <div className="text-xs opacity-80 uppercase font-bold mb-1">Spent</div>
                    <div className="text-xl font-black font-mono">
                        {currency.symbol} {convertedSpending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3">
                    <div className="text-xs opacity-80 uppercase font-bold mb-1">Budget</div>
                    <div className="text-xl font-black font-mono">
                        {currency.symbol} {convertedGoal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3">
                    <div className="text-xs opacity-80 uppercase font-bold mb-1">
                        {isOverBudget ? 'Over' : 'Left'}
                    </div>
                    <div className="text-xl font-black font-mono">
                        {currency.symbol} {Math.abs(remaining).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold">
                    <span>{percentage.toFixed(1)}% Used</span>
                    <span>{isOverBudget ? `+${(percentage - 100).toFixed(1)}% over` : `${(100 - percentage).toFixed(1)}% remaining`}</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                    <div
                        className={`h-3 rounded-full transition-all ${isOverBudget ? 'bg-white' : 'bg-white/90'
                            }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/20 flex gap-2">
                <Link
                    href="/expenses"
                    className="flex-1 px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl transition-colors text-center text-sm"
                >
                    📊 View Details
                </Link>
                <Link
                    href="/goals"
                    className="flex-1 px-4 py-2 bg-white hover:bg-white/90 text-slate-900 font-bold rounded-xl transition-colors text-center text-sm"
                >
                    🎯 Adjust Budget
                </Link>
            </div>
        </div>
    );
}
