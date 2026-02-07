
"use client";

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../lib/auth-context';

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const decoded = JSON.parse(jsonPayload);

                const user = {
                    id: decoded.sub,
                    email: decoded.email,
                    name: decoded.name || 'User',
                    role: decoded.role,
                };

                // Pass true to skip default router.push
                login(token, user, true);

                // Safari fix: Wait for localStorage to be set before redirecting
                // This prevents redirect loops on mobile Safari
                let retryCount = 0;
                const MAX_RETRIES = 20; // 2 seconds max wait

                const verifyAndRedirect = () => {
                    const savedToken = localStorage.getItem('token');
                    if (savedToken === token) {
                        // localStorage confirmed, safe to redirect
                        router.push('/');
                    } else if (retryCount < MAX_RETRIES) {
                        // Retry after a short delay (Safari may need time)
                        retryCount++;
                        setTimeout(verifyAndRedirect, 100);
                    } else {
                        // Timeout: force redirect anyway to prevent infinite loop
                        console.warn('[Auth Callback] localStorage verification timeout, forcing redirect');
                        router.push('/');
                    }
                };

                // Small initial delay to ensure localStorage write completes
                setTimeout(verifyAndRedirect, 50);
            } catch (e) {
                console.error('Failed to process login', e);
                router.push('/login?error=auth_failed');
            }
        } else {
            router.push('/login?error=no_token');
        }
    }, [searchParams, login, router]);

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="text-white text-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h2 className="text-xl font-bold">Authenticating...</h2>
                <p className="text-slate-400">Please wait while we log you in.</p>
            </div>
        </div>
    );
}

export default function GoogleCallbackPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CallbackContent />
        </Suspense>
    );
}
