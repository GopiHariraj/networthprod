import { IsString, IsEmail, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class UpdateNomineeDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    mobile?: string;

    @IsOptional()
    @IsString()
    relationship?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsNumber()
    inactivityThresholdDays?: number;

    @IsOptional()
    @IsString()
    messageToNominee?: string;

    @IsOptional()
    @IsBoolean()
    isEnabled?: boolean;
}

export class RequestNomineeAccessDto {
    @IsString()
    token: string;
}

export class VerifyNomineeAccessDto {
    @IsString()
    token: string;

    @IsString()
    otp: string;
}
