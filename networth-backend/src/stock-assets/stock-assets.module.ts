import { Module } from '@nestjs/common';
import { StockAssetsController } from './stock-assets.controller';
import { StockAssetsService } from './stock-assets.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { OpenAiService } from '../common/openai/openai.service';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [StockAssetsController],
  providers: [StockAssetsService, PrismaService, OpenAiService, ConfigService],
  exports: [StockAssetsService],
})
export class StockAssetsModule { }
