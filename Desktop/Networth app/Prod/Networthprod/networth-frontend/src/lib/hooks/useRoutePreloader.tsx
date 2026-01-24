import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth-context';

/**
 * Hook to aggressively prefetch all application routes after authentication.
 * This preloads JavaScript bundles for instant navigation.
 */
export function useRoutePreloader() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) return;

        // Define all routes to prefetch
        const routes = [
            '/',
            '/cash',
            '/gold',
            '/stocks',
            '/bonds',
            '/property',
            '/mutual-funds',
            '/loans',
            '/insurance',
            '/depreciating-assets',
            '/ai-analysis',
            '/expenses',
            '/reports',
            '/goals',
            '/settings',
            '/assets',
            '/liabilities'
        ];

        // Prefetch all routes with a slight delay between each to avoid overwhelming the browser
        routes.forEach((route, index) => {
            setTimeout(() => {
                router.prefetch(route);
            }, index * 50); // 50ms delay between each prefetch
        });

        console.log('[RoutePreloader] Prefetching', routes.length, 'routes for instant navigation');
    }, [isAuthenticated, router]);
}
