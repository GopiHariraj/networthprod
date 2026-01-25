"use client";

import React, { useState, useEffect } from 'react';
import { financialDataApi } from '../../lib/api/financial-data';

interface PolicyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    policy?: any;
}

export default function PolicyModal({ isOpen, onClose, onSuccess, policy }: PolicyModalProps) {
    const [formData, setFormData] = useState<any>({
        policyType: 'Health',
        provider: '',
        policyNumber: '',
        insuredMembers: '',
        startDate: '',
        expiryDate: '',
        premiumAmount: 0,
        paymentFrequency: 'Yearly',
        sumInsured: 0,
        deductible: 0,
        coPay: 0,
        status: 'Active',
        notes: '',
        benefits: []
    });

    const [newBenefit, setNewBenefit] = useState({ name: '', limitAmount: 0, conditions: '' });

    useEffect(() => {
        if (policy) {
            setFormData(policy);
        } else {
            setFormData({
                policyType: 'Health',
                provider: '',
                policyNumber: '',
                insuredMembers: '',
                startDate: '',
                expiryDate: '',
                premiumAmount: 0,
                paymentFrequency: 'Yearly',
                sumInsured: 0,
                deductible: 0,
                coPay: 0,
                status: 'Active',
                notes: '',
                benefits: []
            });
        }
    }, [policy, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (policy) {
                await financialDataApi.insurance.update(policy.id, formData);
            } else {
                await financialDataApi.insurance.create(formData);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving policy:', error);
            alert('Failed to save policy. Please check if backend is updated.');
        }
    };

    const addBenefit = () => {
        if (newBenefit.name) {
            setFormData({ ...formData, benefits: [...formData.benefits, newBenefit] });
            setNewBenefit({ name: '', limitAmount: 0, conditions: '' });
        }
    };

    const removeBenefit = (index: number) => {
        const updatedBenefits = [...formData.benefits];
        updatedBenefits.splice(index, 1);
        setFormData({ ...formData, benefits: updatedBenefits });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{policy ? 'Edit Policy' : 'Add New Insurance Policy'}</h2>
                        <p className="text-sm text-slate-500">Fill in the details to track your coverage.</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Basic Info */}
                    <section>
                        <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-4">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Policy Type</label>
                                <select
                                    value={formData.policyType}
                                    onChange={(e) => setFormData({ ...formData, policyType: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                >
                                    <option>Health</option>
                                    <option>Life</option>
                                    <option>Vehicle</option>
                                    <option>Home</option>
                                    <option>Travel</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Provider / Company</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.provider}
                                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                    placeholder="e.g. AXA, Bupa, etc."
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Policy Number</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.policyNumber}
                                    onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Financials & Dates */}
                    <section>
                        <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-4">Financials & Dates</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Premium Amount</label>
                                <input
                                    required
                                    type="number"
                                    value={formData.premiumAmount}
                                    onChange={(e) => setFormData({ ...formData, premiumAmount: Number(e.target.value) })}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Frequency</label>
                                <select
                                    value={formData.paymentFrequency}
                                    onChange={(e) => setFormData({ ...formData, paymentFrequency: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                >
                                    <option>Monthly</option>
                                    <option>Quarterly</option>
                                    <option>Yearly</option>
                                    <option>One-time</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Start Date</label>
                                <input
                                    required
                                    type="date"
                                    value={formData.startDate ? formData.startDate.split('T')[0] : ''}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Expiry Date</label>
                                <input
                                    required
                                    type="date"
                                    value={formData.expiryDate ? formData.expiryDate.split('T')[0] : ''}
                                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Coverage & Benefits */}
                    <section>
                        <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-4">Coverage & Benefits</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sum Insured</label>
                                <input
                                    type="number"
                                    value={formData.sumInsured}
                                    onChange={(e) => setFormData({ ...formData, sumInsured: Number(e.target.value) })}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Deductible</label>
                                <input
                                    type="number"
                                    value={formData.deductible}
                                    onChange={(e) => setFormData({ ...formData, deductible: Number(e.target.value) })}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Co-Pay (%)</label>
                                <input
                                    type="number"
                                    value={formData.coPay}
                                    onChange={(e) => setFormData({ ...formData, coPay: Number(e.target.value) })}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">Coverage Details (e.g. OPD, Dental)</p>
                            <div className="flex flex-col md:flex-row gap-4 mb-4">
                                <input
                                    type="text"
                                    placeholder="Benefit Name"
                                    value={newBenefit.name}
                                    onChange={(e) => setNewBenefit({ ...newBenefit, name: e.target.value })}
                                    className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white"
                                />
                                <input
                                    type="number"
                                    placeholder="Limit"
                                    value={newBenefit.limitAmount}
                                    onChange={(e) => setNewBenefit({ ...newBenefit, limitAmount: Number(e.target.value) })}
                                    className="w-full md:w-32 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white"
                                />
                                <button
                                    type="button"
                                    onClick={addBenefit}
                                    className="bg-slate-800 dark:bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-slate-700 transition-colors"
                                >
                                    Add
                                </button>
                            </div>

                            <div className="space-y-2">
                                {formData.benefits.map((b: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 text-sm">
                                        <span className="font-medium dark:text-white">{b.name}</span>
                                        <div className="flex items-center gap-4">
                                            <span className="text-slate-500">Limit: {b.limitAmount}</span>
                                            <button type="button" onClick={() => removeBenefit(i)} className="text-rose-500 hover:text-rose-600">✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </form>

                <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 px-6 py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                    >
                        Save Policy
                    </button>
                </div>
            </div>
        </div>
    );
}
