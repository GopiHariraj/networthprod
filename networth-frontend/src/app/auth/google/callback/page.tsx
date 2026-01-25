
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
            // Decode token to get user info if needed, or backend can return user in query params too
            // For now, we trust the token and let auth-context fetch profile or decode it
            // Actually, context.login expects (token, user).
            // We might need to fetch user profile using the token, OR decode it.
            // Simplified: login with token, and let context decode payload.

            // To properly mock the user object without another call, we can decode the token
            try {
                // Fetch full user profile to ensure we have latest settings (moduleVisibility, etc)
                // We must pass the token explicitly since it's not in localStorage yet
                import('../../../../lib/api/client').then(async ({ default: client }) => {
                    try {
                        const response = await client.get('/users/me/profile', {
                            headers: { Authorization: `Bearer ${token}` }
                        });

                        const fullUser = response.data;
                        console.log('Fetched full user profile:', fullUser);

                        // Pass true to skip default router.push and force hard redirect below
                        login(token, fullUser, true);

                        // Force hard reload to clear any router/state issues
                        window.location.href = '/';
                    } catch (err) {
                        console.error('Failed to fetch user profile, falling back to token payload', err);
                        // Fallback logic
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
                        login(token, user, true);
                        window.location.href = '/';
                    }
                });

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
