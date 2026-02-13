import { Module, forwardRef } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsScheduler } from './transactions.scheduler';
import { TransactionsController } from './transactions.controller';
import { GeminiModule } from '../common/openai/gemini.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { GoldAssetsModule } from '../gold-assets/gold-assets.module';
import { StockAssetsModule } from '../stock-assets/stock-assets.module';

@Module({
  imports: [
    GeminiModule,
    PrismaModule,
    forwardRef(() => GoldAssetsModule),
    forwardRef(() => StockAssetsModule),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionsScheduler],
  exports: [TransactionsService],
})
export class TransactionsModule { }
