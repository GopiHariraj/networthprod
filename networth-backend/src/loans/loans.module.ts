import { Module } from '@nestjs/common';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { LoansScheduler } from './loans.scheduler';
import { ExpensesModule } from '../expenses/expenses.module';

@Module({
  imports: [ExpensesModule],
  controllers: [LoansController],
  providers: [LoansService, PrismaService, LoansScheduler],
  exports: [LoansService],
})
export class LoansModule { }
