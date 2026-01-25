"use client";

import { useRoutePreloader } from '../lib/hooks/useRoutePreloader';

/**
 * Component that triggers aggressive route prefetching after authentication.
 * Must be a client component to use hooks.
 */
export default function RoutePreloader() {
    useRoutePreloader();
    return null; // This component doesn't render anything
}
