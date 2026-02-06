import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { ExpensesScheduler } from './expenses.scheduler';
import { ExpenseCategoriesController } from './expense-categories.controller';
import { ExpenseCategoriesService } from './expense-categories.service';
import { GeminiModule } from '../common/openai/gemini.module';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [GeminiModule, PrismaModule],
  controllers: [ExpensesController, ExpenseCategoriesController],
  providers: [ExpensesService, ExpenseCategoriesService, ExpensesScheduler],
  exports: [ExpensesService, ExpenseCategoriesService],
})
export class ExpensesModule { }
