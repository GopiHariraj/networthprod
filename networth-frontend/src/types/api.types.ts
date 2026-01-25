// User types
export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName?: string;
    currency: string;
    createdAt: string;
    updatedAt: string;
}

// Asset types
export interface BankAccount {
    id: string;
    userId: string;
    accountName: string;
    bankName: string;
    accountType: string;
    balance: number;
    currency: string;
    isActive: boolean;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface GoldAsset {
    id: string;
    userId: string;
    name: string;
    weightGrams: number;
    purchasePrice: number;
    purchaseDate?: string;
    currentValue: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface StockAsset {
    id: string;
    userId: string;
    symbol: string;
    name: string;
    exchange: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    broker?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Property {
    id: string;
    userId: string;
    name: string;
    propertyType: string;
    location: string;
    purchasePrice: number;
    purchaseDate?: string;
    currentValue: number;
    linkedLoanId?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

// Liability types
export interface Loan {
    id: string;
    userId: string;
    loanType: string;
    lenderName: string;
    principal: number;
    interestRate: number;
    emiAmount: number;
    outstanding: number;
    startDate: string;
    endDate: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

// Transaction types
export interface Transaction {
    id: string;
    userId: string;
    accountId?: string;
    type: 'Income' | 'Expense' | 'Transfer';
    amount: number;
    categoryId?: string;
    description?: string;
    date: string;
    notes?: string;
    attachmentUrl?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Category {
    id: string;
    userId: string;
    name: string;
    type: 'Income' | 'Expense';
    icon?: string;
    color?: string;
    isDefault: boolean;
    createdAt: string;
}

// Net Worth types
export interface NetWorthSnapshot {
    id: string;
    userId: string;
    date: string;
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    breakdown?: Record<string, number>;
    createdAt: string;
}

// Goal types
export interface Goal {
    id: string;
    userId: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    priority: 'Low' | 'Medium' | 'High';
    linkedAccountId?: string;
    notes?: string;
    isCompleted: boolean;
    createdAt: string;
    updatedAt: string;
}

// API Response types
export interface ApiResponse<T> {
    data: T;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
}

export interface ErrorResponse {
    message: string;
    statusCode: number;
    error?: string;
}
