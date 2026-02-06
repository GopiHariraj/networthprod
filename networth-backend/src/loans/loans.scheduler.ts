import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { ExpensesService } from '../expenses/expenses.service';

@Injectable()
export class LoansScheduler {
    private readonly logger = new Logger(LoansScheduler.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly expensesService: ExpensesService,
    ) { }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleAutoDebit() {
        this.logger.log('Checking for Loans Auto-Debit...');
        const today = new Date();
        const dayOfMonth = today.getDate();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        // Find loans with auto-debit enabled and emiDate matching today
        const loans = await this.prisma.loan.findMany({
            where: {
                autoDebit: true,
                // We store emiDate as Int (1-31). Prisma filtering:
                emiDate: dayOfMonth,
                // Also check if loan is active (outstanding > 0, endDate > now)
                outstanding: { gt: 0 },
                // loanEndDate: { gte: today }, // Optional: strictly enforce end date
            },
            include: { linkedBankAccount: true },
        });

        for (const loan of loans) {
            try {
                if (!loan.linkedBankAccountId) {
                    this.logger.warn(`Loan ${loan.id} has auto-debit enabled but no linked account.`);
                    continue;
                }

                // Check if we already created an expense for this loan this month
                // We'll search for an expense linked to this loan via notes or reference
                // Ideally we should add 'loanId' to Expense, but for now using Notes/Category
                const alreadyPaid = await this.prisma.expense.findFirst({
                    where: {
                        userId: loan.userId,
                        amount: loan.emiAmount,
                        date: {
                            gte: startOfMonth,
                            lte: endOfMonth,
                        },
                        notes: { contains: `Auto-Debit for Loan: ${loan.lenderName}` },
                    },
                });

                if (alreadyPaid) {
                    this.logger.log(`Loan ${loan.id} already paid for this month.`);
                    continue;
                }

                this.logger.log(`Processing Auto-Debit for Loan ${loan.lenderName} (${loan.id})`);

                // Create Expense (which handles Bank Account deduction)
                // paymentMethod: 'bank' triggers bank account update in ExpensesService
                await this.expensesService.create(loan.userId, {
                    amount: Number(loan.emiAmount),
                    currency: 'AED', // or user currency
                    date: today.toISOString(),
                    category: 'Loan Repayment',
                    merchant: loan.lenderName,
                    paymentMethod: 'bank',
                    accountId: loan.linkedBankAccountId,
                    recurrence: 'monthly',
                    periodTag: 'monthly',
                    notes: `Auto-Debit for Loan: ${loan.lenderName} (${loan.loanType})`,
                    source: 'auto-debit',
                    confidence: 1
                });

                // Update Loan Outstanding Balance
                // Reducing by full EMI amount for simplicity 
                // (Realistically this should be Principal only, but we don't have split)
                await this.prisma.loan.update({
                    where: { id: loan.id },
                    data: {
                        outstanding: { decrement: Number(loan.emiAmount) }
                    }
                });

                this.logger.log(`Successfully processed Auto-Debit for loan ${loan.id}`);

            } catch (error) {
                this.logger.error(`Failed to process auto-debit for loan ${loan.id}`, error);
            }
        }
    }
}
