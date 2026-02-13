import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { TransactionsService } from './transactions.service';

@Injectable()
export class TransactionsScheduler {
    private readonly logger = new Logger(TransactionsScheduler.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly transactionsService: TransactionsService,
    ) { }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleRecurringTransactions() {
        this.logger.log('Checking for Recurring Transactions...');
        const now = new Date();

        // Find recurring transactions that are due
        const recurringTransactions = await this.prisma.transaction.findMany({
            where: {
                isRecurring: true,
                nextRunDate: {
                    lte: now
                }
            }
        });

        this.logger.log(`Found ${recurringTransactions.length} recurring transactions due.`);

        for (const parentTx of recurringTransactions) {
            try {
                this.logger.log(`Processing Recurring Transaction: ${parentTx.description} (${parentTx.amount})`);

                // Create the new transaction instance
                // We strip the recurrence fields from the new instance to avoid infinite recursion of schedulers picking up the child
                // The child is just a "one-off" instance created by the parent.
                await this.transactionsService.create(parentTx.userId, {
                    amount: Number(parentTx.amount),
                    description: parentTx.description || 'Recurring Transaction',
                    merchant: parentTx.merchant || undefined,
                    categoryId: parentTx.categoryId || undefined,
                    accountId: parentTx.accountId || undefined,
                    source: 'AUTO_RECURRING',
                    date: now.toISOString(),
                    type: parentTx.type as 'INCOME' | 'EXPENSE',
                    // Implicitly isRecurring: false for the child
                });

                // Calculate next run date
                const nextDate = this.transactionsService.calculateNextRunDate(
                    parentTx.nextRunDate || now, // fast-forward from the scheduled date, or now? usually from scheduled date to keep cadence
                    parentTx.recurrenceType || undefined,
                    parentTx.recurrenceInterval || 1,
                    parentTx.recurrenceUnit || undefined
                );

                // Update parent transaction
                await this.prisma.transaction.update({
                    where: { id: parentTx.id },
                    data: {
                        lastRunDate: now,
                        nextRunDate: nextDate
                    }
                });

                this.logger.log(`Successfully processed recurring transaction ${parentTx.id}. Next run: ${nextDate}`);

            } catch (error) {
                this.logger.error(`Failed to process recurring transaction ${parentTx.id}`, error);
            }
        }
    }
}
