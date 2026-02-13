import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateTransactionDto {
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsString()
  source: string; // 'MANUAL' | 'SMS'

  @IsOptional()
  @IsString()
  date?: string; // ISO String

  @IsOptional()
  @IsString()
  merchant?: string;

  @IsOptional()
  @IsString()
  type?: 'INCOME' | 'EXPENSE';

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  creditCardId?: string;

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

export class ParseSmsDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}
