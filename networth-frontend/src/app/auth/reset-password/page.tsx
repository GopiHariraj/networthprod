"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authApi } from '../../../lib/api/client';
import Link from 'next/link';

function ResetPasswordLogic() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setErrorMessage('No reset token provided. Please request a new password reset link.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        if (newPassword.length < 6) {
            setStatus('error');
            setErrorMessage('Password must be at least 6 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setStatus('error');
            setErrorMessage('Passwords do not match.');
            return;
        }

        setStatus('loading');

        try {
            await authApi.resetPassword({ token: token as string, newPassword });
            setStatus('success');
        } catch (err: any) {
            setStatus('error');
            setErrorMessage(err.response?.data?.message || 'Invalid or expired reset token. Please request a new link.');
        }
    };

    if (status === 'success') {
        return (
            <div className="text-center p-8 max-w-md mx-auto">
                <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium text-lg mb-1">Password updated successfully!</p>
                    <p className="text-sm">You can now sign in with your new password.</p>
                </div>
                <button
                    onClick={() => router.push('/login')}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                >
                    Return to Sign In
                </button>
            </div>
        );
    }

    if (!token && status === 'error') {
        return (
            <div className="text-center p-8 max-w-md mx-auto">
                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium">{errorMessage}</p>
                </div>
                <button
                    onClick={() => router.push('/auth/forgot-password')}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                >
                    Request New Link
                </button>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Create New Password</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Please enter your new password below.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {status === 'error' && (
                    <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm">
                        ⚠️ {errorMessage}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50 flex justify-center items-center mt-2"
                >
                    {status === 'loading' ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        "Reset Password"
                    )}
                </button>
            </form>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-700">
                <Suspense fallback={
                    <div className="flex flex-col items-center justify-center p-12">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <h2 className="text-lg font-medium text-slate-600 dark:text-slate-300">Loading...</h2>
                    </div>
                }>
                    <ResetPasswordLogic />
                </Suspense>
            </div>
        </div>
    );
}
