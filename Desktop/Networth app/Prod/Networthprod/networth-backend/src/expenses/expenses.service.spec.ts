import { Test, TestingModule } from '@nestjs/testing';
import { ExpensesService } from './expenses.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('ExpensesService', () => {
    let service: ExpensesService;
    let prisma: PrismaService;

    const mockPrisma = {
        expense: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        bankAccount: {
            update: jest.fn(),
        },
        creditCard: {
            update: jest.fn(),
        },
        $transaction: jest.fn((cb) => cb(mockPrisma)),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ExpensesService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();

        service = module.get<ExpensesService>(ExpensesService);
        prisma = module.get<PrismaService>(PrismaService);
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create an expense and decrement bank account balance for debit_card', async () => {
            const dto = {
                date: '2023-01-01',
                amount: 100,
                category: 'Food',
                paymentMethod: 'debit_card',
                accountId: 'bank-1',
                periodTag: 'monthly',
            };

            mockPrisma.expense.create.mockResolvedValue({ id: 'exp-1', ...dto });

            await service.create('user-1', dto);

            expect(mockPrisma.expense.create).toHaveBeenCalled();
            expect(mockPrisma.bankAccount.update).toHaveBeenCalledWith({
                where: { id: 'bank-1' },
                data: { balance: { decrement: 100 } },
            });
        });

        it('should create an expense and increment credit card usedAmount for credit_card', async () => {
            const dto = {
                date: '2023-01-01',
                amount: 100,
                category: 'Food',
                paymentMethod: 'credit_card',
                creditCardId: 'cc-1',
                periodTag: 'monthly',
            };

            mockPrisma.expense.create.mockResolvedValue({ id: 'exp-1', ...dto });

            await service.create('user-1', dto);

            expect(mockPrisma.expense.create).toHaveBeenCalled();
            expect(mockPrisma.creditCard.update).toHaveBeenCalledWith({
                where: { id: 'cc-1' },
                data: { usedAmount: { increment: 100 } },
            });
        });

        it('should handle bank transfer: decrement source and increment target bank', async () => {
            const dto = {
                date: '2023-01-01',
                amount: 500,
                category: 'Transfer',
                paymentMethod: 'bank',
                accountId: 'bank-from',
                toBankAccountId: 'bank-to',
                periodTag: 'monthly',
            };

            mockPrisma.expense.create.mockResolvedValue({ id: 'exp-1', ...dto });

            await service.create('user-1', dto);

            // Decrement from
            expect(mockPrisma.bankAccount.update).toHaveBeenCalledWith({
                where: { id: 'bank-from' },
                data: { balance: { decrement: 500 } },
            });
            // Increment to
            expect(mockPrisma.bankAccount.update).toHaveBeenCalledWith({
                where: { id: 'bank-to' },
                data: { balance: { increment: 500 } },
            });
        });

        it('should handle credit card payment via bank transfer', async () => {
            const dto = {
                date: '2023-01-01',
                amount: 500,
                category: 'CC Payment',
                paymentMethod: 'bank',
                accountId: 'bank-from',
                creditCardId: 'cc-to',
                periodTag: 'monthly',
            };

            mockPrisma.expense.create.mockResolvedValue({ id: 'exp-1', ...dto });

            await service.create('user-1', dto);

            // Decrement bank
            expect(mockPrisma.bankAccount.update).toHaveBeenCalledWith({
                where: { id: 'bank-from' },
                data: { balance: { decrement: 500 } },
            });
            // Decrement CC usedAmount
            expect(mockPrisma.creditCard.update).toHaveBeenCalledWith({
                where: { id: 'cc-to' },
                data: { usedAmount: { decrement: 500 } },
            });
        });
    });

    describe('delete', () => {
        it('should reverse balance adjustments when deleting', async () => {
            const expense = {
                id: 'exp-1',
                amount: 100,
                paymentMethod: 'debit_card',
                accountId: 'bank-1',
            };
            mockPrisma.expense.findFirst.mockResolvedValue(expense);

            await service.delete('exp-1', 'user-1');

            expect(mockPrisma.bankAccount.update).toHaveBeenCalledWith({
                where: { id: 'bank-1' },
                data: { balance: { increment: 100 } },
            });
            expect(mockPrisma.expense.delete).toHaveBeenCalledWith({ where: { id: 'exp-1' } });
        });
    });
});
