import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { NomineeService } from './nominee.service';

@Injectable()
export class NomineeScheduler {
    private readonly logger = new Logger(NomineeScheduler.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly nomineeService: NomineeService,
    ) { }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleInactivityChecks() {
        this.logger.log('Checking for Inactive Users triggers...');

        // Find all active nominees thresholds
        const activeNominees = await this.prisma.nominee.findMany({
            where: {
                isEnabled: true,
            },
            include: { user: true }
        });

        this.logger.log(`Found ${activeNominees.length} active nominee configurations.`);

        for (const nominee of activeNominees) {
            try {
                await this.nomineeService.checkInactivityForUser(nominee.userId);
            } catch (error) {
                this.logger.error(`Failed to process inactivity check for user ${nominee.userId}`, error);
            }
        }
    }
}
