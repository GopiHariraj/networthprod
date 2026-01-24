"use client";

import React, { useState } from 'react';
import { useNetWorth } from '../../lib/networth-context';
import { depreciatingAssetsApi } from '../../lib/api/client';
import { Plus, Edit2, Trash2, TrendingDown, Calendar, DollarSign, Tag, Clock, RefreshCw } from 'lucide-react';
import { useCurrency } from '../../lib/currency-context';

export default function DepreciatingAssetsPage() {
    const { currency, convert } = useCurrency();
    const { data, updateDepreciatingAssets, isLoading } = useNetWorth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'Electronics',
        purchasePrice: '',
        purchaseCurrency: 'AED',
        purchaseDate: new Date().toISOString().split('T')[0],
        depreciationMethod: 'STRAIGHT_LINE',
        rate: '',
        usefulLife: '',
        isDepreciationEnabled: true,
        salvageValue: '',
        notes: ''
    });
    const [errors, setErrors] = useState<any>({});
    const [showSuccess, setShowSuccess] = useState(false);

    const assets = data.assets.depreciatingAssets.items || [];
    const totalValue = data.assets.depreciatingAssets.totalValue || 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        const newErrors: any = {};
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.purchasePrice || parseFloat(formData.purchasePrice) <= 0) {
            newErrors.purchasePrice = 'Valid purchase price is required';
        }
        if (!formData.purchaseCurrency) newErrors.purchaseCurrency = 'Currency is required';


        if (formData.isDepreciationEnabled) {
            if (formData.depreciationMethod === 'STRAIGHT_LINE') {
                if (!formData.usefulLife || parseInt(formData.usefulLife) <= 0) {
                    newErrors.usefulLife = 'Useful life (years) is required';
                }
            } else if (formData.depreciationMethod === 'PERCENTAGE') {
                if (!formData.rate || parseFloat(formData.rate) <= 0) {
                    newErrors.rate = 'Depreciation rate is required';
                }
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});

        try {
            const payload = {
                ...formData,
                purchasePrice: parseFloat(formData.purchasePrice),
                rate: formData.rate ? parseFloat(formData.rate) : null,
                usefulLife: formData.usefulLife ? parseInt(formData.usefulLife) : null,
                salvageValue: formData.salvageValue ? parseFloat(formData.salvageValue) : null,
                purchaseDate: new Date(formData.purchaseDate).toISOString()
            };

            if (editingAsset) {
                await depreciatingAssetsApi.update(editingAsset.id, payload);
            } else {
                await depreciatingAssetsApi.create(payload);
            }
            await updateDepreciatingAssets();
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
            setIsModalOpen(false);
            resetForm();
        } catch (error: any) {
            console.error('Error saving asset:', error);
            const errorMsg = error.response?.data?.message || 'Failed to save asset. Please check all fields.';
            alert('❌ ' + errorMsg);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this asset?')) return;
        try {
            await depreciatingAssetsApi.delete(id);
            await updateDepreciatingAssets();
        } catch (error) {
            console.error('Error deleting asset:', error);
        }
    };

    const resetForm = () => {
        setEditingAsset(null);
        setErrors({});
        setFormData({
            name: '',
            type: 'Electronics',
            purchasePrice: '',
            purchaseCurrency: 'AED',
            purchaseDate: new Date().toISOString().split('T')[0],
            depreciationMethod: 'STRAIGHT_LINE',
            rate: '',
            usefulLife: '',
            isDepreciationEnabled: true,
            salvageValue: '',
            notes: ''
        });
    };

    const openEdit = (asset: any) => {
        setEditingAsset(asset);
        setErrors({});
        setFormData({
            name: asset.name,
            type: asset.type,
            purchasePrice: asset.purchasePrice.toString(),
            purchaseCurrency: asset.purchaseCurrency || 'AED',
            purchaseDate: new Date(asset.purchaseDate).toISOString().split('T')[0],
            depreciationMethod: asset.depreciationMethod || 'STRAIGHT_LINE',
            rate: asset.depreciationRate?.toString() || '',
            usefulLife: asset.usefulLife?.toString() || '',
            isDepreciationEnabled: asset.isDepreciationEnabled,
            salvageValue: asset.salvageValue?.toString() || '',
            notes: asset.notes || ''
        });
        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Depreciating Assets</h1>
                        <p className="text-slate-500 mt-1">Track value of cars, electronics, and other depreciating items</p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus size={20} /> Add Asset
                    </button>
                </header>

                {/* Summary Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-8 max-w-sm">
                    <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Total Current Value</div>
                    <div className="text-4xl font-black text-slate-900 dark:text-white">
                        {currency.symbol} {convert(totalValue, 'AED').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                {/* Assets List */}
                <div className="grid gap-4">
                    {assets.map((asset: any) => (
                        <div key={asset.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                            <div className="flex flex-col md:flex-row justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                                            {asset.type === 'Car' ? '🚗' : asset.type === 'Electronics' ? '💻' : '📦'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">{asset.name}</h3>
                                            <div className="flex gap-2 text-xs text-slate-500">
                                                <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{asset.type}</span>
                                                <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                                    Purchased: {new Date(asset.purchaseDate).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">Purchase Price</div>
                                            <div className="font-semibold">{currency.symbol} {convert(asset.purchasePrice, asset.purchaseCurrency || 'AED').toLocaleString()}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">Current Value</div>
                                            <div className={`font-bold ${asset.currentValue < asset.purchasePrice ? 'text-orange-600' : 'text-slate-900'}`}>
                                                {currency.symbol} {convert(asset.currentValue, asset.purchaseCurrency || 'AED').toLocaleString()}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">Depreciation</div>
                                            <div className="text-sm">
                                                {asset.isDepreciationEnabled ? (
                                                    <span className="flex items-center gap-1 text-red-500">
                                                        <TrendingDown size={14} />
                                                        {asset.depreciationMethod === 'PERCENTAGE'
                                                            ? `${asset.depreciationRate}% / yr`
                                                            : `Over ${asset.usefulLife} yrs`}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">Disabled</span>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">Loss in Value</div>
                                            <div className="text-red-500 font-medium">
                                                -{currency.symbol} {convert(asset.purchasePrice - asset.currentValue, asset.purchaseCurrency || 'AED').toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex md:flex-col justify-end gap-2">
                                    <button
                                        onClick={() => openEdit(asset)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(asset.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {assets.length === 0 && !isLoading && (
                        <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                            <Clock size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-lg">No depreciating assets added yet.</p>
                            <button onClick={() => setIsModalOpen(true)} className="text-blue-600 hover:underline mt-2">Add your first item</button>
                        </div>
                    )}
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">
                                    {editingAsset ? 'Edit Asset' : 'Add New Asset'}
                                </h2>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Item Name</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g. BMW X5"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
                                        <select
                                            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            <option value="Car">Car</option>
                                            <option value="Electronics">Electronics</option>
                                            <option value="Appliance">Appliance</option>
                                            <option value="Furniture">Furniture</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Purchase Price *</label>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className={`w-full p-2 rounded-lg border ${errors.purchasePrice ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700`}
                                            value={formData.purchasePrice}
                                            onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })}
                                        />
                                        {errors.purchasePrice && <p className="text-xs text-red-500">{errors.purchasePrice}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Currency *</label>
                                        <select
                                            required
                                            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                                            value={formData.purchaseCurrency}
                                            onChange={e => setFormData({ ...formData, purchaseCurrency: e.target.value })}
                                        >
                                            <option value="AED">🇦🇪 AED</option>
                                            <option value="USD">🇺🇸 USD</option>
                                            <option value="EUR">🇪🇺 EUR</option>
                                            <option value="INR">🇮🇳 INR</option>
                                            <option value="GBP">🇬🇧 GBP</option>
                                            <option value="SAR">🇸🇦 SAR</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Purchase Date *</label>
                                        <input
                                            required
                                            type="date"
                                            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                                            value={formData.purchaseDate}
                                            onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Salvage Value (Optional)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                                            value={formData.salvageValue}
                                            onChange={e => setFormData({ ...formData, salvageValue: e.target.value })}
                                            placeholder="Min value floor"
                                        />
                                        <p className="text-xs text-slate-500">Value won't drop below this</p>
                                    </div>
                                </div>

                                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <RefreshCw size={16} /> Auto-Depreciation
                                        </label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={formData.isDepreciationEnabled}
                                                onChange={e => setFormData({ ...formData, isDepreciationEnabled: e.target.checked })}
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    {formData.isDepreciationEnabled && (
                                        <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Method</label>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="method"
                                                            value="STRAIGHT_LINE"
                                                            checked={formData.depreciationMethod === 'STRAIGHT_LINE'}
                                                            onChange={e => setFormData({ ...formData, depreciationMethod: e.target.value })}
                                                        />
                                                        <span className="text-sm">Straight Line (Years)</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="method"
                                                            value="PERCENTAGE"
                                                            checked={formData.depreciationMethod === 'PERCENTAGE'}
                                                            onChange={e => setFormData({ ...formData, depreciationMethod: e.target.value })}
                                                        />
                                                        <span className="text-sm">Percentage (Declining)</span>
                                                    </label>
                                                </div>
                                            </div>

                                            {formData.depreciationMethod === 'STRAIGHT_LINE' ? (
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Useful Life (Years) *</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        className={`w-full p-2 rounded-lg border ${errors.usefulLife ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700`}
                                                        value={formData.usefulLife}
                                                        onChange={e => setFormData({ ...formData, usefulLife: e.target.value })}
                                                        placeholder="e.g. 5 or 10"
                                                    />
                                                    {errors.usefulLife && <p className="text-xs text-red-500">{errors.usefulLife}</p>}
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Annual Rate (%) *</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.1"
                                                        className={`w-full p-2 rounded-lg border ${errors.rate ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700`}
                                                        value={formData.rate}
                                                        onChange={e => setFormData({ ...formData, rate: e.target.value })}
                                                        placeholder="e.g. 15 or 20"
                                                    />
                                                    {errors.rate && <p className="text-xs text-red-500">{errors.rate}</p>}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes (Optional)</label>
                                    <textarea
                                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                                        rows={3}
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    ></textarea>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
                                    >
                                        Save Asset
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
