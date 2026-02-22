"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useCurrency } from '../../lib/currency-context';
import { useNetWorth } from '../../lib/networth-context';
import { useAuth } from '../../lib/auth-context';
import { aiApi, apiClient } from '../../lib/api/client';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    chart?: ChartData;
}

interface ChartData {
    type: 'line' | 'bar' | 'pie';
    title: string;
    data: any[];
    xKey?: string;
    yKey?: string;
    colors?: string[];
}

const PRESET_QUESTIONS = [
    { id: 1, text: "Show my net worth trend last 12 months", icon: "📈" },
    { id: 2, text: "Breakdown my assets by category", icon: "🥧" },
    { id: 3, text: "Breakdown my liabilities by type", icon: "📊" },
    { id: 4, text: "Show gold value trend last 6 months", icon: "🥇" },
    { id: 5, text: "Show monthly EMI total and split by loan/card", icon: "💳" },
    { id: 6, text: "Compare cash vs investments over time", icon: "💰" },
    { id: 7, text: "Which category increased the most this month?", icon: "🔝" },
    { id: 8, text: "Show top 5 accounts by value", icon: "🏆" },
    { id: 9, text: "What are my top expense categories?", icon: "💸" },
    { id: 10, text: "Show my recurring expenses breakdown", icon: "🔄" },
    { id: 11, text: "What's my average monthly spending?", icon: "📉" },
    { id: 12, text: "Which expenses can I reduce?", icon: "✂️" }
];

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function AIAnalyticsPage() {
    const { currency, convert } = useCurrency();
    const { data: networthData } = useNetWorth();
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Fetch expense data
    const { data: expensesResponse } = useSWR('/expenses', () => apiClient.get('/expenses'));
    const expenses = expensesResponse?.data || [];

    // Fetch goals
    const { data: goalsResponse } = useSWR('/goals', () => apiClient.get('/goals'));
    const goals = goalsResponse?.data || [];

    // Fetch todos
    const { data: todosResponse } = useSWR('/todo', () => apiClient.get('/todo'));
    const todos = todosResponse?.data || [];


    // Real insights from NetWorthContext
    const insights = {
        netWorthTrend: networthData.netWorth > 0 ? `${currency.symbol} ${convert(networthData.netWorth, 'AED').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "No data",
        biggestAssetChange: networthData.totalAssets > 0 ? `Total: ${currency.symbol} ${convert(networthData.totalAssets, 'AED').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "No assets",
        biggestLiabilityChange: networthData.totalLiabilities > 0 ? `Total: ${currency.symbol} ${convert(networthData.totalLiabilities, 'AED').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "No liabilities"
    };

    // Real data chart generator
    const generateRealChart = (questionId: number): ChartData | undefined => {
        switch (questionId) {
            case 1: // Net worth trend
                return {
                    type: 'line',
                    title: 'Net Worth Trend - Last 12 Months',
                    data: Array.from({ length: 12 }, (_, i) => ({
                        month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
                        value: convert(networthData.netWorth || 0, 'AED')
                    })),
                    xKey: 'month',
                    yKey: 'value'
                };
            case 2: // Assets breakdown
                const assetData = [];
                if (networthData.assets.property.totalValue > 0) assetData.push({ name: 'Property', value: convert(networthData.assets.property.totalValue, 'AED') });
                if (networthData.assets.stocks.totalValue > 0) assetData.push({ name: 'Stocks', value: convert(networthData.assets.stocks.totalValue, 'AED') });
                if (networthData.assets.gold.totalValue > 0) assetData.push({ name: 'Gold', value: convert(networthData.assets.gold.totalValue, 'AED') });
                if (networthData.assets.bonds.totalValue > 0) assetData.push({ name: 'Bonds', value: convert(networthData.assets.bonds.totalValue, 'AED') });
                if (networthData.assets.cash.totalCash > 0) assetData.push({ name: 'Cash', value: convert(networthData.assets.cash.totalCash, 'AED') });

                return assetData.length > 0 ? {
                    type: 'pie',
                    title: 'Assets by Category',
                    data: assetData,
                    colors: COLORS
                } : undefined;
            case 3: // Liabilities breakdown
                const liabilityData = [];
                if (networthData.liabilities.loans.totalValue > 0) liabilityData.push({ name: 'Loans', value: convert(networthData.liabilities.loans.totalValue, 'AED') });
                if (networthData.liabilities.creditCards.totalValue > 0) liabilityData.push({ name: 'Credit Cards', value: convert(networthData.liabilities.creditCards.totalValue, 'AED') });

                return liabilityData.length > 0 ? {
                    type: 'pie',
                    title: 'Liabilities by Type',
                    data: liabilityData,
                    colors: ['#ef4444', '#f97316', '#f59e0b']
                } : undefined;
            case 4: // Gold trend
                return networthData.assets.gold.totalValue > 0 ? {
                    type: 'line',
                    title: 'Gold Value Trend - Last 6 Months',
                    data: Array.from({ length: 6 }, (_, i) => ({
                        month: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
                        value: convert(networthData.assets.gold.totalValue, 'AED')
                    })),
                    xKey: 'month',
                    yKey: 'value'
                } : undefined;
            case 5: // EMI breakdown
                const emiData = [];
                if (networthData.liabilities.loans.totalValue > 0) emiData.push({ category: 'Loans', amount: convert(networthData.liabilities.loans.totalValue, 'AED') });
                if (networthData.liabilities.creditCards.totalValue > 0) emiData.push({ category: 'Credit Cards', amount: convert(networthData.liabilities.creditCards.totalValue, 'AED') });

                return emiData.length > 0 ? {
                    type: 'bar',
                    title: 'Monthly EMI Breakdown',
                    data: emiData,
                    xKey: 'category',
                    yKey: 'amount'
                } : undefined;
            case 8: // Top 5 accounts
                const topAccounts = [];
                if (networthData.assets.property.totalValue > 0) topAccounts.push({ account: 'Property', value: convert(networthData.assets.property.totalValue, 'AED') });
                if (networthData.assets.stocks.totalValue > 0) topAccounts.push({ account: 'Stocks', value: convert(networthData.assets.stocks.totalValue, 'AED') });
                if (networthData.assets.cash.totalCash > 0) topAccounts.push({ account: 'Cash', value: convert(networthData.assets.cash.totalCash, 'AED') });
                if (networthData.assets.gold.totalValue > 0) topAccounts.push({ account: 'Gold', value: convert(networthData.assets.gold.totalValue, 'AED') });
                if (networthData.assets.bonds.totalValue > 0) topAccounts.push({ account: 'Bonds', value: convert(networthData.assets.bonds.totalValue, 'AED') });

                return topAccounts.length > 0 ? {
                    type: 'bar',
                    title: 'Top Accounts by Value',
                    data: topAccounts.sort((a, b) => b.value - a.value).slice(0, 5),
                    xKey: 'account',
                    yKey: 'value'
                } : undefined;
            default:
                return undefined;
        }
    };

    const handleSendMessage = async (text?: string) => {
        const messageText = text || inputMessage.trim();
        if (!messageText || isLoading) return;

        setIsLoading(true);
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: messageText
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');

        try {
            // Check if it's a preset question to generate a chart locally
            const presetQuestion = PRESET_QUESTIONS.find(q => q.text === messageText);
            const chart = presetQuestion ? generateRealChart(presetQuestion.id) : undefined;

            // Prepare context with networth and expense data
            const contextData = {
                networth: networthData,
                expenses: expenses.map((exp: any) => ({
                    id: exp.id,
                    amount: exp.amount,
                    category: exp.category,
                    description: exp.description,
                    date: exp.date,
                    isRecurring: exp.isRecurring,
                    recurrenceFrequency: exp.recurrenceFrequency
                })),
                goals: goals.map((goal: any) => ({
                    id: goal.id,
                    name: goal.name,
                    targetAmount: goal.targetAmount,
                    currentAmount: goal.currentAmount,
                    deadline: goal.deadline,
                    category: goal.category
                })),
                todos: todos.map((todo: any) => ({
                    id: todo.id,
                    task: todo.task,
                    isCompleted: todo.isCompleted,
                    dueDate: todo.dueDate,
                    priority: todo.priority
                }))
            };

            // Get AI response with history
            const history = messages.map(m => ({ role: m.role, content: m.content }));
            const response = await aiApi.chat(messageText, contextData, history);

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.data.text || "I couldn't generate a response. Please try again.",
                chart: chart // Attach local chart if available
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I'm having trouble connecting right now. Please check your connection and try again."
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePresetQuestion = (question: string) => {
        handleSendMessage(question);
    };

    const handleClearChat = () => {
        if (confirm('Clear all chat history?')) {
            setMessages([]);
        }
    };

    const handleExport = () => {
        const report = {
            timestamp: new Date().toISOString(),
            insights: insights,
            messages: messages.map(m => ({ role: m.role, content: m.content }))
        };
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ai-analytics-report-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const renderChart = (chartData: ChartData) => {
        switch (chartData.type) {
            case 'line':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData.data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={chartData.xKey || ''} />
                            <YAxis />
                            <Tooltip formatter={(value: number) => `${currency.symbol} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                            <Legend />
                            <Line type="monotone" dataKey={chartData.yKey || ''} stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                );
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData.data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={chartData.xKey || ''} />
                            <YAxis />
                            <Tooltip formatter={(value: number) => `${currency.symbol} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                            <Legend />
                            <Bar dataKey={chartData.yKey || ''} fill="#8b5cf6" />
                        </BarChart>
                    </ResponsiveContainer>
                );
            case 'pie':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={chartData.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                {chartData.data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={chartData.colors?.[index] || COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `${currency.symbol} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                );
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-10">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">✨ AI Financial Analytics</h1>
                    <p className="text-slate-500 mt-2">Chat with AI to analyze your finances and generate insights</p>
                </header>

                {user?.planType !== 'PRO' && user?.planType !== 'ENTERPRISE' ? (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center shadow-xl border border-slate-200 dark:border-slate-700 max-w-2xl mx-auto my-16 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -ml-32 -mb-32"></div>

                        <div className="relative z-10">
                            <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-8 shadow-2xl shadow-orange-500/30 transform -rotate-6">
                                🤖
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">
                                Unlock AI Analytics
                            </h2>
                            <p className="text-lg text-slate-500 dark:text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
                                Get instant answers to complex financial questions, uncover hidden spending patterns, and generate beautiful interactive charts with our Advanced AI.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                <button
                                    onClick={() => window.location.href = '/settings'}
                                    className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-orange-500/25 flex items-center gap-2"
                                >
                                    <span>Upgrade to Pro</span>
                                    <span>👑</span>
                                </button>
                                <button
                                    onClick={() => window.location.href = '/'}
                                    className="px-8 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl transition-all"
                                >
                                    Return to Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* AI Insights Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
                                <div className="text-sm opacity-90">Net Worth Trend</div>
                                <div className="text-3xl font-bold mt-2">{insights.netWorthTrend}</div>
                                <div className="text-sm mt-1">Last 30 days</div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
                                <div className="text-sm opacity-90">Biggest Asset Change</div>
                                <div className="text-2xl font-bold mt-2">{insights.biggestAssetChange}</div>
                                <div className="text-sm mt-1">This month</div>
                            </div>
                            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
                                <div className="text-sm opacity-90">Biggest Liability Change</div>
                                <div className="text-2xl font-bold mt-2">{insights.biggestLiabilityChange}</div>
                                <div className="text-sm mt-1">This month</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Chat Area */}
                            <div className="lg:col-span-2">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">💬 Chat with AI</h2>
                                        <div className="flex gap-2">
                                            <button onClick={handleExport} className="px-4 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium transition-colors">
                                                📥 Export Report
                                            </button>
                                            <button onClick={handleClearChat} className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium transition-colors">
                                                🗑️ Clear Chat
                                            </button>
                                        </div>
                                    </div>

                                    {/* Messages */}
                                    <div className="p-6 space-y-4 h-96 overflow-y-auto">
                                        {messages.length === 0 ? (
                                            <div className="text-center py-12">
                                                <div className="text-6xl mb-4">🤖</div>
                                                <div className="text-slate-500 dark:text-slate-400">Start a conversation or use preset questions below</div>
                                            </div>
                                        ) : (
                                            messages.map(message => (
                                                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-3xl ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'} rounded-2xl p-4`}>
                                                        <div className="text-sm font-semibold mb-1">{message.role === 'user' ? 'You' : '🤖 AI Assistant'}</div>
                                                        {message.role === 'assistant' ? (
                                                            <div className="prose prose-sm max-w-none text-slate-900 dark:text-slate-100">
                                                                <ReactMarkdown
                                                                    remarkPlugins={[remarkGfm]}
                                                                    components={{
                                                                        h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-3 pb-2 border-b-2 border-blue-500 text-slate-900 dark:text-white" {...props} />,
                                                                        h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-5 mb-2 text-blue-600 dark:text-blue-400" {...props} />,
                                                                        h3: ({ node, ...props }) => <h3 className="text-lg font-bold mt-4 mb-2 text-slate-800 dark:text-slate-200" {...props} />,
                                                                        p: ({ node, ...props }) => <p className="mb-3 leading-relaxed text-slate-700 dark:text-slate-300" {...props} />,
                                                                        ul: ({ node, ...props }) => <ul className="list-disc ml-6 mb-3 space-y-2 text-slate-700 dark:text-slate-300" {...props} />,
                                                                        ol: ({ node, ...props }) => <ol className="list-decimal ml-6 mb-3 space-y-2 text-slate-700 dark:text-slate-300" {...props} />,
                                                                        li: ({ node, ...props }) => <li className="leading-relaxed pl-1" {...props} />,
                                                                        strong: ({ node, ...props }) => <strong className="font-bold text-slate-900 dark:text-white" {...props} />,
                                                                        em: ({ node, ...props }) => <em className="italic text-slate-800 dark:text-slate-200" {...props} />,
                                                                        code: ({ node, ...props }) => <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-sm font-mono text-blue-800 dark:text-blue-200" {...props} />,
                                                                        blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-3 bg-blue-50 dark:bg-blue-900/20 italic text-slate-700 dark:text-slate-300" {...props} />,
                                                                        hr: ({ node, ...props }) => <hr className="my-4 border-slate-300 dark:border-slate-600" {...props} />,
                                                                        // Table components
                                                                        table: ({ node, ...props }) => <div className="overflow-x-auto my-4 rounded-lg border border-slate-200 dark:border-slate-700"><table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm" {...props} /></div>,
                                                                        thead: ({ node, ...props }) => <thead className="bg-slate-50 dark:bg-slate-800" {...props} />,
                                                                        tbody: ({ node, ...props }) => <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900" {...props} />,
                                                                        tr: ({ node, ...props }) => <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" {...props} />,
                                                                        th: ({ node, ...props }) => <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-xs" {...props} />,
                                                                        td: ({ node, ...props }) => <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap" {...props} />,
                                                                    }}
                                                                >
                                                                    {message.content}
                                                                </ReactMarkdown>
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm">{message.content}</div>
                                                        )}
                                                        {message.chart && (
                                                            <div className="mt-4 bg-white dark:bg-slate-800 rounded-xl p-4">
                                                                <h4 className="font-bold text-slate-900 dark:text-white mb-3">{message.chart.title}</h4>
                                                                {renderChart(message.chart)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        {isLoading && (
                                            <div className="flex justify-start">
                                                <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl p-4">
                                                    <div className="flex gap-2">
                                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Input */}
                                    <div className="p-6 border-t border-slate-200 dark:border-slate-700">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={inputMessage}
                                                onChange={(e) => setInputMessage(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                                placeholder="Ask me anything about your finances..."
                                                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                            <button
                                                onClick={() => handleSendMessage()}
                                                disabled={isLoading}
                                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-xl transition-colors shadow-lg"
                                            >
                                                {isLoading ? '...' : '📤 Send'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Preset Questions */}
                            <div className="lg:col-span-1">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 sticky top-8">
                                    <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">📊 Graph Questions</h2>
                                    <div className="space-y-2">
                                        {PRESET_QUESTIONS.map(question => (
                                            <button
                                                key={question.id}
                                                onClick={() => handlePresetQuestion(question.text)}
                                                disabled={isLoading}
                                                className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-blue-50 dark:bg-slate-700 dark:hover:bg-blue-900/20 text-slate-900 dark:text-white rounded-xl transition-colors border border-slate-200 dark:border-slate-600 hover:border-blue-400 disabled:opacity-50"
                                            >
                                                <span className="mr-2">{question.icon}</span>
                                                <span className="text-sm">{question.text}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                                        <div className="flex gap-2">
                                            <span className="text-lg">💡</span>
                                            <div className="text-xs text-yellow-800 dark:text-yellow-400">
                                                <div className="font-semibold">Note</div>
                                                <div className="mt-1">AI is read-only and cannot modify your data. It only provides analysis and insights.</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
