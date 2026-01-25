"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { financialDataApi } from './api/financial-data';
import apiClient, { usersApi } from './api/client';

export interface Currency {
    code: string;
    name: string;
    symbol: string;
    flag: string;
}

export const CURRENCIES: Currency[] = [
    { code: 'AED', name: 'UAE Dirham', symbol: 'AED', flag: '🇦🇪' },
    { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
    { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', flag: '🇸🇦' },
];

interface ExchangeRates {
    [currencyCode: string]: number;
}

interface CurrencyContextType {
    currency: Currency;
    setCurrency: (currency: Currency) => void;
    formatAmount: (amount: number) => string;
    resetCurrency: () => void;
    exchangeRates: ExchangeRates;
    lastUpdate: Date | null;
    isUsingCache: boolean;
    updateExchangeRates: () => Promise<void>;
    convert: (amount: number, fromCurrency?: string) => number;
    convertRaw: (amount: number, from: string, to: string) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
    const [currency, setCurrencyState] = useState<Currency>(CURRENCIES[0]); // Default to AED
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [isUsingCache, setIsUsingCache] = useState(false);

    // Load user and currency preference
    useEffect(() => {
        const loadInitialCurrency = () => {
            const savedUser = localStorage.getItem('user');
            if (savedUser) {
                try {
                    const user = JSON.parse(savedUser);
                    const userId = user.id;
                    setCurrentUserId(userId);

                    // Priority 1: User object from login/me response
                    if (user.currency) {
                        const userCurrency = CURRENCIES.find(c => c.code === user.currency);
                        if (userCurrency) {
                            setCurrencyState(userCurrency);
                            return;
                        }
                    }

                    // Priority 2: User-specific currency preference in localStorage
                    const savedCurrencyCode = localStorage.getItem(`preferredCurrency_${userId}`);
                    if (savedCurrencyCode) {
                        const savedCurrency = CURRENCIES.find(c => c.code === savedCurrencyCode);
                        if (savedCurrency) {
                            setCurrencyState(savedCurrency);
                            return;
                        }
                    }
                } catch (e) {
                    console.error('Error loading user currency preference:', e);
                }
            }
            // Default: AED
            setCurrencyState(CURRENCIES[0]);
        };

        loadInitialCurrency();

        // Listen for login/logout events
        const handleLogin = (e: any) => {
            loadInitialCurrency();
        };

        const handleLogout = () => {
            resetCurrency();
        };

        window.addEventListener('userLogin', handleLogin);
        window.addEventListener('userLogout', handleLogout);

        return () => {
            window.removeEventListener('userLogin', handleLogin);
            window.removeEventListener('userLogout', handleLogout);
        };
    }, []);

    // Fetch exchange rates when currency changes or on mount
    useEffect(() => {
        if (currentUserId) {
            fetchExchangeRates();
        }
    }, [currency, currentUserId]);

    const fetchExchangeRates = async () => {
        try {
            console.log('[CurrencyContext] Fetching exchange rates from API...');
            const response = await apiClient.get('/exchange-rates');
            const data = response.data;

            console.log('[CurrencyContext] Received exchange rate data:', data);
            console.log('[CurrencyContext] Extracted rates:', data.rates);
            console.log('[CurrencyContext] Number of rates:', Object.keys(data.rates || {}).length);

            setExchangeRates(data.rates || {});
            setLastUpdate(data.fetchedAt ? new Date(data.fetchedAt) : new Date());
            setIsUsingCache(data.usingCache || false);

            console.log('[CurrencyContext] Exchange rates set successfully:', data.rates);
        } catch (error) {
            console.error('[CurrencyContext] Failed to fetch exchange rates:', error);
            // Keep existing rates if fetch fails
        }
    };

    const updateExchangeRates = async () => {
        try {
            const response = await apiClient.post('/exchange-rates/refresh');
            const data = response.data;

            setExchangeRates(data.rates || {});
            setLastUpdate(data.fetchedAt ? new Date(data.fetchedAt) : new Date());
            setIsUsingCache(false);
        } catch (error) {
            console.error('Failed to refresh exchange rates:', error);
            throw error;
        }
    };

    const setCurrency = async (newCurrency: Currency) => {
        setCurrencyState(newCurrency);

        // Save with user-specific key
        if (currentUserId) {
            localStorage.setItem(`preferredCurrency_${currentUserId}`, newCurrency.code);

            // Also update the user object in localStorage for consistency
            const savedUser = localStorage.getItem('user');
            if (savedUser) {
                try {
                    const user = JSON.parse(savedUser);
                    user.currency = newCurrency.code;
                    localStorage.setItem('user', JSON.stringify(user));
                } catch (e) {
                    console.error('Failed to update user object with new currency:', e);
                }
            }

            // Update on backend
            try {
                await usersApi.updateCurrency(newCurrency.code);
            } catch (error) {
                console.error('Failed to update currency preference:', error);
            }
        }
    };

    const resetCurrency = () => {
        setCurrencyState(CURRENCIES[0]);
        setCurrentUserId(null);
    };

    const formatAmount = (amount: number): string => {
        return `${currency.symbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    /**
     * Convert amount from one currency to display currency
     * @param amount - The amount to convert
     * @param fromCurrency - The currency code the amount is in (e.g., 'AED', 'USD')
     * @returns Converted amount in display currency
     */
    const convert = (amount: number, fromCurrency: string = 'AED'): number => {
        console.log(`[CurrencyContext] Converting ${amount} from ${fromCurrency} to ${currency.code}`);
        console.log('[CurrencyContext] Available exchange rates:', exchangeRates);

        // If same currency, no conversion needed
        if (fromCurrency === currency.code) {
            console.log('[CurrencyContext] Same currency, no conversion needed');
            return amount;
        }

        // If no exchange rates loaded, return original amount
        if (Object.keys(exchangeRates).length === 0) {
            console.warn('[CurrencyContext] No exchange rates loaded! Returning original amount');
            return amount;
        }

        try {
            // Convert through AED as base currency
            let amountInAED = amount;

            // If fromCurrency is not AED, convert to AED first
            if (fromCurrency !== 'AED') {
                const rateToAED = exchangeRates[fromCurrency];
                console.log(`[CurrencyContext] Rate ${fromCurrency}->AED:`, rateToAED);
                if (!rateToAED) {
                    console.warn(`No exchange rate found for ${fromCurrency}, using original amount`);
                    return amount;
                }
                // If rate is AED->USD = 0.27, then USD->AED = 1/0.27
                amountInAED = amount / rateToAED;
                console.log(`[CurrencyContext] ${amount} ${fromCurrency} = ${amountInAED} AED`);
            }

            // Now convert from AED to target currency
            if (currency.code === 'AED') {
                console.log('[CurrencyContext] Target is AED, returning:', amountInAED);
                return amountInAED;
            }

            const rateFromAED = exchangeRates[currency.code];
            console.log(`[CurrencyContext] Rate AED->${currency.code}:`, rateFromAED);
            if (!rateFromAED) {
                console.warn(`No exchange rate found for ${currency.code}, using original amount`);
                return amount;
            }

            const result = amountInAED * rateFromAED;
            console.log(`[CurrencyContext] Final result: ${amountInAED} AED = ${result} ${currency.code}`);
            return result;
        } catch (error) {
            console.error('Currency conversion error:', error);
            return amount;
        }
    };

    const convertRaw = (amount: number, from: string, to: string): number => {
        if (from === to) return amount;
        if (Object.keys(exchangeRates).length === 0) return amount;

        try {
            // Convert to AED first
            let amountInAED = amount;
            if (from !== 'AED') {
                const rateToAED = exchangeRates[from];
                if (!rateToAED) return amount;
                amountInAED = amount / rateToAED;
            }

            // Convert from AED to target
            if (to === 'AED') return amountInAED;
            const rateFromAED = exchangeRates[to];
            if (!rateFromAED) return amountInAED;
            return amountInAED * rateFromAED;
        } catch (error) {
            return amount;
        }
    };

    return (
        <CurrencyContext.Provider value={{
            currency,
            setCurrency,
            formatAmount,
            resetCurrency,
            exchangeRates,
            lastUpdate,
            isUsingCache,
            updateExchangeRates,
            convert,
            convertRaw,
        }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
}
