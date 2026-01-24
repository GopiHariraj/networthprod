"use client";

import React, { useState, useEffect } from 'react';
import { financialDataApi } from '../../lib/api/financial-data';
import { useCurrency } from '../../lib/currency-context';
import PolicyModal from '../../components/insurance/PolicyModal';

export default function InsurancePage() {
    const [policies, setPolicies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
    const { currency, convert } = useCurrency();

    useEffect(() => {
        fetchPolicies();
    }, []);

    const fetchPolicies = async () => {
        try {
            const response = await financialDataApi.insurance.getAll();
            setPolicies(response.data);
        } catch (error) {
            console.error('Error fetching policies:', error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (p: any = null) => {
        setSelectedPolicy(p);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this policy?')) {
            try {
                await financialDataApi.insurance.delete(id);
                fetchPolicies();
            } catch (error) {
                console.error('Error deleting policy:', error);
            }
        }
    };

    const totalAnnualPremium = policies.reduce((sum, p) => {
        const premium = Number(p.premiumAmount);
        if (p.paymentFrequency === 'Monthly') return sum + premium * 12;
        if (p.paymentFrequency === 'Quarterly') return sum + premium * 4;
        return sum + premium;
    }, 0);

    return (
        <>
            <main className="p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">🛡️ Insurance Module</h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Track your policies, benefits, and coverage details.</p>
                        </div>
                        <button
                            onClick={() => openModal()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <span>+</span> Add Policy
                        </button>
                    </header>

                    {/* Summary Widgets */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all hover:shadow-md">
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Active Policies</p>
                            <h3 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white">{policies.filter(p => p.status === 'Active').length}</h3>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all hover:shadow-md">
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Total Annual Premium</p>
                            <h3 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white">
                                {currency.symbol} {convert(totalAnnualPremium, 'AED').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all hover:shadow-md">
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Upcoming Expiry</p>
                            <h3 className="text-3xl font-bold mt-2 text-amber-500">
                                {policies.filter(p => {
                                    const days = (new Date(p.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
                                    return days > 0 && days < 30;
                                }).length} Near Expiry
                            </h3>
                        </div>
                    </div>

                    {/* Policies List */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Policy Details</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Provider</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Premium</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiry</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">Loading your policies...</td>
                                        </tr>
                                    ) : policies.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">No insurance policies found. Add your first policy to get started!</td>
                                        </tr>
                                    ) : (
                                        policies.map((p) => (
                                            <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{p.policyType}</div>
                                                    <div className="text-xs text-slate-500 truncate max-w-xs">{p.policyNumber}</div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{p.provider}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-900 dark:text-white">
                                                        {currency.symbol} {convert(Number(p.premiumAmount), 'AED').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </div>
                                                    <div className="text-xs text-slate-500">{p.paymentFrequency}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${p.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                        p.status === 'Expired' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                                            'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400'
                                                        }`}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                                    {new Date(p.expiryDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <button
                                                            onClick={() => openModal(p)}
                                                            className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                                                        >
                                                            View & Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(p.id)}
                                                            className="text-slate-400 hover:text-rose-600 transition-colors text-lg"
                                                            title="Delete Policy"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            <PolicyModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchPolicies}
                policy={selectedPolicy}
            />
        </>
    );
}
