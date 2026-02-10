import { IsString, IsOptional, IsDateString, IsNumber, IsArray, IsBoolean, ValidateNested, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInsuranceBenefitDto {
    @IsString()
    name: string;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    limitAmount?: number;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    limitPercent?: number;

    @IsString()
    @IsOptional()
    conditions?: string;

    @IsString()
    @IsOptional()
    networkNotes?: string;
}

export class CreateInsurancePolicyDto {
    @IsString()
    policyType: string;

    @IsString()
    provider: string;

    @IsString()
    policyNumber: string;

    @IsString()
    @IsOptional()
    insuredMembers?: string;

    @IsDate()
    @Type(() => Date)
    startDate: Date;

    @IsDate()
    @Type(() => Date)
    expiryDate: Date;

    @IsNumber()
    @Type(() => Number)
    premiumAmount: number;

    @IsString()
    paymentFrequency: string;

    @IsNumber()
    @Type(() => Number)
    sumInsured: number;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    deductible?: number;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    coPay?: number;

    @IsString()
    @IsOptional()
    status?: string;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    cashValue?: number;

    @IsBoolean()
    @IsOptional()
    isAsset?: boolean;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateInsuranceBenefitDto)
    @IsOptional()
    benefits?: CreateInsuranceBenefitDto[];
}

export class UpdateInsurancePolicyDto extends CreateInsurancePolicyDto { }
