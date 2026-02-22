"use client";

import React, { useState, useEffect } from 'react';
import apiClient from '../../../lib/api/client';
import { useRouter } from 'next/navigation';

export default function NomineeSettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [nominee, setNominee] = useState({
        name: '',
        email: '',
        mobile: '',
        relationship: '',
        notes: '',
        inactivityThresholdDays: 60,
        messageToNominee: '',
        isEnabled: false,
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchNominee = async () => {
            try {
                const res = await apiClient.get('/nominee');
                if (res.data) {
                    setNominee(res.data);
                }
            } catch (err: any) {
                console.error("Failed to fetch nominee:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchNominee();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (nominee.isEnabled && (!nominee.name || !nominee.email)) {
            setError('Name and Email are required to enable Nominee Access.');
            return;
        }

        setSaving(true);
        try {
            // Strip DB-specific fields that validation will reject
            const { id, userId, createdAt, updatedAt, lastTriggeredAt, ...payload } = nominee as any;

            const res = await apiClient.put('/nominee', payload);
            setNominee(res.data);
            setSuccess('Nominee settings saved successfully! 🛡️');
            setTimeout(() => setSuccess(''), 5000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading Nominee Configuration...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
            <div className="max-w-3xl mx-auto">
                <button
                    onClick={() => router.push('/settings')}
                    className="mb-6 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-2"
                >
                    ← Back to Settings
                </button>

                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <span className="text-4xl">👨‍👩‍👧‍👦</span> Nominee Access
                    </h1>
                    <p className="text-slate-500 mt-2">
                        Designate a trusted person to get read-only access to your assets if you're inactive for a chosen period.
                    </p>
                </header>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Enable Toggle */}
                        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">Enable Nominee Access</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Turn this on to allow system trigger check for inactivity.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setNominee({ ...nominee, isEnabled: !nominee.isEnabled })}
                                className={`relative w-14 h-8 rounded-full transition-colors ${nominee.isEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${nominee.isEnabled ? 'translate-x-6' : ''}`} />
                            </button>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                                <p className="text-sm text-red-800 dark:text-red-200">❌ {error}</p>
                            </div>
                        )}

                        {success && (
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                                <p className="text-sm text-emerald-800 dark:text-emerald-200">{success}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
                                <input
                                    type="text"
                                    value={nominee.name}
                                    onChange={(e) => setNominee({ ...nominee, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="Jane Doe"
                                    required={nominee.isEnabled}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={nominee.email || ''}
                                    onChange={(e) => setNominee({ ...nominee, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="jane@example.com"
                                    required={nominee.isEnabled}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Mobile Number</label>
                                <input
                                    type="tel"
                                    value={nominee.mobile || ''}
                                    onChange={(e) => setNominee({ ...nominee, mobile: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="+1 234 567 8900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Relationship</label>
                                <input
                                    type="text"
                                    value={nominee.relationship || ''}
                                    onChange={(e) => setNominee({ ...nominee, relationship: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="Spouse, Sibling, etc."
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                Inactivity Threshold (Days)
                            </label>
                            <p className="text-xs text-slate-500 mb-3">If you do not log in for this many days, your nominee will be emailed a secure access link.</p>
                            <input
                                type="number"
                                min="1"
                                max="365"
                                value={nominee.inactivityThresholdDays}
                                onChange={(e) => setNominee({ ...nominee, inactivityThresholdDays: parseInt(e.target.value) || 60 })}
                                className="w-full max-w-xs px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                Message to Nominee (Optional)
                            </label>
                            <textarea
                                value={nominee.messageToNominee || ''}
                                onChange={(e) => setNominee({ ...nominee, messageToNominee: e.target.value })}
                                rows={4}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                placeholder="A personal note or instructions to share with them once they access your dashboard."
                            />
                        </div>

                        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? 'Saving...' : '💾 Save Nominee Config'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
