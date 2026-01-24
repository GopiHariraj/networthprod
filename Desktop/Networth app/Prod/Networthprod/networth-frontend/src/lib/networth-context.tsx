"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { financialDataApi } from './api/financial-data';
import { apiCache, depreciatingAssetsApi } from './api/client';
import { useCurrency } from './currency-context';
import { useAuth } from './auth-context';

interface AssetItem {
    id: string;
    [key: string]: any;
}

interface NetWorthData {
    assets: {
        gold: { items: AssetItem[]; totalValue: number };
        bonds: { items: AssetItem[]; totalValue: number };
        stocks: { items: AssetItem[]; totalValue: number };
        property: { items: AssetItem[]; totalValue: number };
        mutualFunds: { items: AssetItem[]; totalValue: number };
        insurance: { items: AssetItem[]; totalValue: number };
        depreciatingAssets: { items: AssetItem[]; totalValue: number };
        cash: {
            bankAccounts: AssetItem[];
            wallets: AssetItem[];
            totalBank: number;
            totalWallet: number;
            totalCash: number;
        };
    };
    liabilities: {
        loans: { items: AssetItem[]; totalValue: number };
        creditCards: { items: AssetItem[]; totalValue: number };
    };
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    lastUpdated: string;
}

interface NetWorthContextType {
    data: NetWorthData;
    updateGold: () => Promise<void>;
    updateBonds: () => Promise<void>;
    updateStocks: () => Promise<void>;
    updateProperty: () => Promise<void>;
    updateMutualFunds: () => Promise<void>;
    updateDepreciatingAssets: () => Promise<void>;
    updateCash: () => Promise<void>;
    updateLoans: () => Promise<void>;
    updateCreditCards: () => Promise<void>;
    refreshNetWorth: () => Promise<void>;
    resetNetWorth: () => void;
    isLoading: boolean;
}

const NetWorthContext = createContext<NetWorthContextType | undefined>(undefined);

