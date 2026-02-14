import {
    IsString,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsDateString,
    IsDecimal,
} from 'class-validator';

export class CreateExpenseDto {
    @IsDateString()
    @IsNotEmpty()
    date: string;

    @IsNumber()
    @IsNotEmpty()
    amount: number;

    @IsString()
    @IsOptional()
    currency?: string;

    @IsString()
    @IsNotEmpty()
    category: string;

    @IsString()
    @IsOptional()
    merchant?: string;

    @IsString()
    @IsOptional()
    paymentMethod?: string;

    @IsString()
    @IsOptional()
    accountId?: string;

    @IsString()
    @IsOptional()
    creditCardId?: string;

    @IsString()
    @IsOptional()
    toBankAccountId?: string;

    @IsString()
    @IsOptional()
    recurrence?: string; // one-time, daily, weekly, monthly, custom

    @IsString()
    @IsNotEmpty()
    periodTag: string; // daily, monthly, yearly

    // Recurrence Details
    @IsOptional()
    isRecurring?: boolean;

    @IsString()
    @IsOptional()
    recurrenceType?: string; // DAILY, WEEKLY, MONTHLY, CUSTOM

    @IsNumber()
    @IsOptional()
    recurrenceInterval?: number;

    @IsString()
    @IsOptional()
    recurrenceUnit?: string; // DAYS, WEEKS, MONTHS, YEARS

    @IsDateString()
    @IsOptional()
    nextRunDate?: string;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsString()
    @IsOptional()
    source?: string;

    @IsString()
    @IsOptional()
    receiptUrl?: string;

    @IsNumber()
    @IsOptional()
    confidence?: number;
}

export class UpdateExpenseDto {
    @IsDateString()
    @IsOptional()
    date?: string;

    @IsNumber()
    @IsOptional()
    amount?: number;

    @IsString()
    @IsOptional()
    currency?: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsString()
    @IsOptional()
    merchant?: string;

    @IsString()
    @IsOptional()
    paymentMethod?: string;

    @IsString()
    @IsOptional()
    accountId?: string;

    @IsString()
    @IsOptional()
    creditCardId?: string;

    @IsString()
    @IsOptional()
    toBankAccountId?: string;

    @IsString()
    @IsOptional()
    recurrence?: string;

    @IsString()
    @IsOptional()
    periodTag?: string;

    // Recurrence Details
    @IsOptional()
    isRecurring?: boolean;

    @IsString()
    @IsOptional()
    recurrenceType?: string;

    @IsNumber()
    @IsOptional()
    recurrenceInterval?: number;

    @IsString()
    @IsOptional()
    recurrenceUnit?: string;

    @IsDateString()
    @IsOptional()
    nextRunDate?: string;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsString()
    @IsOptional()
    source?: string;

    @IsString()
    @IsOptional()
    receiptUrl?: string;

    @IsNumber()
    @IsOptional()
    confidence?: number;
}

export class ReportFilterDto {
    // Date range - either use preset OR custom dates
    @IsString()
    @IsOptional()
    datePreset?: 'today' | 'this_week' | 'this_month' | 'last_3_months' | 'last_6_months' | 'last_12_months';

    @IsDateString()
    @IsOptional()
    dateFrom?: string;

    @IsDateString()
    @IsOptional()
    dateTo?: string;

    // Multi-select filters
    @IsOptional()
    categories?: string[];  // Array of category names

    @IsOptional()
    paymentMethods?: string[];  // Array of payment methods: cash, debit_card, credit_card, bank

    @IsOptional()
    accountIds?: string[];  // Bank account IDs (for cash/debit)

    @IsOptional()
    creditCardIds?: string[];  // Credit card IDs
}
