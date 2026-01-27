"use client";

import React, { useState, useRef } from 'react';
import { transactionsApi } from '../lib/api/client';
import Link from 'next/link';
import { useCurrency } from '../lib/currency-context';
import { useNetWorth } from '../lib/networth-context';
import { financialDataApi } from '../lib/api/financial-data';

export default function TransactionUpload({ onTransactionAdded }: { onTransactionAdded: () => void }) {
    const { currency, convert } = useCurrency();
    const { data, refreshNetWorth } = useNetWorth();
    const [activeTab, setActiveTab] = useState<'sms' | 'receipt' | 'manual'>('sms');
    const [smsText, setSmsText] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Manual Form State
    const [manualForm, setManualForm] = useState({
        amount: '',
        description: '',
        type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
        date: new Date().toISOString().split('T')[0],
        merchant: '',
        accountId: '',
        creditCardId: ''
    });

    const handleAnalyzeSMS = async () => {
        if (!smsText.trim()) return;
        setLoading(true);
        try {
            const res = await transactionsApi.parseSMS(smsText);
            setResult(res.data);
            onTransactionAdded();
            setSmsText('');
        } catch (error) {
            console.error(error);
            alert('Failed to parse SMS');
        } finally {
            setLoading(false);
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualForm.amount || parseFloat(manualForm.amount) <= 0) return;

        setLoading(true);
        try {
            const payload: any = {
                ...manualForm,
                amount: parseFloat(manualForm.amount),
                source: 'MANUAL'
            };

            // Ensure we send the correct ID based on prefixing or logic
            if (manualForm.accountId.startsWith('cc_')) {
                payload.creditCardId = manualForm.accountId.replace('cc_', '');
                delete payload.accountId;
            } else if (payload.accountId === '') {
                delete payload.accountId;
            }

            // Clean up unused fields to prevent validation errors
            if (!payload.creditCardId) delete payload.creditCardId;
            if (payload.categoryId === '') delete payload.categoryId;
            if (payload.merchant === '') delete payload.merchant;

            const res = await transactionsApi.create(payload);
            setResult(res.data);
            onTransactionAdded(); // Refresh dashboard data
            await refreshNetWorth(); // Refresh Cash page balances
            setManualForm({
                amount: '',
                description: '',
                type: 'EXPENSE',
                date: new Date().toISOString().split('T')[0],
                merchant: '',
                accountId: '',
                creditCardId: ''
            });
        } catch (error) {
            console.error(error);
            alert('Failed to save transaction');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (file: File) => {
        if (!file) return;

        setLoading(true);
        try {
            const base64 = await fileToBase64(file);
            setImagePreview(base64);
            const res = await transactionsApi.analyzeReceipt(base64);
            setResult({ ...res.data, type: 'EXPENSE' });
            onTransactionAdded();
            setImagePreview(null);
        } catch (error) {
            console.error(error);
            alert('Failed to analyze receipt.');
        } finally {
            setLoading(false);
        }
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const getTypeBadge = (type: string) => {
        const badges: Record<string, { color: string; emoji: string; label: string }> = {
            GOLD: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', emoji: '🥇', label: 'Gold' },
            STOCK: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', emoji: '📈', label: 'Stock' },
            BOND: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400', emoji: '📜', label: 'Bond' },
            EXPENSE: { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', emoji: '💰', label: 'Expense' },
            INCOME: { color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400', emoji: '💵', label: 'Income' },
            BANK_DEPOSIT: { color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400', emoji: '🏦', label: 'Deposit' },
        };
        const badge = badges[type] || badges.EXPENSE;
        return (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${badge.color}`}>
                <span>{badge.emoji}</span>
                <span>{badge.label}</span>
            </span>
        );
    };

    const getModuleLink = (type: string) => {
        const links: Record<string, string> = {
            GOLD: '/gold',
            STOCK: '/stocks',
            BOND: '/bonds',
            EXPENSE: '/expenses',
            INCOME: '/',
            BANK_DEPOSIT: '/',
        };
        return links[type] || '/';
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <span className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">🚀</span> Transaction Hub
                </h3>
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                    {(['sms', 'receipt', 'manual'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            {tab === 'sms' && '📱 AI SMS'}
                            {tab === 'receipt' && '📸 AI Receipt'}
                            {tab === 'manual' && '✍️ Manual'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="min-h-[160px]">
                {activeTab === 'sms' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <textarea
                            className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                            rows={3}
                            placeholder="Paste transaction SMS here... 
Examples:
• 'Salary of AED 15,000 credited to account'
• 'Bought 50g gold chain at AED 10,000'
• 'Spent AED 500 at Carrefour'"
                            value={smsText}
                            onChange={(e) => setSmsText(e.target.value)}
                        />
                        <div className="flex justify-between items-center mt-4">
                            <p className="text-xs text-slate-500 font-medium">✨ Smart AI extracts details automatically.</p>
                            <button
                                onClick={handleAnalyzeSMS}
                                disabled={loading || !smsText}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95"
                            >
                                {loading ? 'Analyzing...' : 'Analyze & Add'}
                                {!loading && <span>✨</span>}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'receipt' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-all bg-slate-50/50 dark:bg-slate-900/50"
                        >
                            {imagePreview ? (
                                <div className="space-y-4">
                                    <img src={imagePreview} alt="Receipt" className="max-h-48 mx-auto rounded-lg shadow-md" />
                                    <p className="text-sm text-blue-600 dark:text-blue-400 font-bold animate-pulse">Processing vision analysis...</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="text-5xl">📸</div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">Scan Receipt</p>
                                        <p className="text-sm text-slate-500 mt-1">AI will extract total, items, and merchant</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}
                        />
                    </div>
                )}

                {activeTab === 'manual' && (
                    <form onSubmit={handleManualSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="col-span-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Type</label>
                            <select
                                value={manualForm.type}
                                onChange={(e) => setManualForm({ ...manualForm, type: e.target.value as any })}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="EXPENSE">💸 Expense</option>
                                <option value="INCOME">💰 Income</option>
                            </select>
                        </div>
                        <div className="col-span-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Amount</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">{currency.symbol}</span>
                                <input
                                    type="number"
                                    required
                                    placeholder="0.00"
                                    value={manualForm.amount}
                                    onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Description</label>
                            <input
                                type="text"
                                placeholder="What was this for?"
                                value={manualForm.description}
                                onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Linked Account</label>
                            <select
                                value={manualForm.accountId}
                                onChange={(e) => setManualForm({ ...manualForm, accountId: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">None (Tracking Only)</option>
                                <optgroup label="Bank Accounts" className="font-bold text-slate-400">
                                    {(data.assets.cash.bankAccounts as any[] || []).map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountName}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Wallets" className="font-bold text-slate-400">
                                    {(data.assets.cash.wallets as any[] || []).map(w => (
                                        <option key={w.id} value={w.id}>{w.accountName}</option>
                                    ))}
                                </optgroup>
                                {manualForm.type === 'EXPENSE' && (
                                    <optgroup label="Credit Cards" className="font-bold text-slate-400">
                                        {(data.liabilities.creditCards.items as any[] || []).map(cc => (
                                            <option key={cc.id} value={`cc_${cc.id}`}>{cc.bankName} - {cc.cardName}</option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                            <p className="text-[10px] text-slate-400 mt-1 ml-1">Selecting an account will automatically update its balance.</p>
                        </div>
                        <div className="col-span-2 sm:col-span-1 flex items-end">
                            <button
                                type="submit"
                                disabled={loading || !manualForm.amount}
                                className="w-full bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white px-6 py-3 rounded-xl font-bold transition-all hover:opacity-90 disabled:opacity-50 shadow-lg active:scale-[0.98]"
                            >
                                {loading ? 'Saving...' : 'Add Transaction'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {result && (
                <div className="mt-6 p-5 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between mb-4">
                        {getTypeBadge(result.type)}
                        <Link
                            href={getModuleLink(result.type)}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg shadow-sm"
                        >
                            View Details →
                        </Link>
                    </div>

                    <div className="text-emerald-900 dark:text-emerald-100 text-sm space-y-2 font-medium">
                        <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-800/50 pb-2">
                            <span className="text-slate-500">Status</span>
                            <span className="font-bold text-emerald-600">✓ Created Successfully</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Amount</span>
                            <span className="font-bold text-lg">{currency.symbol} {convert(result.amount || 0, 'AED').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        {/* Gold-specific */}
                        {result.type === 'GOLD' && (
                            <>
                                <div className="flex items-center justify-between"><span className="text-slate-500">Weight</span><span className="font-bold">{result.weight}g</span></div>
                                <div className="flex items-center justify-between"><span className="text-slate-500">Item</span><span className="font-bold">{result.ornamentName || 'Gold Item'}</span></div>
                            </>
                        )}

                        {/* Stock-specific */}
                        {result.type === 'STOCK' && (
                            <>
                                <div className="flex items-center justify-between"><span className="text-slate-500">Symbol</span><span className="font-bold">{result.stockSymbol}</span></div>
                                <div className="flex items-center justify-between"><span className="text-slate-500">Units</span><span className="font-bold">{result.units || 0}</span></div>
                            </>
                        )}

                        {/* Expense/Income common */}
                        {(result.type === 'EXPENSE' || result.type === 'INCOME') && (
                            <>
                                <div className="flex items-center justify-between"><span className="text-slate-500">Merchant</span><span className="font-bold">{result.merchant || 'General'}</span></div>
                                <div className="flex items-center justify-between"><span className="text-slate-500">Category</span><span className="font-bold">{result.category?.name || result.category || 'Uncategorized'}</span></div>
                            </>
                        )}

                        {result.description && (
                            <div className="pt-2 border-t border-emerald-100 dark:border-emerald-800/50 text-xs italic text-slate-500">
                                "{result.description}"
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
