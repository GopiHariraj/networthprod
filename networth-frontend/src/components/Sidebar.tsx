"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';

const MENU_ITEMS = [
    { name: 'Dashboard', icon: '📊', path: '/' },
    { name: 'Cash', icon: '💰', path: '/cash' },
    { name: 'Gold', icon: '🥇', path: '/gold' },
    { name: 'Stocks', icon: '📈', path: '/stocks' },
    { name: 'Bonds', icon: '📜', path: '/bonds' },
    { name: 'Property', icon: '🏠', path: '/property' },
    { name: 'Mutual Funds', icon: '📊', path: '/mutual-funds' },
    { name: 'Loans', icon: '💳', path: '/loans' },
    { name: 'Insurance', icon: '🛡️', path: '/insurance' },
    { name: 'Depreciating Assets', icon: '📉', path: '/depreciating-assets' },
    { name: 'AI Analysis', icon: '✨', path: '/ai-analysis' },
    { name: 'Expenses', path: '/expenses', icon: '💵' },
    { name: 'To-Do', icon: '📝', path: '/todo' },
];

interface SidebarProps {
    isOpen?: boolean;
    isCollapsed?: boolean;
    onToggleOpen?: () => void;
    onToggleCollapse?: () => void;
}

function Sidebar({ isOpen = true, isCollapsed = false, onToggleOpen, onToggleCollapse }: SidebarProps) {
    const { isAuthenticated, logout, user } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [isShortHeight, setIsShortHeight] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Handle resize for height detection
    useEffect(() => {
        const handleResize = () => {
            setIsShortHeight(window.innerHeight < 600);
        };

        // Initial check
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Map menu item names to visibility keys
    const visibilityKeyMap: Record<string, string> = {
        'Gold': 'gold',
        'Stocks': 'stocks',
        'Bonds': 'bonds',
        'Property': 'property',
        'Mutual Funds': 'mutualFunds',
        'Loans': 'loans',
        'Insurance': 'insurance',
        'Depreciating Assets': 'depreciatingAssets',
        'To-Do': 'todo'
    };

    // Memoize filtered items to prevent recalculation on every render
    const filteredItems = useMemo(() => MENU_ITEMS.filter(item => {
        const key = visibilityKeyMap[item.name];
        if (!key) return true; // Core modules are always visible
        if (!user?.moduleVisibility) return true; // Default to visible if settings not loaded
        return user.moduleVisibility[key] !== false; // Explicitly hidden if false
    }), [user?.moduleVisibility]);

    // Render Logic:
    // Short Screen: Full scrollable container (Profile moves with scroll)
    // Tall Screen: Flex container with Fixed Profile (Nav-only scroll)

    return (
        <>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-30 transition-opacity"
                    onClick={onToggleOpen}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                ${isCollapsed ? 'w-20' : 'w-64'}
                bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 
                fixed inset-y-0 left-0 flex flex-col z-50 transition-all duration-300
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                md:translate-x-0
                ${isShortHeight ? 'overflow-y-auto block' : 'overflow-hidden'} 
            `}>
                {/* Logo */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 shrink-0">
                    <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    {!isCollapsed && <span className="font-bold text-xl text-slate-900 dark:text-white">Net Worth</span>}
                </div>

                {/* Desktop Collapse Toggle */}
                <button
                    onClick={onToggleCollapse}
                    className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full items-center justify-center shadow-lg z-10 transition-colors"
                    title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                    {isCollapsed ? '→' : '←'}
                </button>

                {/* Content Container */}
                <div className={`
                    ${isShortHeight ? '' : 'flex-1 flex flex-col overflow-hidden'}
                `}>
                    {/* Navigation */}
                    <nav id="sidebar-nav-container" className={`
                        p-4 space-y-1 
                        ${isShortHeight ? '' : 'flex-1 overflow-y-auto custom-scrollbar'}
                    `}>
                        {filteredItems.map((item) => (
                            <Link
                                key={item.path}
                                id={`sidebar-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                                href={item.path}
                                prefetch={true}
                                onClick={() => onToggleOpen?.()} // Close on mobile when link clicked
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors relative group ${pathname === item.path
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-medium'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                    }`}
                                title={isCollapsed ? item.name : ''}
                            >
                                <span className={isCollapsed ? 'text-2xl' : 'text-xl'}>{item.icon}</span>
                                {!isCollapsed && <span>{item.name}</span>}

                                {/* Tooltip for collapsed state */}
                                {isCollapsed && (
                                    <div className="absolute left-full ml-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                        {item.name}
                                    </div>
                                )}
                            </Link>
                        ))}
                    </nav>

                    {/* User Profile */}
                    <div className={`
                        shrink-0 p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 relative
                        ${isShortHeight ? '' : 'mt-auto'}
                    `}>
                        <button
                            id="sidebar-user-menu-trigger"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`flex items-center gap-3 w-full p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors text-left group ${isCollapsed ? 'justify-center' : ''}`}
                            title={isCollapsed ? user?.name : ''}
                        >
                            <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white dark:ring-slate-800 group-hover:ring-blue-200 dark:group-hover:ring-blue-900 transition-all shrink-0">
                                {user?.name?.[0] || 'U'}
                            </div>
                            <div className={`flex-1 min-w-0 ${isCollapsed ? 'max-md:block hidden' : ''}`}>
                                <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{user?.name}</p>
                                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                            </div>
                            {!isCollapsed && <span className="text-slate-400 text-xs">▼</span>}
                        </button>

                        {isMenuOpen && !isCollapsed && (
                            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-20">
                                {/* @ts-ignore */}
                                {user?.role === 'SUPER_ADMIN' && (
                                    <Link
                                        href="/admin"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="block px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700"
                                    >
                                        🛡️ Admin Dashboard
                                    </Link>
                                )}
                                <Link
                                    href="/settings"
                                    id="sidebar-settings-link"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700"
                                >
                                    ⚙️ Settings
                                </Link>
                                <button
                                    onClick={logout}
                                    className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                    🚪 Sign Out
                                </button>
                            </div>
                        )}

                        {/* Collapsed state tooltip */}
                        {isCollapsed && (
                            <div className="absolute left-full bottom-4 ml-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                {user?.name}
                            </div>
                        )}
                    </div>
                </div>
            </aside>
            {/* End Sidebar */}        </>
    );
}

// Hamburger Button Component
export function HamburgerButton({ onClick, isOpen }: { onClick: () => void; isOpen: boolean }) {
    return (
        <button
            onClick={onClick}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle menu"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
            </svg>
        </button>
    );
}

// Export memoized component to prevent unnecessary re-renders
export default React.memo(Sidebar);
