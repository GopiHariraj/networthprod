import { Module, forwardRef } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
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
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule { }
