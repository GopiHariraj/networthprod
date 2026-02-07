
"use client";

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function CallbackContent() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            try {
                // Decode token to extract user info
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

                // SAFARI FIX: Pass token and user via URL parameters
                // This bypasses all localStorage/cookie issues on Safari
                const encodedUser = encodeURIComponent(JSON.stringify(user));

                // Use window.location.replace for a clean redirect without history
                window.location.replace(`/?sso_token=${encodeURIComponent(token)}&sso_user=${encodedUser}`);
            } catch (e) {
                console.error('Failed to process login', e);
                window.location.replace('/login?error=auth_failed');
            }
        } else {
            window.location.replace('/login?error=no_token');
        }
    }, [searchParams]);

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
