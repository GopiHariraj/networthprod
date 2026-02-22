import { Module } from '@nestjs/common';
import { NomineeService } from './nominee.service';
import { NomineeController } from './nominee.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { JwtModule } from '@nestjs/jwt';
import { NomineeScheduler } from './nominee.scheduler';

@Module({
    imports: [
        PrismaModule,
        MailModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'fallback_secret',
            signOptions: { expiresIn: '15m' },
        }),
    ],
    controllers: [NomineeController],
    providers: [NomineeService, NomineeScheduler],
    exports: [NomineeService],
})
export class NomineeModule { }