export function NetWorthProvider({ children }: { children: ReactNode }) {
    const { convertRaw } = useCurrency();
    const { user, isAuthenticated } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Raw data states
    const [goldItems, setGoldItems] = useState<AssetItem[]>([]);
    const [bondItems, setBondItems] = useState<AssetItem[]>([]);
    const [stockItems, setStockItems] = useState<AssetItem[]>([]);
    const [propertyItems, setPropertyItems] = useState<AssetItem[]>([]);
    const [mutualFundItems, setMutualFundItems] = useState<AssetItem[]>([]);
    const [bankAccounts, setBankAccounts] = useState<AssetItem[]>([]);
    const [wallets, setWallets] = useState<AssetItem[]>([]);
    const [loanItems, setLoanItems] = useState<AssetItem[]>([]);
    const [insuranceItems, setInsuranceItems] = useState<AssetItem[]>([]);
    const [depreciatingAssetItems, setDepreciatingAssetItems] = useState<AssetItem[]>([]);
    const [creditCardItems, setCreditCardItems] = useState<AssetItem[]>([]);
    const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());

    // Helper to load from cache then fetch
    const loadCategory = useCallback(async (
        apiCall: () => Promise<any>,
        setter: (data: any) => void,
        cacheKey: string,
        filterFn?: (data: any) => any
    ) => {
        // 1. Try Cache First (Immediate UI)
        const cached = await apiCache.get(cacheKey);
        if (cached) {
            setter(filterFn ? filterFn(cached) : cached);
        }

        // 2. Background Fetch (Stale-While-Revalidate)
        try {
            const res = await apiCall();
            const data = res.data || [];
            setter(filterFn ? filterFn(data) : data);
            setLastUpdated(new Date().toISOString());
        } catch (e) {
            console.error(`Error loading ${cacheKey}:`, e);
        }
    }, []);

    const loadGold = useCallback(() => loadCategory(financialDataApi.goldAssets.getAll, setGoldItems, '/gold-assets'), [loadCategory]);
    const loadStocks = useCallback(() => loadCategory(financialDataApi.stockAssets.getAll, setStockItems, '/stock-assets'), [loadCategory]);
    const loadProperties = useCallback(() => loadCategory(financialDataApi.properties.getAll, setPropertyItems, '/properties'), [loadCategory]);
    const loadBankAccounts = useCallback(() => loadCategory(financialDataApi.bankAccounts.getAll, (all) => {
        setBankAccounts(all.filter((a: any) => a.accountType !== 'Wallet'));
        setWallets(all.filter((a: any) => a.accountType === 'Wallet'));
    }, '/bank-accounts'), [loadCategory]);
    const loadLoans = useCallback(() => loadCategory(financialDataApi.loans.getAll, setLoanItems, '/loans'), [loadCategory]);
    const loadInsurance = useCallback(() => loadCategory((financialDataApi as any).insurance.getAll, setInsuranceItems, '/insurance'), [loadCategory]);
    const loadDepreciatingAssets = useCallback(() => loadCategory(depreciatingAssetsApi.getAll, setDepreciatingAssetItems, '/depreciating-assets'), [loadCategory]);
    const loadBonds = useCallback(() => loadCategory(financialDataApi.bondAssets.getAll, setBondItems, '/bond-assets'), [loadCategory]);
    const loadMutualFunds = useCallback(() => loadCategory(financialDataApi.mutualFunds.getAll, setMutualFundItems, '/mutual-fund-assets'), [loadCategory]);
    const loadCreditCards = useCallback(() => loadCategory(financialDataApi.creditCards.getAll, setCreditCardItems, '/credit-cards'), [loadCategory]);

    // Individually memoized categories
    const goldData = React.useMemo(() => {
        const items = goldItems.map((item: any) => ({
            id: item.id,
            ornamentName: item.name,
            grams: parseFloat(item.weightGrams),
            pricePerGram: parseFloat(item.currentValue) / parseFloat(item.weightGrams),
            totalValue: parseFloat(item.currentValue),
            purchaseDate: item.purchaseDate || new Date().toISOString(),
            purity: (() => {
                const n = item.notes || '';
                if (n.startsWith('Purity:')) return n.split(/[\s\n]+/)[1] || '24K';
                return n.split(/[\s\n]+/)[0] || '24K';
            })(),
            imageUrl: item.imageUrl
        }));
        const total = items.reduce((sum, item) => sum + (item.totalValue || 0), 0);
        return { items, totalValue: total };
    }, [goldItems]);

    const stockData = React.useMemo(() => {
        const items = stockItems.map((item: any) => ({
            id: item.id,
            symbol: item.symbol,
            name: item.name,
            exchange: item.exchange,
            market: item.exchange,
            stockName: item.name,
            quantity: parseFloat(item.quantity),
            units: parseFloat(item.quantity),
            avgPrice: parseFloat(item.avgPrice),
            currentPrice: parseFloat(item.currentPrice),
            currency: item.currency || 'AED',
            unitPrice: parseFloat(item.avgPrice),
            totalValue: parseFloat(item.quantity) * parseFloat(item.currentPrice),
            transactions: item.transactions || [],
            purchaseDate: item.createdAt
        }));
        const total = items.reduce((sum, item) => {
            const rawAEDValue = convertRaw(item.totalValue, item.currency, 'AED');
            return sum + (rawAEDValue || 0);
        }, 0);
        return { items, totalValue: total };
    }, [stockItems, convertRaw]);

    const propertyData = React.useMemo(() => {
        const items = propertyItems.map((item: any) => ({
            id: item.id,
            propertyName: item.name,
            location: item.location,
            address: item.address || '',
            purchasePrice: parseFloat(item.purchasePrice),
            currentValue: parseFloat(item.currentValue),
            propertyType: item.propertyType,
            purchaseDate: item.purchaseDate || new Date().toISOString(),
            area: item.area ? parseFloat(item.area) : 0,
            imageUrl: item.imageUrl
        }));
        const total = items.reduce((sum, item) => sum + (item.currentValue || 0), 0);
        return { items, totalValue: total };
    }, [propertyItems]);

    const loanData = React.useMemo(() => {
        const items = loanItems.map((item: any) => ({
            id: item.id,
            lenderName: item.lenderName,
            linkedProperty: item.loanType,
            originalAmount: parseFloat(item.principal),
            outstandingBalance: parseFloat(item.outstanding),
            emiAmount: parseFloat(item.emiAmount),
            interestRate: parseFloat(item.interestRate),
            loanStartDate: item.startDate,
            loanEndDate: item.endDate,
            notes: item.notes || '',
            emiDueDate: 1
        }));
        const total = items.reduce((sum, item) => sum + (item.outstandingBalance || 0), 0);
        return { items, totalValue: total };
    }, [loanItems]);

    const bondData = React.useMemo(() => {
        const items = bondItems.map((item: any) => ({
            id: item.id,
            name: item.name,
            issuer: item.issuer,
            faceValue: parseFloat(item.faceValue),
            currentValue: parseFloat(item.currentValue),
            interestRate: parseFloat(item.interestRate),
            maturityDate: item.maturityDate,
            notes: item.notes
        }));
        const total = items.reduce((sum, item) => sum + (item.currentValue || item.faceValue || 0), 0);
        return { items, totalValue: total };
    }, [bondItems]);

    const mutualFundData = React.useMemo(() => {
        const items = mutualFundItems.map((item: any) => ({
            id: item.id,
            name: item.name,
            fundHouse: item.fundHouse,
            units: parseFloat(item.units),
            avgNav: parseFloat(item.avgNav),
            currentNav: parseFloat(item.currentNav),
            currentValue: parseFloat(item.currentValue),
            notes: item.notes
        }));
        const total = items.reduce((sum, item) => sum + (item.currentValue || 0), 0);
        return { items, totalValue: total };
    }, [mutualFundItems]);

    const insuranceData = React.useMemo(() => {
        const items = insuranceItems.map((item: any) => ({
            id: item.id,
            name: item.name,
            provider: item.provider,
            policyNumber: item.policyNumber,
            premiumAmount: parseFloat(item.premiumAmount),
            benefitAmount: parseFloat(item.benefitAmount),
            totalValue: parseFloat(item.benefitAmount),
            expiryDate: item.expiryDate
        }));
        const total = items.reduce((sum, item) => sum + (item.totalValue || 0), 0);
        return { items, totalValue: total };
    }, [insuranceItems]);

    const depreciatingAssetData = React.useMemo(() => {
        const items = depreciatingAssetItems.map((item: any) => ({
            id: item.id,
            name: item.name,
            type: item.type,
            purchasePrice: parseFloat(item.purchasePrice),
            currentValue: parseFloat(item.currentValue),
            depreciationRate: parseFloat(item.rate || 0),
            purchaseDate: item.purchaseDate,
            notes: item.notes,
            depreciationMethod: item.depreciationMethod,
            usefulLife: item.usefulLife,
            isDepreciationEnabled: item.isDepreciationEnabled
        }));
        const total = items.reduce((sum, item) => sum + (item.currentValue || 0), 0);
        return { items, totalValue: total };
    }, [depreciatingAssetItems]);

    const creditCardData = React.useMemo(() => {
        const items = creditCardItems.map((item: any) => ({
            id: item.id,
            cardName: item.cardName,
            bankName: item.bankName,
            creditLimit: parseFloat(item.creditLimit),
            usedAmount: parseFloat(item.usedAmount),
            dueDate: item.dueDate,
            interestRate: item.interestRate,
            notes: item.notes
        }));
        const total = items.reduce((sum, item) => sum + (item.usedAmount || 0), 0);
        return { items, totalValue: total };
    }, [creditCardItems]);

    const cashData = React.useMemo(() => {
        const bankTotal = bankAccounts.reduce((sum, item: any) => sum + (parseFloat(item.balance) || 0), 0);
        const walletTotal = wallets.reduce((sum, item: any) => sum + (parseFloat(item.balance) || 0), 0);
        const cashTotal = bankTotal + walletTotal;
        return {
            bankAccounts,
            wallets,
            totalBank: bankTotal,
            totalWallet: walletTotal,
            totalCash: cashTotal
        };
    }, [bankAccounts, wallets]);

    // Final combined net worth data
    const data = React.useMemo(() => {
        const isVisible = (moduleId: string) => user?.moduleVisibility?.[moduleId] !== false;

        const effectiveGold = isVisible('gold') ? goldData : { items: [], totalValue: 0 };
        const effectiveBonds = isVisible('bonds') ? bondData : { items: [], totalValue: 0 };
        const effectiveStocks = isVisible('stocks') ? stockData : { items: [], totalValue: 0 };
        const effectiveProperty = isVisible('property') ? propertyData : { items: [], totalValue: 0 };
        const effectiveMutualFunds = isVisible('mutualFunds') ? mutualFundData : { items: [], totalValue: 0 };
        const effectiveInsurance = isVisible('insurance') ? insuranceData : { items: [], totalValue: 0 };
        const effectiveDepreciatingAssets = isVisible('depreciatingAssets') ? depreciatingAssetData : { items: [], totalValue: 0 };
        const effectiveLoans = isVisible('loans') ? loanData : { items: [], totalValue: 0 };

        const totalAssets = effectiveGold.totalValue + effectiveBonds.totalValue +
            effectiveStocks.totalValue + effectiveProperty.totalValue +
            effectiveMutualFunds.totalValue + effectiveInsurance.totalValue +
            effectiveDepreciatingAssets.totalValue + cashData.totalCash;

        const totalLiabilities = effectiveLoans.totalValue + creditCardData.totalValue;
        const netWorth = totalAssets - totalLiabilities;

        return {
            assets: {
                gold: effectiveGold,
                bonds: effectiveBonds,
                stocks: effectiveStocks,
                property: effectiveProperty,
                mutualFunds: effectiveMutualFunds,
                insurance: effectiveInsurance,
                depreciatingAssets: effectiveDepreciatingAssets,
                cash: cashData
            },
            liabilities: {
                loans: effectiveLoans,
                creditCards: creditCardData
            },
            totalAssets,
            totalLiabilities,
            netWorth,
            lastUpdated
        };
    }, [goldData, bondData, stockData, propertyData, mutualFundData, insuranceData, depreciatingAssetData, cashData, loanData, creditCardData, lastUpdated, user?.moduleVisibility]);

    const loadAllData = useCallback(async () => {
        if (!isAuthenticated || !user) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            await Promise.all([
                loadGold(), loadStocks(), loadProperties(), loadBankAccounts(),
                loadLoans(), loadBonds(), loadMutualFunds(), loadCreditCards(),
                loadInsurance(), loadDepreciatingAssets()
            ]);
        } catch (error) {
            console.error('Error loading financial data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, user, loadGold, loadStocks, loadProperties, loadBankAccounts, loadLoans, loadBonds, loadMutualFunds, loadCreditCards, loadInsurance]);

    const resetNetWorth = useCallback(() => {
        setGoldItems([]);
        setBondItems([]);
        setStockItems([]);
        setPropertyItems([]);
        setMutualFundItems([]);
        setBankAccounts([]);
        setWallets([]);
        setLoanItems([]);
        setCreditCardItems([]);
        setInsuranceItems([]);
        setDepreciatingAssetItems([]);
        setCurrentUserId(null);
    }, []);

    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

    // Effect to react to user changes - OPTIMIZED: Load only once
    useEffect(() => {
        if (isAuthenticated && user?.id) {
            if (user.id !== currentUserId) {
                // User changed - reset and reload
                setCurrentUserId(user.id);
                setHasLoadedOnce(false);
            }

            // Load data only if we haven't loaded for this user yet
            if (!hasLoadedOnce) {
                loadAllData();
                setHasLoadedOnce(true);
            }
        } else if (!isAuthenticated && currentUserId !== null) {
            resetNetWorth();
            setHasLoadedOnce(false);
        }
    }, [isAuthenticated, user?.id, currentUserId, hasLoadedOnce, loadAllData, resetNetWorth]);

    const updateGold = async () => loadGold();
    const updateBonds = async () => loadBonds();
    const updateStocks = async () => loadStocks();
    const updateProperty = async () => loadProperties();
    const updateMutualFunds = async () => loadMutualFunds();
    const updateDepreciatingAssets = async () => loadDepreciatingAssets();
    const updateCash = async () => loadBankAccounts();
    const updateLoans = async () => loadLoans();
    const updateCreditCards = async () => loadCreditCards();
    const refreshNetWorth = async () => loadAllData();

    return (
        <NetWorthContext.Provider value={{
            data,
            updateGold,
            updateBonds,
            updateStocks,
            updateProperty,
            updateMutualFunds,
            updateDepreciatingAssets,
            updateCash,
            updateLoans,
            updateCreditCards,
            refreshNetWorth,
            resetNetWorth,
            isLoading
        }}>
            {children}
        </NetWorthContext.Provider>
    );
}

export function useNetWorth() {
    const context = useContext(NetWorthContext);
    if (context === undefined) {
        throw new Error('useNetWorth must be used within a NetWorthProvider');
    }
    return context;
}
