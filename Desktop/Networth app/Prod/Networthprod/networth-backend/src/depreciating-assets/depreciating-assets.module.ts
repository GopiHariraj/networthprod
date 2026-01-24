import { Module } from '@nestjs/common';
import { DepreciatingAssetsService } from './depreciating-assets.service';
import { DepreciatingAssetsController } from './depreciating-assets.controller';
import { PrismaService } from '../common/prisma/prisma.service';

@Module({
    controllers: [DepreciatingAssetsController],
    providers: [DepreciatingAssetsService, PrismaService],
    exports: [DepreciatingAssetsService],
})
export class DepreciatingAssetsModule { }
