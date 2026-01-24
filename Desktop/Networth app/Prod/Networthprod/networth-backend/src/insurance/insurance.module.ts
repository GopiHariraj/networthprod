import { Module } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { InsuranceController } from './insurance.controller';
import { PrismaService } from '../common/prisma/prisma.service';

@Module({
    controllers: [InsuranceController],
    providers: [InsuranceService, PrismaService],
    exports: [InsuranceService],
})
export class InsuranceModule { }
