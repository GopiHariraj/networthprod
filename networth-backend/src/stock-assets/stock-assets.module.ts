import { Module } from '@nestjs/common';
import { StockAssetsController } from './stock-assets.controller';
import { StockAssetsService } from './stock-assets.service';
import { AlphaVantageService } from './alpha-vantage.service';
import { PrismaService } from '../common/prisma/prisma.service';

@Module({
  controllers: [StockAssetsController],
  providers: [StockAssetsService, AlphaVantageService, PrismaService],
  exports: [StockAssetsService],
})
export class StockAssetsModule { }
