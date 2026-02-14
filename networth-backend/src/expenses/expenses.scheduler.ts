import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { ExpensesService } from './expenses.service';

@Injectable()
export class ExpensesScheduler {
    private readonly logger = new Logger(ExpensesScheduler.name);

    constructor(
        private prisma: PrismaService,
        private expensesService: ExpensesService,
    ) { }

    // Run every day at midnight
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleRecurringExpenses() {
        this.logger.log('🔄 Checking for recurring expenses...');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find all active recurring expenses due today or earlier
        const recurringExpenses = await this.prisma.expense.findMany({
            where: {
                isRecurring: true,
                nextRunDate: {
                    lte: today,
                },
            },
        });

        this.logger.log(`Found ${recurringExpenses.length} recurring expenses due.`);

        for (const expense of recurringExpenses) {
            try {
                this.logger.log(`Processing recurring expense: ${expense.category} - ${expense.amount}`);

                // 1. Create the new expense instance
                await this.expensesService.create(expense.userId, {
                    date: new Date().toISOString(),
                    amount: Number(expense.amount),
                    currency: expense.currency,
                    category: expense.category,
                    merchant: expense.merchant || undefined,
                    paymentMethod: expense.paymentMethod || undefined,
                    accountId: expense.accountId || undefined,
                    creditCardId: expense.creditCardId || undefined,
                    toBankAccountId: expense.toBankAccountId || undefined,
                    recurrence: 'one-time', // The generated instance is not recurring itself
                    periodTag: expense.periodTag,
                    notes: `Auto-generated from recurring expense`,
                    source: 'system_recurrence',
                    // Don't copy recurrence rule to the child
                    isRecurring: false,
                });

                // 2. Calculate next run date
                const nextDate = this.calculateNextRunDate(
                    expense.nextRunDate ? new Date(expense.nextRunDate) : new Date(expense.date),
                    expense.recurrenceType || 'MONTHLY',
                    expense.recurrenceInterval || 1,
                    expense.recurrenceUnit || 'MONTHS',
                );

                // 3. Update the parent expense with next run date
                await this.prisma.expense.update({
                    where: { id: expense.id },
                    data: {
                        lastRunDate: new Date(),
                        nextRunDate: nextDate,
                    },
                });

                this.logger.log(`✅ Successfully generated recurrence for ${expense.id}. Next run: ${nextDate}`);
            } catch (error) {
                this.logger.error(`❌ Failed to process recurring expense ${expense.id}:`, error);
            }
        }
    }

    private calculateNextRunDate(currentDate: Date, type: string, interval: number = 1, unit: string = 'MONTHS'): Date {
        const nextDate = new Date(currentDate);

        if (type === 'DAILY') {
            nextDate.setDate(nextDate.getDate() + 1);
        } else if (type === 'WEEKLY') {
            nextDate.setDate(nextDate.getDate() + 7);
        } else if (type === 'MONTHLY') {
            nextDate.setMonth(nextDate.getMonth() + 1);
        } else if (type === 'CUSTOM') {
            switch (unit) {
                case 'DAYS':
                    nextDate.setDate(nextDate.getDate() + interval);
                    break;
                case 'WEEKS':
                    nextDate.setDate(nextDate.getDate() + (interval * 7));
                    break;
                case 'MONTHS':
                    nextDate.setMonth(nextDate.getMonth() + interval);
                    break;
                case 'YEARS':
                    nextDate.setFullYear(nextDate.getFullYear() + interval);
                    break;
            }
        }

        return nextDate;
    }
}
