import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateExpenseDto, UpdateExpenseDto, ReportFilterDto } from './dto/expense.dto';

@Injectable()
export class ExpensesService {
    constructor(private prisma: PrismaService) { }

    async findAll(userId: string) {
        return this.prisma.expense.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
        });
    }

    async findOne(id: string, userId: string) {
        return this.prisma.expense.findFirst({
            where: { id, userId },
        });
    }

    async create(userId: string, dto: CreateExpenseDto) {
        // Ensure proper date conversion
        const dateObj = dto.date.includes('T')
            ? new Date(dto.date)
            : new Date(dto.date + 'T00:00:00.000Z');

        try {
            return await this.prisma.$transaction(async (tx) => {
                // 1. Create the expense
                const expense = await tx.expense.create({
                    data: {
                        userId,
                        date: dateObj,
                        amount: dto.amount,
                        currency: dto.currency || 'AED',
                        category: dto.category,
                        merchant: dto.merchant,
                        paymentMethod: dto.paymentMethod,
                        accountId: dto.accountId || null,
                        creditCardId: dto.creditCardId || null,
                        toBankAccountId: dto.toBankAccountId || null,
                        recurrence: dto.recurrence || 'one-time',
                        periodTag: dto.periodTag || 'monthly',
                        notes: dto.notes,
                        source: dto.source || 'manual',
                        receiptUrl: dto.receiptUrl,
                        confidence: dto.confidence,
                    } as any,
                });

                // 2. Adjust balances based on payment method
                const amount = Number(dto.amount);

                if (dto.paymentMethod === 'credit_card' && dto.creditCardId) {
                    await tx.creditCard.update({
                        where: { id: dto.creditCardId },
                        data: { usedAmount: { increment: amount } },
                    });
                } else if ((dto.paymentMethod === 'debit_card' || dto.paymentMethod === 'cash') && dto.accountId) {
                    await tx.bankAccount.update({
                        where: { id: dto.accountId },
                        data: { balance: { decrement: amount } },
                    });
                } else if (dto.paymentMethod === 'bank' && dto.accountId) {
                    if (dto.toBankAccountId) {
                        await tx.bankAccount.update({
                            where: { id: dto.toBankAccountId },
                            data: { balance: { increment: amount } },
                        });
                    } else if (dto.creditCardId) {
                        await tx.creditCard.update({
                            where: { id: dto.creditCardId },
                            data: { usedAmount: { decrement: amount } },
                        });
                    }

                    await tx.bankAccount.update({
                        where: { id: dto.accountId },
                        data: { balance: { decrement: amount } },
                    });
                }

                return expense;
            });
        } catch (error) {
            console.error('❌ CRITICAL: Failed to create expense:', error);
            throw error;
        }
    }

    async update(id: string, userId: string, dto: UpdateExpenseDto) {
        const oldExpense = await this.findOne(id, userId);
        if (!oldExpense) {
            throw new NotFoundException('Expense not found');
        }

        return this.prisma.$transaction(async (tx) => {
            // 1. Reverse old balance adjustments
            const oldAmount = Number(oldExpense.amount);
            if (oldExpense.paymentMethod === 'credit_card' && oldExpense.creditCardId) {
                await tx.creditCard.update({
                    where: { id: oldExpense.creditCardId },
                    data: { usedAmount: { decrement: oldAmount } },
                });
            } else if ((oldExpense.paymentMethod === 'debit_card' || oldExpense.paymentMethod === 'cash') && oldExpense.accountId) {
                await tx.bankAccount.update({
                    where: { id: oldExpense.accountId },
                    data: { balance: { increment: oldAmount } },
                });
            } else if (oldExpense.paymentMethod === 'bank' && oldExpense.accountId) {
                if ((oldExpense as any).toBankAccountId) {
                    await tx.bankAccount.update({
                        where: { id: (oldExpense as any).toBankAccountId },
                        data: { balance: { decrement: oldAmount } },
                    });
                } else if (oldExpense.creditCardId) {
                    await tx.creditCard.update({
                        where: { id: oldExpense.creditCardId },
                        data: { usedAmount: { increment: oldAmount } },
                    });
                }
                await tx.bankAccount.update({
                    where: { id: oldExpense.accountId },
                    data: { balance: { increment: oldAmount } },
                });
            }

            // 2. Update the expense record
            const updatedExpense = await tx.expense.update({
                where: { id },
                data: {
                    date: dto.date ? new Date(dto.date) : undefined,
                    amount: dto.amount,
                    currency: dto.currency,
                    category: dto.category,
                    merchant: dto.merchant,
                    paymentMethod: dto.paymentMethod,
                    accountId: dto.accountId,
                    creditCardId: dto.creditCardId === null ? null : dto.creditCardId,
                    toBankAccountId: dto.toBankAccountId === null ? null : dto.toBankAccountId,
                    recurrence: dto.recurrence,
                    periodTag: dto.periodTag,
                    notes: dto.notes,
                    source: dto.source,
                    receiptUrl: dto.receiptUrl,
                    confidence: dto.confidence,
                } as any,
            });

            // 3. Apply new balance adjustments
            const newAmount = Number(updatedExpense.amount);
            const newPaymentMethod = updatedExpense.paymentMethod;
            const newAccountId = updatedExpense.accountId;
            const newCreditCardId = updatedExpense.creditCardId;
            const newToBankId = (updatedExpense as any).toBankAccountId;

            if (newPaymentMethod === 'credit_card' && newCreditCardId) {
                await tx.creditCard.update({
                    where: { id: newCreditCardId },
                    data: { usedAmount: { increment: newAmount } },
                });
            } else if ((newPaymentMethod === 'debit_card' || newPaymentMethod === 'cash') && newAccountId) {
                await tx.bankAccount.update({
                    where: { id: newAccountId },
                    data: { balance: { decrement: newAmount } },
                });
            } else if (newPaymentMethod === 'bank' && newAccountId) {
                if (newToBankId) {
                    await tx.bankAccount.update({
                        where: { id: newToBankId },
                        data: { balance: { increment: newAmount } },
                    });
                } else if (newCreditCardId) {
                    await tx.creditCard.update({
                        where: { id: newCreditCardId },
                        data: { usedAmount: { decrement: newAmount } },
                    });
                }
                await tx.bankAccount.update({
                    where: { id: newAccountId },
                    data: { balance: { decrement: newAmount } },
                });
            }

            return updatedExpense;
        });
    }

    async delete(id: string, userId: string) {
        const expense = await this.findOne(id, userId);
        if (!expense) {
            throw new NotFoundException('Expense not found');
        }

        return this.prisma.$transaction(async (tx) => {
            const amount = Number(expense.amount);

            // Reverse balance adjustments
            if (expense.paymentMethod === 'credit_card' && expense.creditCardId) {
                await tx.creditCard.update({
                    where: { id: expense.creditCardId },
                    data: { usedAmount: { decrement: amount } },
                });
            } else if ((expense.paymentMethod === 'debit_card' || expense.paymentMethod === 'cash') && expense.accountId) {
                await tx.bankAccount.update({
                    where: { id: expense.accountId },
                    data: { balance: { increment: amount } },
                });
            } else if (expense.paymentMethod === 'bank' && expense.accountId) {
                // Bank Transfer Reversal
                // Reverse target if provided
                if ((expense as any).toBankAccountId) {
                    await tx.bankAccount.update({
                        where: { id: (expense as any).toBankAccountId },
                        data: { balance: { decrement: amount } },
                    });
                } else if (expense.creditCardId) {
                    await tx.creditCard.update({
                        where: { id: expense.creditCardId },
                        data: { usedAmount: { increment: amount } },
                    });
                }

                // Reverse source bank account
                await tx.bankAccount.update({
                    where: { id: expense.accountId },
                    data: { balance: { increment: amount } },
                });
            }

            // Delete the expense
            await tx.expense.delete({ where: { id } });

            return { success: true, message: 'Expense deleted and balances restored' };
        });
    }

    async getInsights(userId: string) {
        const expenses = await this.findAll(userId);
        const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

        // Group by category
        const constByCategory = expenses.reduce((acc: any, exp) => {
            if (!acc[exp.category]) acc[exp.category] = 0;
            acc[exp.category] += Number(exp.amount);
            return acc;
        }, {});

        // Group by payment method
        const costByPaymentMethod = expenses.reduce((acc: any, exp) => {
            const method = exp.paymentMethod || 'cash';
            if (!acc[method]) acc[method] = 0;
            acc[method] += Number(exp.amount);
            return acc;
        }, {});

        // Monthly trend (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        const monthlyTrend = expenses
            .filter(e => new Date(e.date) >= sixMonthsAgo)
            .reduce((acc: any, exp) => {
                const month = new Date(exp.date).toLocaleString('default', { month: 'short', year: '2-digit' });
                if (!acc[month]) acc[month] = 0;
                acc[month] += Number(exp.amount);
                return acc;
            }, {});

        return {
            total,
            count: expenses.length,
            constByCategory,
            costByPaymentMethod,
            monthlyTrend: Object.keys(monthlyTrend).map(month => ({ month, amount: monthlyTrend[month] })),
        };
    }

    async generateReport(userId: string, filterDto: ReportFilterDto) {
        // Calculate date range
        let dateFrom: Date;
        let dateTo: Date = new Date();
        dateTo.setHours(23, 59, 59, 999); // End of today

        if (filterDto.datePreset) {
            const now = new Date();
            switch (filterDto.datePreset) {
                case 'today':
                    dateFrom = new Date(now.setHours(0, 0, 0, 0));
                    break;
                case 'this_week':
                    dateFrom = new Date(now);
                    dateFrom.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
                    dateFrom.setHours(0, 0, 0, 0);
                    break;
                case 'this_month':
                    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'last_3_months':
                    dateFrom = new Date(now);
                    dateFrom.setMonth(now.getMonth() - 3);
                    break;
                case 'last_6_months':
                    dateFrom = new Date(now);
                    dateFrom.setMonth(now.getMonth() - 6);
                    break;
                case 'last_12_months':
                    dateFrom = new Date(now);
                    dateFrom.setMonth(now.getMonth() - 12);
                    break;
                default:
                    dateFrom = new Date(0); // Beginning of time
            }
        } else if (filterDto.dateFrom && filterDto.dateTo) {
            // Custom date range
            dateFrom = new Date(filterDto.dateFrom);
            dateTo = new Date(filterDto.dateTo);
            dateTo.setHours(23, 59, 59, 999);
        } else {
            // No date filter, get all
            dateFrom = new Date(0);
        }

        // Build where clause
        const whereClause: any = {
            userId,
            date: {
                gte: dateFrom,
                lte: dateTo,
            },
        };

        // Add category filter
        if (filterDto.categories && filterDto.categories.length > 0) {
            whereClause.category = { in: filterDto.categories };
        }

        // Add payment method filter
        if (filterDto.paymentMethods && filterDto.paymentMethods.length > 0) {
            whereClause.paymentMethod = { in: filterDto.paymentMethods };
        }

        // Add account/card filter
        if ((filterDto.accountIds && filterDto.accountIds.length > 0) ||
            (filterDto.creditCardIds && filterDto.creditCardIds.length > 0)) {
            const orConditions = [];

            if (filterDto.accountIds && filterDto.accountIds.length > 0) {
                orConditions.push({ accountId: { in: filterDto.accountIds } });
            }

            if (filterDto.creditCardIds && filterDto.creditCardIds.length > 0) {
                orConditions.push({ creditCardId: { in: filterDto.creditCardIds } });
            }

            whereClause.OR = orConditions;
        }

        // Fetch filtered expenses
        const expenses = await this.prisma.expense.findMany({
            where: whereClause,
            orderBy: { date: 'desc' },
        });

        // Calculate aggregations
        const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const count = expenses.length;

        // Group by category
        const byCategory = expenses.reduce((acc: any, exp) => {
            if (!acc[exp.category]) acc[exp.category] = 0;
            acc[exp.category] += Number(exp.amount);
            return acc;
        }, {});

        // Group by payment method
        const byPaymentMethod = expenses.reduce((acc: any, exp) => {
            const method = exp.paymentMethod || 'cash';
            if (!acc[method]) acc[method] = 0;
            acc[method] += Number(exp.amount);
            return acc;
        }, {});

        return {
            expenses: expenses.map(e => ({
                ...e,
                amount: parseFloat(e.amount.toString()),
            })),
            summary: {
                total,
                count,
                byCategory,
                byPaymentMethod,
                dateRange: {
                    from: dateFrom.toISOString(),
                    to: dateTo.toISOString(),
                },
            },
        };
    }
}
