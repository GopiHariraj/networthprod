import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateLoanDto, UpdateLoanDto } from './dto/loan.dto';

@Injectable()
export class LoansService {
  constructor(private prisma: PrismaService) { }

  async findAll(userId: string) {
    return this.prisma.loan.findMany({
      where: { userId },
      include: { linkedBankAccount: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.loan.findFirst({
      where: { id, userId },
      include: { linkedBankAccount: true },
    });
  }

  async create(userId: string, dto: CreateLoanDto) {
    return this.prisma.loan.create({
      data: {
        userId,
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateLoanDto) {
    const loan = await this.findOne(id, userId);
    if (!loan) {
      throw new Error('Loan not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { loanType, ...updateData } = dto;

    return this.prisma.loan.update({
      where: { id },
      data: {
        ...updateData,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async delete(id: string, userId: string) {
    const loan = await this.findOne(id, userId);
    if (!loan) {
      throw new Error('Loan not found');
    }

    await this.prisma.loan.delete({ where: { id } });
    return { success: true, message: 'Loan deleted' };
  }

  // Daily Cron Job to check for auto-debits
  // Runs every day at 1 AM
  @Cron('0 1 * * *')
  async checkScheduledDebits() {
    console.log('🔄 Checking scheduled loan debits...');
    const today = new Date();
    const dayOfMonth = today.getDate();

    // Find all loans with autoDebit enabled and due date matching today
    const loansDue = await this.prisma.loan.findMany({
      where: {
        autoDebit: true,
        emiDate: dayOfMonth,
        linkedBankAccountId: { not: null },
      },
      include: { linkedBankAccount: true },
    });

    console.log(`Found ${loansDue.length} loans due for auto-debit today.`);

    for (const loan of loansDue) {
      try {
        if (!loan.linkedBankAccountId || !loan.linkedBankAccount) continue;

        // check if enough balance
        if (loan.linkedBankAccount.balance.lessThan(loan.emiAmount)) {
          console.warn(`⚠️ Insufficient funds for loan ${loan.id} in account ${loan.linkedBankAccount.accountName}`);
          continue;
        }

        // 1. Create Transaction
        await this.prisma.transaction.create({
          data: {
            userId: loan.userId,
            accountId: loan.linkedBankAccountId,
            type: 'Expense',
            amount: loan.emiAmount,
            description: `Auto-Debit: EMI for ${loan.lenderName}`,
            date: new Date(),
            source: 'SYSTEM_CRON',
            notes: `Auto-deducted for loan: ${loan.lenderName}`,
          },
        });

        // 2. Reduce Bank Balance
        await this.prisma.bankAccount.update({
          where: { id: loan.linkedBankAccountId },
          data: {
            balance: { decrement: loan.emiAmount },
          },
        });

        // 3. Update Loan Outstanding (Optional - if EMI reduces principal directly, 
        // usually EMI = Principal + Interest, but for simple tracking we can reduce outstanding roughly or keep logic separate.
        // For now, let's assume we just deduct. Advanced logic would split P & I.)
        // await this.prisma.loan.update({
        //   where: { id: loan.id },
        //   data: { outstanding: { decrement: loan.emiAmount } } // Simplified
        // });

        console.log(`✅ Successfully auto-debited EMI for loan ${loan.lenderName}`);
      } catch (error) {
        console.error(`❌ Failed to process auto-debit for loan ${loan.id}:`, error);
      }
    }
  }
}
