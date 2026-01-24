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
}

export class ParseSmsDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}
