"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '../../../lib/api/client';
import { useAuth } from '../../../lib/auth-context';

export default function NomineeAccessPage({ params }: { params: { token: string } }) {
    const router = useRouter();
    const { login } = useAuth();
    const { token } = params;

    const [step, setStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [otp, setOtp] = useState('');

    const handleRequestOtp = async () => {
        setLoading(true);
        setError('');
        try {
            await apiClient.post('/nominee/access/request-otp', { token });
            setStep('VERIFY');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to request access. The link may have expired.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await apiClient.post('/nominee/access/verify-otp', { token, otp });
            const { access_token, user_name, accessWindowEnd } = res.data;

            // Log them in using the Auth Context with a special restricted role
            login(access_token, {
                id: 'readonly-nominee',
                email: 'nominee@access.local',
                name: `Nominee for ${user_name}`,
                role: 'NOMINEE_READ_ONLY',
                currency: 'AED', // Could also come from the API payload
            });

            alert(`✅ Access granted until ${new Date(accessWindowEnd).toLocaleString()}`);
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid or expired OTP.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center text-6xl mb-6">
                    🛡️
                </div>
                <h2 className="text-center text-3xl font-extrabold text-slate-900 dark:text-white">
                    Emergency Asset Access
                </h2>
                <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
                    You have been designated as a trusted nominee.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-slate-200 dark:border-slate-700">

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 text-sm rounded-lg border border-red-200 dark:border-red-800">
                            {error}
                        </div>
                    )}

                    {step === 'REQUEST' ? (
                        <div className="space-y-6">
                            <p className="text-slate-700 dark:text-slate-300 text-sm text-center leading-relaxed">
                                To protect the user's data, we must verify your identity. Click the button below to receive a secure One-Time Password (OTP) via email.
                            </p>
                            <button
                                onClick={handleRequestOtp}
                                disabled={loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50 transition-colors"
                            >
                                {loading ? 'Processing...' : 'Request Access OTP'}
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <p className="text-slate-700 dark:text-slate-300 text-sm text-center">
                                An OTP has been sent to your email. Please enter it below to securely access the assets.
                            </p>
                            <div>
                                <label htmlFor="otp" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    6-Digit Verification Code
                                </label>
                                <div className="mt-1">
                                    <input
                                        id="otp"
                                        name="otp"
                                        type="text"
                                        autoComplete="off"
                                        required
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                        className="appearance-none block w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-center text-2xl tracking-widest"
                                        placeholder="000000"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading || otp.length !== 6}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50 transition-colors"
                            >
                                {loading ? 'Verifying...' : 'Verify & Access'}
                            </button>
                        </form>
                    )}
                </div>
                {step === 'VERIFY' && (
                    <div className="text-center mt-4">
                        <button
                            onClick={() => setStep('REQUEST')}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            Didn't receive code? Request again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
