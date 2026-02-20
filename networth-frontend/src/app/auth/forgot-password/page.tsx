"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../../../lib/api/client';

function ForgotPasswordLogic() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const emailParam = searchParams.get('email');

    const [email, setEmail] = useState('');
    const [emailTouched, setEmailTouched] = useState(false);

    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isEmailValid = isValidEmail(email);

    // Set email from URL if available
    useEffect(() => {
        if (emailParam) {
            setEmail(emailParam);
            setEmailTouched(true);
        }
    }, [emailParam]);

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleResend = async () => {
        setResendStatus('loading');
        try {
            await authApi.forgotPassword({ email });
            setResendStatus('success');
            setTimeout(() => setResendStatus('idle'), 5000);
        } catch (err) {
            setResendStatus('error');
            setTimeout(() => setResendStatus('idle'), 5000);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setStatus('loading');

        try {
            const res = await authApi.forgotPassword({ email });
            setMessage(res.data.message || 'If an account with that email exists, a password reset link has been sent.');
            setStatus('success');
        } catch (err: any) {
            // We usually want to display the generic success message either way to hinder email enumeration, 
            // but for UI feedback on genuine networking errors:
            setMessage(err.response?.data?.message || 'Failed to send reset email. Please try again later.');
            setStatus('error');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Forgot Password</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Enter the email linked to your account. We&apos;ll send a reset token to your inbox.
                    </p>
                </div>

                {status === 'success' ? (
                    <div className="text-center">
                        <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="font-medium text-sm">{message}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                                Didn&apos;t receive the email? Check your spam folder or
                                <button
                                    onClick={handleResend}
                                    disabled={resendStatus === 'loading' || resendStatus === 'success'}
                                    className="ml-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium underline disabled:opacity-50 disabled:no-underline"
                                >
                                    {resendStatus === 'loading' ? 'Sending...' : resendStatus === 'success' ? 'Sent!' : 'Resend Email'}
                                </button>
                            </div>

                            {resendStatus === 'error' && (
                                <p className="text-xs text-red-500">Failed to resend. Please try again later.</p>
                            )}

                            <div>
                                <Link href="/login" className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium transition-colors">
                                    Return to Sign In
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {status === 'error' && (
                            <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm">
                                ⚠️ {message}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (!emailTouched && e.target.value.length > 0) setEmailTouched(true);
                                }}
                                onBlur={() => setEmailTouched(true)}
                                placeholder="Enter your registered email"
                                className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border ${emailTouched && email !== '' && !isEmailValid ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow`}
                                required
                            />
                            {emailTouched && email !== '' && !isEmailValid && (
                                <p className="text-red-500 text-xs mt-1">Please enter a valid email address.</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={status === 'loading' || email === '' || !isEmailValid}
                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                        >
                            {status === 'loading' ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                "Send reset token"
                            )}
                        </button>

                        <div className="text-center mt-4">
                            <Link href="/login" className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors">
                                Back to Sign In
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-12">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <h2 className="text-lg font-medium text-slate-600 dark:text-slate-300">Loading...</h2>
            </div>
        }>
            <ForgotPasswordLogic />
        </Suspense>
    );
}
