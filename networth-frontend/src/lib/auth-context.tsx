"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import apiClient, { usersApi, apiCache } from './api/client';

interface User {
    id: string;
    email: string;
    name: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    currency?: string;
    forceChangePassword?: boolean;
    moduleVisibility?: Record<string, boolean>;
    enableProductTour?: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User, skipRedirect?: boolean) => void;
    logout: () => void;
    updateUser: (user: Partial<User>) => void;
    updateModuleVisibility: (visibility: Record<string, boolean>) => Promise<void>;
    updateProductTourPreference: (enabled: boolean) => Promise<void>;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Helper to check if JWT token is expired
    const isTokenExpired = (token: string): boolean => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            const { exp } = JSON.parse(jsonPayload);
            if (!exp) return false;
            // Add 10 second buffer to exp time
            return Date.now() >= exp * 1000 - 10000;
        } catch (e) {
            return true; // Assume expired if invalid
        }
    };

    // Helper to get token from cookie
    const getTokenFromCookie = (): string | null => {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'token') {
                return value;
            }
        }
        return null;
    };

    // Helper to get user from cookie
    const getUserFromCookie = (): User | null => {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'user') {
                try {
                    return JSON.parse(decodeURIComponent(value));
                } catch {
                    return null;
                }
            }
        }
        return null;
    };

    // Check token on mount and pathname changes
    React.useEffect(() => {
        // Try localStorage first, fall back to cookies (Safari ITP workaround)
        let savedToken = localStorage.getItem('token');
        let savedUser = localStorage.getItem('user');
        let parsedUser: User | null = null;

        // Parse user from localStorage if available
        if (savedUser) {
            try {
                parsedUser = JSON.parse(savedUser);
            } catch {
                parsedUser = null;
            }
        }

        // Fallback to cookies if localStorage fails (Safari ITP)
        if (!savedToken) {
            console.log('[AuthContext] localStorage empty, checking cookies...');
            savedToken = getTokenFromCookie();
            if (savedToken) {
                console.log('[AuthContext] Found token in cookie, syncing to localStorage');
                localStorage.setItem('token', savedToken);
            }
        }

        if (!parsedUser) {
            parsedUser = getUserFromCookie();
            if (parsedUser) {
                console.log('[AuthContext] Found user in cookie, syncing to localStorage');
                localStorage.setItem('user', JSON.stringify(parsedUser));
            }
        }

        if (savedToken && parsedUser) {
            if (isTokenExpired(savedToken)) {
                console.warn('[AuthContext] Token expired, logging out');
                logout();
                return;
            }

            setUser(parsedUser);
            setToken(savedToken);
            setIsAuthenticated(true);
            setIsLoading(false);

            // Force Password Change Check
            if (parsedUser.forceChangePassword) {
                if (pathname !== '/reset-password' && pathname !== '/auth/logout') {
                    router.push('/reset-password');
                }
            } else {
                // Optionally redirect to dashboard after successful auth
                if (pathname === '/login' || pathname === '/register') {
                    router.push('/');
                }
            }
        } else {
            // Redirect to login if not authenticated and not on public page
            const publicPaths = ['/login', '/register', '/reset-password', '/auth/reset-password', '/auth/magic-login', '/auth/reset', '/auth/google/callback'];

            setIsLoading(false);
            if (!publicPaths.some(path => pathname.startsWith(path))) {
                router.push('/login');
            }
        }
    }, [pathname, router]); // Only re-run when pathname or router changes

    useEffect(() => {
        // Additional check for window focus to catch expiration
        const handleFocus = () => {
            const savedToken = localStorage.getItem('token');
            if (savedToken && isTokenExpired(savedToken)) {
                console.warn('[AuthContext] Token expired on focus, logging out');
                logout();
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []); // Only set up once

    const login = (newToken: string, userData: User, skipRedirect = false) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));

        // Store token and user in cookie for Safari ITP compatibility
        document.cookie = `token=${newToken}; path=/; max-age=7200; SameSite=Lax`;
        document.cookie = `user=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=7200; SameSite=Lax`;

        setUser(userData);
        setToken(newToken);
        setIsAuthenticated(true);

        // Dispatch custom event for context providers to react
        window.dispatchEvent(new CustomEvent('userLogin', { detail: { userId: userData.id } }));

        if (skipRedirect) return;

        if (userData.forceChangePassword) {
            router.push('/reset-password');
        } else {
            router.push('/');
        }
    };

    const logout = () => {
        // Get user ID before clearing to clean up user-scoped data
        const userId = user?.id;

        // Clear only user-specific data instead of all localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('refreshToken');

        // Clear auth cookie
        document.cookie = 'token=; path=/; max-age=0';

        // Clear user-scoped data if user ID exists
        if (userId) {
            localStorage.removeItem(`activeGoal_${userId}`);
            localStorage.removeItem(`preferredCurrency_${userId}`);
        }

        // Reset state
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);

        // Clear Cache API storage
        apiCache.clear();

        // Dispatch custom event for context providers to react
        window.dispatchEvent(new Event('userLogout'));

        // Transition to login page
        router.push('/login');
    };

    const updateUser = (data: Partial<User>) => {
        if (!user) return;
        const updatedUser = { ...user, ...data };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    const updateModuleVisibility = async (visibility: Record<string, boolean>) => {
        if (!user) return;
        try {
            await usersApi.updateModuleVisibility(visibility);
            const updatedUser = { ...user, moduleVisibility: visibility };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (error) {
            console.error('Failed to update module visibility', error);
            throw error;
        }
    };

    const updateProductTourPreference = async (enabled: boolean) => {
        if (!user) return;
        try {
            await apiClient.put('/users/me/product-tour', { enableProductTour: enabled });
            const updatedUser = { ...user, enableProductTour: enabled };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (error) {
            console.error('Failed to update product tour preference', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, updateUser, updateModuleVisibility, updateProductTourPreference, isAuthenticated, isLoading }}>
            {isLoading ? (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-600 dark:text-slate-400 font-medium">Loading...</p>
                    </div>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
