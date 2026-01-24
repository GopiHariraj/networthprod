import { IsString, IsOptional, IsDateString, IsNumber, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInsuranceBenefitDto {
    @IsString()
    name: string;

    @IsNumber()
    @IsOptional()
    limitAmount?: number;

    @IsNumber()
    @IsOptional()
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

    @IsDateString()
    startDate: string;

    @IsDateString()
    expiryDate: string;

    @IsNumber()
    premiumAmount: number;

    @IsString()
    paymentFrequency: string;

    @IsNumber()
    sumInsured: number;

    @IsNumber()
    @IsOptional()
    deductible?: number;

    @IsNumber()
    @IsOptional()
    coPay?: number;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsNumber()
    @IsOptional()
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
