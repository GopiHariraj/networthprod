import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class UpdateTransactionDto {
    @IsOptional()
    @IsNumber()
    amount?: number;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    merchant?: string;

    @IsOptional()
    @IsString()
    date?: string; // ISO String

    @IsOptional()
    @IsString()
    type?: 'INCOME' | 'EXPENSE';

    @IsOptional()
    isRecurring?: boolean;

    @IsOptional()
    @IsString()
    recurrenceType?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

    @IsOptional()
    @IsNumber()
    recurrenceInterval?: number;

    @IsOptional()
    @IsString()
    recurrenceUnit?: 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';
}
