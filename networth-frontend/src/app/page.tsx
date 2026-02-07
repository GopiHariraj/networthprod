"use client";

// Force dynamic rendering to avoid SSR issues with client-side auth
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';
import { transactionsApi, apiCache } from '../lib/api/client';
import { financialDataApi } from '../lib/api/financial-data';
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
import { Bell, Check, Trash2, X } from 'lucide-react';

// ... (existing constants and interfaces)

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
    const [reminder, setReminder] = useState<any>(null); // For Popup

    // Notification Bell State
    const [remindersList, setRemindersList] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);

    // Check for reminders (both popup and bell list)
    useEffect(() => {
        const checkReminders = async () => {
            if (!isAuthenticated) return;
            try {
                const res = await financialDataApi.todo.getAll('REMINDER', false);
                const allReminders = res.data || [];

                // Sort by time (soonest first)
                allReminders.sort((a: any, b: any) => new Date(a.reminderTime).getTime() - new Date(b.reminderTime).getTime());
                setRemindersList(allReminders);

                const now = new Date();
                const dueReminder = allReminders.find((r: any) =>
                    r.reminderTime && new Date(r.reminderTime) <= now
                );

                // Only show popup if it hasn't been snoozed/dismissed locally in this session? 
                // For now, simplicity: if it's due and exists, show it.
                // NOTE: In a real app, we'd check if we already showed this specific reminder ID.
                if (dueReminder) {
                    setReminder(dueReminder);
                }
            } catch (error) {
                console.error('Failed to check reminders', error);
            }
        };
        checkReminders();
        const interval = setInterval(checkReminders, 60000); // Check every minute

        // Handle click outside to close dropdown
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            clearInterval(interval);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isAuthenticated]);

    const dismissReminder = async (markComplete: boolean) => {
        if (!reminder) return;
        if (markComplete) {
            await financialDataApi.todo.update(reminder.id, { isCompleted: true });
            // Refresh list
            const res = await financialDataApi.todo.getAll('REMINDER', false);
            setRemindersList(res.data || []);
        }
        setReminder(null);
    };

    const markReminderDone = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await financialDataApi.todo.update(id, { isCompleted: true });
            setRemindersList(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error('Failed to mark reminder done', error);
        }
    };

    // ... (rest of dashboard fetch logic)

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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white pb-20 relative">
            {reminder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-3xl mb-6 mx-auto">
                            🔔
                        </div>
                        <h3 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-2">Reminder</h3>
                        <p className="text-center text-lg font-medium text-slate-700 dark:text-slate-300 mb-4">{reminder.title}</p>
                        {reminder.description && (
                            <p className="text-center text-slate-500 mb-8 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                {reminder.description}
                            </p>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => dismissReminder(false)}
                                className="py-3 px-4 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                Snooze
                            </button>
                            <button
                                onClick={() => dismissReminder(true)}
                                className="py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-colors"
                            >
                                Mark Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <main className="max-w-6xl mx-auto px-6 py-8">
                <header className="mb-10 flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Financial Overview</h1>
                        <p className="text-slate-500 mt-2">Track your daily expenses and net worth.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Notification Bell */}
                        <div className="relative" ref={notificationRef}>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className={`p-2.5 rounded-xl transition-all relative ${remindersList.length > 0
                                    ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <Bell className={`w-6 h-6 ${remindersList.length > 0 ? 'animate-shake' : ''}`} />
                                {remindersList.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-50 dark:border-slate-900">
                                        {remindersList.length}
                                    </span>
                                )}
                            </button>

                            {/* Dropdown */}
                            {showNotifications && (
                                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in zoom-in-95 duration-200">
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                                        <h4 className="font-semibold text-sm">Reminders ({remindersList.length})</h4>
                                        {remindersList.length === 0 && <span className="text-xs text-slate-400">All caught up!</span>}
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {remindersList.length > 0 ? (
                                            remindersList.map(r => (
                                                <div key={r.id} className="p-4 border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                                                    <div className="flex justify-between items-start gap-3">
                                                        <div className="flex-1">
                                                            <p className="font-medium text-sm text-slate-900 dark:text-white line-clamp-1">{r.title}</p>
                                                            {r.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{r.description}</p>}
                                                            <p className="text-[10px] text-blue-500 font-medium mt-2 bg-blue-50 dark:bg-blue-900/20 inline-block px-2 py-0.5 rounded-full">
                                                                {new Date(r.reminderTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={(e) => markReminderDone(r.id, e)}
                                                            className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
                                                            title="Mark as Done"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center">
                                                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                                                    <Bell className="w-6 h-6" />
                                                </div>
                                                <p className="text-sm text-slate-500">No active reminders</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-center">
                                        <a href="/todo" className="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wide">View All Tasks</a>
                                    </div>
                                </div>
                            )}
                        </div>
                        <a href="/goals" id="dashboard-goals-button" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-2">🎯 Goals</a>
                    </div>
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
