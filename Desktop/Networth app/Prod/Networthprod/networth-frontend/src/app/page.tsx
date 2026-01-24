"use client";

import React, { useState, useEffect } from 'react';
import { transactionsApi, apiCache } from '../lib/api/client';
import { useCurrency } from '../lib/currency-context';
import { useNetWorth } from '../lib/networth-context';
import { useAuth } from '../lib/auth-context';
import TransactionUpload from '../components/TransactionUpload';
import ExpensePieChart from '../components/ExpensePieChart';
import GoalProgress from '../components/dashboard/GoalProgress';
import ExpenseGoalWidget from '../components/dashboard/ExpenseGoalWidget';
import SummaryCards from '../components/dashboard/SummaryCards';
import PortfolioOverview from '../components/dashboard/PortfolioOverview';
import {
    AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

interface Transaction {
    id: string;
    amount: number;
    description?: string;
    merchant?: string;
    date: string;
    type: string;
    category?: { name: string };
}

const TransactionRow = React.memo(({ tx, currencySymbol, convert }: { tx: Transaction; currencySymbol: string, convert: (val: number, from?: string) => number }) => {
    const isCredit = tx.type === 'INCOME';
    const displayAmount = convert(Number(tx.amount), 'AED');

    return (
        <div className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isCredit ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                    {isCredit ? '💰' : '🛒'}
                </div>
                <div>
                    <h5 className="font-semibold text-slate-900 dark:text-white">{tx.merchant || tx.description || 'Unknown'}</h5>
                    <p className="text-xs text-slate-500">{tx.category?.name || 'Uncategorized'} • {new Date(tx.date).toLocaleDateString()}</p>
                </div>
            </div>
            <span className={`font-bold ${isCredit ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                {isCredit ? '+' : ''} {currencySymbol} {displayAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
        </div>
    );
});
TransactionRow.displayName = 'TransactionRow';

export default function Dashboard() {
    const { isAuthenticated, isLoading } = useAuth();
    const { currency, convert } = useCurrency();
    const { data: networthData } = useNetWorth();
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [filterPeriod, setFilterPeriod] = useState('Monthly');
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    const fetchDashboard = React.useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const params: any = { period: filterPeriod };
            if (filterPeriod === 'Custom' && customStartDate && customEndDate) {
                params.startDate = customStartDate;
                params.endDate = customEndDate;
            }

            // 1. Try Cache First for immediate UI
            const cacheKey = `/transactions/dashboard?${new URLSearchParams(params).toString()}`;
            const cached = await apiCache.get(cacheKey);
            if (cached) {
                setDashboardData(cached);
            }

            // 2. Fetch fresh data
            const res = await transactionsApi.getDashboard(params);
            setDashboardData(res.data);
        } catch (error) {
            console.error(error);
        }
    }, [filterPeriod, customStartDate, customEndDate, isAuthenticated]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    if (isLoading || !isAuthenticated) return null;

    const convertedNetWorth = convert(networthData.netWorth || 0, 'AED');

    const netWorthTrendLine = [
        { month: 'Jul', netWorth: convertedNetWorth * 0.85 },
        { month: 'Aug', netWorth: convertedNetWorth * 0.88 },
        { month: 'Sep', netWorth: convertedNetWorth * 0.91 },
        { month: 'Oct', netWorth: convertedNetWorth * 0.94 },
        { month: 'Nov', netWorth: convertedNetWorth * 0.97 },
        { month: 'Dec', netWorth: convertedNetWorth },
    ];


    const filterOptions = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annual', 'Custom'];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white pb-20">
            <main className="max-w-6xl mx-auto px-6 py-8">
                <header className="mb-10 flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Financial Overview</h1>
                        <p className="text-slate-500 mt-2">Track your daily expenses and net worth.</p>
                    </div>
                    <a href="/goals" id="dashboard-goals-button" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-2">🎯 Goals</a>
                </header>

                <GoalProgress
                    currentNetWorth={convertedNetWorth}
                    currency={currency}
                    secondaryGoalsData={{
                        goldItems: networthData.assets.gold.items,
                        propertyTotal: convert(networthData.assets.property.totalValue, 'AED'),
                        stocksTotal: convert(networthData.assets.stocks.totalValue, 'AED'),
                        cashTotal: convert(networthData.assets.cash.totalCash, 'AED')
                    }}
                />

                <ExpenseGoalWidget currency={currency} />

                <div className="mb-8 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center justify-between w-full">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">📅 Filter Period</h3>
                            <button
                                onClick={() => {
                                    const csvContent = [['Date', 'Category', 'Amount', 'Type'], ...(dashboardData?.transactions || []).map((t: any) => [new Date(t.date).toLocaleDateString(), t.category || 'Uncategorized', t.amount, t.type])].map(row => row.join(',')).join('\n');
                                    const blob = new Blob([csvContent], { type: 'text/csv' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                }}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-green-600/20 flex items-center gap-2"
                            >📊 Export to Sheets</button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {filterOptions.map(option => (
                            <button
                                key={option}
                                onClick={() => {
                                    setFilterPeriod(option);
                                    setShowCustomPicker(option === 'Custom');
                                }}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filterPeriod === option ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                            >{option}</button>
                        ))}
                    </div>
                    {filterPeriod === 'Custom' && showCustomPicker && (
                        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">📆 Start Date</label>
                                    <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">📆 End Date</label>
                                    <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <TransactionUpload onTransactionAdded={fetchDashboard} />
                <SummaryCards currency={currency} dashboardData={dashboardData} filterPeriod={filterPeriod} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-lg mb-4">Expense Breakdown</h3>
                            <ExpensePieChart data={dashboardData?.pieChartData || []} />
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-lg mb-6">Net Worth Trend</h3>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dashboardData?.trendData || netWorthTrendLine}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="month" hide={filterPeriod === 'Daily'} />
                                        <YAxis hide />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="netWorth" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-8">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-lg mb-4">Recent Transactions</h3>
                            <div className="space-y-1">
                                {dashboardData?.recentTransactions?.map((tx: any) => <TransactionRow key={tx.id} tx={tx} currencySymbol={currency.symbol} convert={convert} />)}
                                {!dashboardData?.recentTransactions?.length && <p className="text-sm text-slate-400">No transactions yet.</p>}
                            </div>
                        </div>
                        <PortfolioOverview currency={currency} networthData={networthData} />
                    </div>
                </div>
            </main>
        </div>
    );
}
