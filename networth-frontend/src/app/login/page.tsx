"use client";

import React, { useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi, API_URL } from '../../lib/api/client';

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();
    const [isSignup, setIsSignup] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [failedAttempts, setFailedAttempts] = useState(0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isSignup) {
                const response = await authApi.signup({ email, password, firstName, lastName });
                const { access_token, user } = response.data;
                login(access_token, user);
            } else {
                const response = await authApi.login({ email, password });
                const { access_token, user } = response.data;
                login(access_token, user);
            }
        } catch (err: any) {
            const message = err.response?.data?.message || err.message || 'Authentication failed';

            if (!isSignup) {
                setFailedAttempts(prev => prev + 1);
            }

            if (message.includes('Account disabled') || message.includes('too many failed attempts')) {
                setFailedAttempts(5); // Ensure it's marked as disabled
                setError('Account disabled due to too many failed attempts. Please reset your password.');
            } else {
                setError(message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = `${API_URL}/auth/google`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Login Card */}
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
                    {/* Logo/Title */}
                    <div className="text-center mb-8">
                        <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                            <span className="text-5xl">💰</span>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Net Worth Tracker</h1>
                        <p className="text-blue-100">{isSignup ? 'Create your account' : 'Welcome back'}</p>
                    </div>

                    {/* Google Login Button */}
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-full bg-white text-slate-700 py-3 rounded-xl font-bold mb-6 flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-lg"
                    >
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                        Continue with Google
                    </button>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/20"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-transparent text-white/60 backdrop-blur-sm">Or use email</span>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-500/20 border border-red-300 rounded-xl p-4 backdrop-blur-sm">
                                <p className="text-red-100 text-sm">⚠️ {error}</p>
                            </div>
                        )}

                        {isSignup && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-blue-100 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-blue-100 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-blue-100 mb-1">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                                required
                            />
                        </div>

                        <div>
                            <div className="flex justify-between mb-1 items-center">
                                <label className="block text-sm font-medium text-blue-100">Password</label>
                                {!isSignup && (
                                    <Link href={`/auth/forgot-password?email=${encodeURIComponent(email)}`} className="text-xs text-emerald-400 font-semibold hover:text-emerald-300 transition-colors bg-emerald-900/30 px-2 py-1 rounded">
                                        Forgot password?
                                    </Link>
                                )}
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-500 text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-400 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] mt-4"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Processing...</span>
                                </div>
                            ) : (
                                isSignup ? "✨ Create Account" : "🔐 Sign In"
                            )}
                        </button>
                    </form>

                    {/* Toggle */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => { setIsSignup(!isSignup); setError(''); }}
                            className="text-white/80 hover:text-white font-medium text-sm transition-colors"
                        >
                            {isSignup ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                        </button>
                    </div>

                </div>

                {/* Bottom Info */}
                <div className="mt-8 text-center">
                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        Secure authentication powered by Enterprise JWT
                    </p>
                </div>
            </div>
        </div>
    );
}
