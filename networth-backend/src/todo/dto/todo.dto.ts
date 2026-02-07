import { IsString, IsOptional, IsEnum, IsBoolean, IsDateString } from 'class-validator';

export enum TodoType {
    TASK = 'TASK',
    REMINDER = 'REMINDER',
    NOTE = 'NOTE',
}

export class CreateTodoDto {
    @IsEnum(TodoType)
    type: TodoType;

    @IsString()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    isCompleted?: boolean;

    @IsDateString()
    @IsOptional()
    dueDate?: string;

    @IsDateString()
    @IsOptional()
    reminderTime?: string;

    @IsString()
    @IsOptional()
    linkedEntityType?: string;

    @IsString()
    @IsOptional()
    linkedEntityId?: string;
}

export class UpdateTodoDto {
    @IsEnum(TodoType)
    @IsOptional()
    type?: TodoType;

    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    isCompleted?: boolean;

    @IsDateString()
    @IsOptional()
    dueDate?: string;

    @IsDateString()
    @IsOptional()
    reminderTime?: string;

    @IsString()
    @IsOptional()
    linkedEntityType?: string;

    @IsString()
    @IsOptional()
    linkedEntityId?: string;
}
