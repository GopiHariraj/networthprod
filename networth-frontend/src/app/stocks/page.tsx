"use client";

import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../lib/currency-context';
import { useNetWorth } from '../../lib/networth-context';
import { financialDataApi } from '../../lib/api/financial-data';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

interface StockTransaction {
    id: string;
    type: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    date: string;
    notes?: string;
}

interface Stock {
    id: string;
    symbol: string;
    name: string;
    exchange: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    currency: string;
    transactions: StockTransaction[];
    notes?: string;
}

export default function StocksPage() {
    const { currency, convert, convertRaw } = useCurrency();
    const { data, refreshNetWorth } = useNetWorth();
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Holdings');
    const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [refreshingPrices, setRefreshingPrices] = useState(false);
    const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);

    const [formData, setFormData] = useState({
        symbol: '',
        name: '',
        exchange: 'NASDAQ',
        quantity: '',
        avgPrice: '',
        currentPrice: '',
        currency: 'AED'
    });

    const [txFormData, setTxFormData] = useState({
        type: 'BUY',
        quantity: '',
        price: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    useEffect(() => {
        if (data.assets.stocks.items) {
            const stocksData = data.assets.stocks.items.map((s: any) => ({
                id: s.id,
                symbol: s.symbol || '',
                name: s.name || '',
                exchange: s.exchange || '',
                quantity: parseFloat(s.quantity) || 0,
                avgPrice: parseFloat(s.avgPrice) || 0,
                currentPrice: parseFloat(s.currentPrice) || 0,
                currency: s.currency || 'AED',
                transactions: s.transactions || []
            }));
            console.log('[StocksPage] Loaded stocks:', stocksData);
            console.log('[StocksPage] Stock currencies:', stocksData.map(s => `${s.symbol}: ${s.currency}`));
            setStocks(stocksData);
            setLoading(false);
        }
    }, [data.assets.stocks.items]);

    const handleEdit = (stock: Stock) => {
        setEditingId(stock.id);
        setFormData({
            symbol: stock.symbol,
            name: stock.name,
            exchange: stock.exchange,
            quantity: stock.quantity.toString(),
            avgPrice: stock.avgPrice.toString(),
            currentPrice: stock.currentPrice.toString(),
            currency: stock.currency || 'AED'
        });
        setActiveTab('Add Asset');
    };

    const handleAddStock = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const stockData = {
                ...formData,
                quantity: parseFloat(formData.quantity),
                avgPrice: parseFloat(formData.avgPrice),
                currentPrice: parseFloat(formData.currentPrice || formData.avgPrice),
                currency: formData.currency
            };

            if (editingId) {
                await financialDataApi.stockAssets.update(editingId, stockData);
                setEditingId(null);
            } else {
                await financialDataApi.stockAssets.create(stockData);
            }
            await refreshNetWorth();
            setEditingId(null);
            setFormData({
                symbol: '',
                name: '',
                exchange: 'NASDAQ',
                quantity: '',
                avgPrice: '',
                currentPrice: '',
                currency: 'AED'
            });
            setActiveTab('Holdings');
        } catch (error) {
            console.error('Error adding stock:', error);
            alert('Failed to add stock asset.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStock) return;
        setIsSubmitting(true);
        try {
            // This is a custom endpoint we're assuming for the new transaction logic
            // Since we updated the service, we might need to expose it in the controller if not already
            // For now, we'll try to use a patch or a specific transaction endpoint
            await (financialDataApi.stockAssets as any).addTransaction?.(selectedStock.id, {
                ...txFormData,
                quantity: parseFloat(txFormData.quantity),
                price: parseFloat(txFormData.price)
            });
            await refreshNetWorth();
            setShowTransactionModal(false);
            setTxFormData({
                type: 'BUY',
                quantity: '',
                price: '',
                date: new Date().toISOString().split('T')[0],
                notes: ''
            });
        } catch (error) {
            console.error('Error adding transaction:', error);
            alert('Failed to add transaction. Note: Backend might need specific transaction endpoint.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteStock = async (id: string) => {
        if (confirm('Are you sure you want to delete this asset?')) {
            try {
                await financialDataApi.stockAssets.delete(id);
                await refreshNetWorth();
            } catch (error) {
                console.error('Error deleting stock:', error);
            }
        }
    };

    const handleRefreshAllPrices = async () => {
        setRefreshingPrices(true);
        try {
            const response = await financialDataApi.stockAssets.refreshAllPrices();
            await refreshNetWorth();
            setLastPriceUpdate(new Date());
            alert(`✅ ${response.data.message || 'Prices updated successfully'}`);
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to refresh prices. Please try again.';
            alert(`❌ ${message}`);
        } finally {
            setRefreshingPrices(false);
        }
    };

    const totalMarketValue = stocks.reduce((sum, s) => sum + convertRaw(s.quantity * s.currentPrice, s.currency, 'AED'), 0);
    const totalCostBasis = stocks.reduce((sum, s) => sum + convertRaw(s.quantity * s.avgPrice, s.currency, 'AED'), 0);
    const totalGainLoss = totalMarketValue - totalCostBasis;
    const gainPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

    console.log('[StocksPage] User selected currency:', currency.code);
    console.log('[StocksPage] Total market value (AED):', totalMarketValue);
    console.log('[StocksPage] Converting to display currency:', convert(totalMarketValue, 'AED'));

    const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

    return (
        <>
            <main className="p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                📈 Stocks Portfolio
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your holdings with transaction-based tracking.</p>
                            {lastPriceUpdate && (
                                <p className="text-xs text-slate-400 mt-1">
                                    Last updated: {lastPriceUpdate.toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col md:flex-row gap-3">
                            <button
                                onClick={handleRefreshAllPrices}
                                disabled={refreshingPrices || stocks.length === 0}
                                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-md flex items-center gap-2 justify-center"
                            >
                                <span className={refreshingPrices ? 'animate-spin' : ''}>🔄</span>
                                {refreshingPrices ? 'Refreshing...' : 'Refresh Prices'}
                            </button>
                            <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                                {['Holdings', 'Add Asset', 'Analytics'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </header>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-3xl text-white shadow-lg shadow-blue-500/20">
                            <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-2">Market Value</p>
                            <h3 className="text-3xl font-bold font-mono">
                                {currency.symbol} {convert(totalMarketValue, 'AED').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Cost Basis</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                                {currency.symbol} {convert(totalCostBasis, 'AED').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total P&L</p>
                            <h3 className={`text-2xl font-bold font-mono ${totalGainLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {totalGainLoss >= 0 ? '+' : ''}{currency.symbol} {convert(totalGainLoss, 'AED').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h3>
                            <p className={`text-xs font-bold mt-1 ${totalGainLoss >= 0 ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                                ({gainPercent.toFixed(2)}%)
                            </p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Tickers</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{stocks.length}</h3>
                            <p className="text-xs text-slate-400 mt-1">Active holdings</p>
                        </div>
                    </div>

                    {activeTab === 'Holdings' && (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Asset</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Units</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Avg Price</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Current Price</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Market Value</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {stocks.map((s) => {
                                            // Convert prices to user's selected currency FIRST
                                            const convertedAvgPrice = convert(s.avgPrice, s.currency);
                                            const convertedCurrentPrice = convert(s.currentPrice, s.currency);

                                            console.log(`[StocksPage] ${s.symbol}: Original price ${s.currentPrice} ${s.currency} -> Converted ${convertedCurrentPrice} ${currency.code}`);

                                            // Then calculate market value and cost basis in converted currency
                                            const mv = s.quantity * convertedCurrentPrice;
                                            const cb = s.quantity * convertedAvgPrice;
                                            const gl = mv - cb;
                                            const glp = cb > 0 ? (gl / cb) * 100 : 0;

                                            return (
                                                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-all group">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-900 dark:text-white uppercase">{s.symbol || 'STOCK'}</div>
                                                        <div className="text-xs text-slate-500 truncate max-w-[150px]">{s.name}</div>
                                                        <div className="text-[10px] text-indigo-500 font-bold mt-0.5">{s.exchange}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono text-slate-700 dark:text-slate-300">
                                                        {s.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono text-slate-500 dark:text-slate-400 italic text-sm">
                                                        {currency.symbol} {convertedAvgPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                                                        {currency.symbol} {convertedCurrentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                                                            {currency.symbol} {mv.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </div>
                                                        <div className={`text-[10px] font-bold ${gl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {gl >= 0 ? '+' : ''}{glp.toFixed(2)}%
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleEdit(s)}
                                                                className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                                                                title="Edit Stock"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button
                                                                onClick={() => { setSelectedStock(s); setShowTransactionModal(true); }}
                                                                className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                                            >
                                                                TX
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteStock(s.id)}
                                                                className="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Add Asset' && (
                        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl animate-in zoom-in-95 duration-200">
                            <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Add New Holding</h2>
                            <form onSubmit={handleAddStock} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Symbol</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.symbol}
                                            onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase dark:text-white"
                                            placeholder="e.g. AAPL"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Market</label>
                                        <select
                                            value={formData.exchange}
                                            onChange={(e) => setFormData({ ...formData, exchange: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                                        >
                                            <option>NASDAQ</option>
                                            <option>NYSE</option>
                                            <option>LSE</option>
                                            <option>NSE</option>
                                            <option>DFM</option>
                                            <option>BSE</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Company Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                                        placeholder="e.g. Apple Inc."
                                    />
                                </div>
                                <div className="grid grid-cols-4 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Quantity</label>
                                        <input
                                            required
                                            type="number"
                                            step="0.0001"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Avg Buy Price</label>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            value={formData.avgPrice}
                                            onChange={(e) => setFormData({ ...formData, avgPrice: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Purchase Currency</label>
                                        <select
                                            value={formData.currency}
                                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                                        >
                                            <option value="AED">AED</option>
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                            <option value="GBP">GBP</option>
                                            <option value="INR">INR</option>
                                            <option value="SAR">SAR</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Price</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.currentPrice}
                                                onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                                                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                                                placeholder="Optional"
                                            />
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (!formData.symbol) {
                                                        alert('Please enter a stock symbol first');
                                                        return;
                                                    }
                                                    try {
                                                        const response = await financialDataApi.stockAssets.getQuote(formData.symbol.toUpperCase());
                                                        const price = response.data.price;
                                                        if (price) {
                                                            setFormData({ ...formData, currentPrice: price.toString() });
                                                            alert(`✅ Got latest price: $${price.toFixed(2)}`);
                                                        }
                                                    } catch (error: any) {
                                                        alert('❌ Failed to fetch price: ' + (error.response?.data?.message || error.message));
                                                    }
                                                }}
                                                className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
                                            >
                                                🔄 Get Price
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-500">Leave empty to use purchase price</p>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Saving...' : 'Add Stock Asset'}
                                </button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'Analytics' && (
                        <div className="space-y-6">
                            {stocks.length === 0 ? (
                                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                                    <p className="text-slate-400 text-lg">📊 No stocks data to analyze yet. Add some stocks to see analytics!</p>
                                </div>
                            ) : (
                                <>
                                    {/* Portfolio Allocation Pie Chart */}
                                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">📊 Portfolio Allocation by Stock</h3>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <ResponsiveContainer width="100%" height={300}>
                                                <PieChart>
                                                    <Pie
                                                        data={stocks.map(s => ({
                                                            name: s.symbol,
                                                            value: convertRaw(s.quantity * s.currentPrice, s.currency, currency.code)
                                                        }))}
                                                        cx="50%"
                                                        cy="50%"
                                                        labelLine={false}
                                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                                                        outerRadius={100}
                                                        fill="#8884d8"
                                                        dataKey="value"
                                                    >
                                                        {stocks.map((_, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value: number) => `${currency.symbol} ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="space-y-2">
                                                {stocks.map((s, idx) => {
                                                    const value = convertRaw(s.quantity * s.currentPrice, s.currency, currency.code);
                                                    const percentage = totalMarketValue > 0 ? (convertRaw(s.quantity * s.currentPrice, s.currency, 'AED') / totalMarketValue) * 100 : 0;
                                                    return (
                                                        <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                                                <div>
                                                                    <div className="font-bold text-sm text-slate-900 dark:text-white">{s.symbol}</div>
                                                                    <div className="text-xs text-slate-500">{s.name}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                                                                    {currency.symbol} {value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </div>
                                                                <div className="text-xs text-slate-500">{percentage.toFixed(1)}%</div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Top Performers & Losers */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Top Gainers */}
                                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                                🚀 Top Performers
                                            </h3>
                                            <div className="space-y-3">
                                                {stocks
                                                    .map(s => {
                                                        const convertedAvgPrice = convert(s.avgPrice, s.currency);
                                                        const convertedCurrentPrice = convert(s.currentPrice, s.currency);
                                                        const mv = s.quantity * convertedCurrentPrice;
                                                        const cb = s.quantity * convertedAvgPrice;
                                                        const gl = mv - cb;
                                                        const glp = cb > 0 ? (gl / cb) * 100 : 0;
                                                        return { ...s, glp, gl, convertedCurrentPrice };
                                                    })
                                                    .sort((a, b) => b.glp - a.glp)
                                                    .slice(0, 3)
                                                    .map(s => (
                                                        <div key={s.id} className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                                            <div>
                                                                <div className="font-bold text-slate-900 dark:text-white">{s.symbol}</div>
                                                                <div className="text-xs text-slate-500">{currency.symbol} {s.convertedCurrentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-sm font-bold text-emerald-600">+{s.glp.toFixed(2)}%</div>
                                                                <div className="text-xs text-emerald-500">{currency.symbol} {s.gl.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>

                                        {/* Top Losers */}
                                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                                📉 Bottom Performers
                                            </h3>
                                            <div className="space-y-3">
                                                {stocks
                                                    .map(s => {
                                                        const convertedAvgPrice = convert(s.avgPrice, s.currency);
                                                        const convertedCurrentPrice = convert(s.currentPrice, s.currency);
                                                        const mv = s.quantity * convertedCurrentPrice;
                                                        const cb = s.quantity * convertedAvgPrice;
                                                        const gl = mv - cb;
                                                        const glp = cb > 0 ? (gl / cb) * 100 : 0;
                                                        return { ...s, glp, gl, convertedCurrentPrice };
                                                    })
                                                    .sort((a, b) => a.glp - b.glp)
                                                    .slice(0, 3)
                                                    .map(s => (
                                                        <div key={s.id} className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800">
                                                            <div>
                                                                <div className="font-bold text-slate-900 dark:text-white">{s.symbol}</div>
                                                                <div className="text-xs text-slate-500">{currency.symbol} {s.convertedCurrentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-sm font-bold text-rose-600">{s.glp.toFixed(2)}%</div>
                                                                <div className="text-xs text-rose-500">{currency.symbol} {s.gl.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Exchange Allocation */}
                                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">🌍 Allocation by Exchange</h3>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <BarChart data={
                                                Object.entries(
                                                    stocks.reduce((acc, s) => {
                                                        const exchange = s.exchange || 'Unknown';
                                                        const value = convertRaw(s.quantity * s.currentPrice, s.currency, currency.code);
                                                        acc[exchange] = (acc[exchange] || 0) + value;
                                                        return acc;
                                                    }, {} as Record<string, number>)
                                                ).map(([exchange, value]) => ({ exchange, value }))
                                            }>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="exchange" />
                                                <YAxis />
                                                <Tooltip formatter={(value: number) => `${currency.symbol} ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                                                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                                                    {Object.keys(stocks.reduce((acc, s) => {
                                                        acc[s.exchange || 'Unknown'] = true;
                                                        return acc;
                                                    }, {} as Record<string, boolean>)).map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Transaction History Modal (Slide Over) */}
            {showTransactionModal && selectedStock && (
                <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg h-full rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    📜 {selectedStock.symbol} Transactions
                                </h3>
                                <p className="text-xs text-slate-500">{selectedStock.name}</p>
                            </div>
                            <button onClick={() => setShowTransactionModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-4">
                                {selectedStock.transactions.length === 0 ? (
                                    <p className="text-center text-slate-400 italic py-10 text-sm">No transaction history available.</p>
                                ) : (
                                    selectedStock.transactions.map((tx: any) => (
                                        <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${tx.type === 'BUY' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                    {tx.type[0]}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold dark:text-white">{tx.type} {tx.quantity} Shares</div>
                                                    <div className="text-[10px] text-slate-500">{new Date(tx.date).toLocaleDateString()} @ {currency.symbol}{convert(tx.price, selectedStock.currency).toLocaleString()}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold dark:text-white">
                                                    {currency.symbol} {convert(tx.quantity * tx.price, selectedStock.currency).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Add Transaction</h4>
                            <form onSubmit={handleAddTransaction} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <select
                                        value={txFormData.type}
                                        onChange={(e) => setTxFormData({ ...txFormData, type: e.target.value as any })}
                                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm dark:text-white"
                                    >
                                        <option value="BUY">BUY</option>
                                        <option value="SELL">SELL</option>
                                    </select>
                                    <input
                                        required
                                        type="date"
                                        value={txFormData.date}
                                        onChange={(e) => setTxFormData({ ...txFormData, date: e.target.value })}
                                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm dark:text-white"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        required
                                        type="number"
                                        step="0.0001"
                                        placeholder="Quantity"
                                        value={txFormData.quantity}
                                        onChange={(e) => setTxFormData({ ...txFormData, quantity: e.target.value })}
                                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm dark:text-white"
                                    />
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        placeholder="Price"
                                        value={txFormData.price}
                                        onChange={(e) => setTxFormData({ ...txFormData, price: e.target.value })}
                                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm dark:text-white"
                                    />
                                </div>
                                <button
                                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Adding...' : 'Add Transaction'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
