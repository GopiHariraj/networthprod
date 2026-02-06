import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { ExpensesService } from './expenses.service';

@Injectable()
export class ExpensesScheduler {
    private readonly logger = new Logger(ExpensesScheduler.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly expensesService: ExpensesService,
    ) { }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleRecurringExpenses() {
        this.logger.log('Checking for Recurring Expenses...');
        const today = new Date();
        const dayOfMonth = today.getDate();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        // Find all monthly recurring expenses where the original date's day matches today
        // We have to filter in JS because Prisma doesn't support DATE_PART equivalent easily in all DBs
        // But for optimization, we can just fetch all 'monthly' recurring expenses and filter
        // Or if we had a separate 'dayOfMonth' field, it would be efficient. 
        // For now, fetching all active monthly subscriptions is fine (assuming volume is manageable)

        const recurringExpenses = await this.prisma.expense.findMany({
            where: {
                recurrence: 'monthly',
                // Optional: add isActive flag if we support cancelling subscriptions without deleting
            }
        });

        for (const expense of recurringExpenses) {
            try {
                const expenseDate = new Date(expense.date);
                if (expenseDate.getDate() !== dayOfMonth) {
                    continue;
                }

                // Check if already paid this month
                const alreadyPaid = await this.prisma.expense.findFirst({
                    where: {
                        userId: expense.userId,
                        category: expense.category,
                        merchant: expense.merchant,
                        amount: expense.amount,
                        date: {
                            gte: startOfMonth,
                            lte: endOfMonth,
                        },
                        source: 'auto-recurring' // Identifier for auto-generated
                    }
                });

                if (alreadyPaid) {
                    this.logger.debug(`Subscription '${expense.merchant}' already processed for this month.`);
                    continue;
                }

                this.logger.log(`Processing Recurring Expense: ${expense.merchant} (${expense.amount})`);

                // Create new expense
                await this.expensesService.create(expense.userId, {
                    amount: Number(expense.amount),
                    currency: expense.currency,
                    date: today.toISOString(),
                    category: expense.category,
                    merchant: expense.merchant || undefined,
                    paymentMethod: expense.paymentMethod || 'cash',
                    accountId: expense.accountId || undefined,
                    creditCardId: expense.creditCardId || undefined,
                    toBankAccountId: expense.toBankAccountId || undefined,
                    // Usually the instance is 'one-time' but part of a recurrence. 
                    // Let's keep it 'monthly' so it shows up as such, but we need to distinguish PARENT vs CHILD to avoid double charging next month.
                    // BETTER APPROACH: The parent is the "template". The children are just records.
                    // But here we are modifying the "Expense" table which mixes both.
                    // To avoid "exponential growth" (scheduler picking up the new child as a parent next month),
                    // we should ensure we only process the "original" or "recurrence=monthly" ones.
                    // If we set the child as 'one-time' (or 'recurrence_instance'), it won't be picked up by the query above.
                    // So, let's set the child's recurrence to 'one-time' or a specific 'recurring_instance' tag.
                    // However, user might want to see it as "Subscription".
                    // Let's check the schema.

                    // DECISION: Set created instance as 'one-time' but tag it via source or notes.
                    // The query `recurrence: 'monthly'` will only pick up the master entry.
                    // Wait, if the user creates a subscription, that IS the master entry.
                    // We don't want to create duplicates of the master entry if the user edits it?
                    // Let's stick to: Master has 'recurrence: monthly'. Child has 'recurrence: one-time' (or just 'monthly' but we filter by creation date?)
                    // Safest: Child has recurrence: 'one-time' and notes "Recurring Payment: ...".
                    // OR: We update the 'source' to 'auto-recurring'.
                    // AND our query above only fetches where source != 'auto-recurring'? 
                    // Actually, if we set child recurrence to 'one-time', it won't be fetched by `where: { recurrence: 'monthly' }`.
                    // This creates a clean separation: Master (Active Sub) vs History (Generated Logs).

                    recurrence: 'one-time',
                    periodTag: 'monthly',
                    notes: `Subscription Renewal: ${expense.merchant}`,
                    source: 'auto-recurring',
                    confidence: 1
                });

                this.logger.log(`Successfully processed subscription for ${expense.merchant}`);

            } catch (error) {
                this.logger.error(`Failed to process recurring expense ${expense.id}`, error);
            }
        }
    }
}
