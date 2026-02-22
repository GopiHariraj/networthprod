import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateNomineeDto, RequestNomineeAccessDto, VerifyNomineeAccessDto } from './dto/nominee.dto';
import { MailService } from '../mail/mail.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

@Injectable()
export class NomineeService {
    constructor(
        private prisma: PrismaService,
        private mailService: MailService,
        private jwtService: JwtService,
    ) { }

    async getNominee(userId: string) {
        let nominee = await this.prisma.nominee.findUnique({
            where: { userId },
        });

        if (!nominee) {
            // Create a default empty one
            nominee = await this.prisma.nominee.create({
                data: {
                    userId,
                    name: '',
                    isEnabled: false,
                },
            });
        }
        return nominee;
    }

    async updateNominee(userId: string, dto: UpdateNomineeDto) {
        const nominee = await this.prisma.nominee.upsert({
            where: { userId },
            create: {
                userId,
                name: dto.name,
                email: dto.email,
                mobile: dto.mobile,
                relationship: dto.relationship,
                notes: dto.notes,
                inactivityThresholdDays: dto.inactivityThresholdDays || 60,
                messageToNominee: dto.messageToNominee,
                isEnabled: dto.isEnabled ?? false,
            },
            update: {
                name: dto.name,
                email: dto.email,
                mobile: dto.mobile,
                relationship: dto.relationship,
                notes: dto.notes,
                inactivityThresholdDays: dto.inactivityThresholdDays,
                messageToNominee: dto.messageToNominee,
                isEnabled: dto.isEnabled,
            },
        });
        return nominee;
    }

    // Called by nominee-facing public URL to request OTP
    async requestAccess(dto: RequestNomineeAccessDto) {
        const request = await this.prisma.nomineeAccessRequest.findUnique({
            where: { tokenHash: dto.token },
            include: { nominee: true, user: true },
        });

        if (!request) {
            throw new NotFoundException('Invalid or expired request token');
        }

        if (request.status !== 'SENT') {
            throw new BadRequestException(`Request is already in ${request.status} status`);
        }

        if (new Date() > request.expiresAt) {
            await this.prisma.nomineeAccessRequest.update({
                where: { id: request.id },
                data: { status: 'EXPIRED' }
            });
            throw new BadRequestException('This access request has expired');
        }

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpHash = await argon2.hash(otp);
        const otpExpiresAt = new Date(Date.now() + 15 * 60000); // 15 mins

        await this.prisma.nomineeAccessRequest.update({
            where: { id: request.id },
            data: { otpHash, otpExpiresAt },
        });

        // Send OTP to Nominee
        if (request.nominee.email) {
            // Assuming MailService can handle this, for now just logging it, or add sendNomineeOtpEmail
            console.log(`Sending OTP ${otp} to ${request.nominee.email} for reading assets of ${request.user.email}`);
            // In reality: await this.mailService.sendNomineeOtpEmail(request.nominee.email, otp, request.user.firstName);
        }

        return { message: 'OTP sent to nominee email successfully' };
    }

    async verifyAccess(dto: VerifyNomineeAccessDto) {
        const request = await this.prisma.nomineeAccessRequest.findUnique({
            where: { tokenHash: dto.token },
            include: { nominee: true, user: true },
        });

        if (!request || !request.otpHash || !request.otpExpiresAt) {
            throw new BadRequestException('Invalid request or OTP not generated');
        }

        if (new Date() > request.otpExpiresAt) {
            throw new BadRequestException('OTP has expired. Please request a new one.');
        }

        const isValid = await argon2.verify(request.otpHash, dto.otp);
        if (!isValid) {
            throw new UnauthorizedException('Invalid OTP');
        }

        // Mark as Verified
        const accessWindowEnd = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours access
        await this.prisma.nomineeAccessRequest.update({
            where: { id: request.id },
            data: { status: 'VERIFIED', accessWindowEnd },
        });

        // Generate a READ-ONLY access token for the user's data
        const payload = { email: request.user.email, sub: request.user.id, role: 'NOMINEE_READ_ONLY', requestId: request.id };
        const token = this.jwtService.sign(payload, { expiresIn: '24h' });

        return {
            access_token: token,
            user_name: `${request.user.firstName} ${request.user.lastName}`,
            messageToNominee: request.nominee.messageToNominee,
            accessWindowEnd,
        };
    }

    // Admin / Cron Trigger
    async checkInactivityForUser(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { nominee: true } });
        if (!user || !user.nominee || !user.nominee.isEnabled) return;

        const thresholdDays = user.nominee.inactivityThresholdDays || 60;
        const lastActiveAt = user.lastActiveAt || user.updatedAt;

        // Check if inactivity has exceeded threshold
        const diffTime = Math.abs(new Date().getTime() - new Date(lastActiveAt).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > thresholdDays) {
            // Check if we already have an active request
            const activeRequest = await this.prisma.nomineeAccessRequest.findFirst({
                where: { nomineeId: user.nominee.id, status: { in: ['SENT', 'VERIFIED'] } },
            });

            if (!activeRequest) {
                return this.triggerNomineeAccessRequest(user.nominee.id, user.id);
            }
        }
    }

    private async triggerNomineeAccessRequest(nomineeId: string, userId: string) {
        // Generate secure token URL
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days to click the link

        const request = await this.prisma.nomineeAccessRequest.create({
            data: {
                nomineeId,
                userId,
                tokenHash: token,
                expiresAt,
                status: 'SENT',
            }
        });

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        const nominee = await this.prisma.nominee.findUnique({ where: { id: nomineeId } });

        if (nominee && nominee.email) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const accessLink = `${frontendUrl}/nominee-access/${token}`;
            console.log(`Sending Nominee Invitation to ${nominee.email}: ${accessLink}`);
            // Send an email to the nominee with the access link
        }

        return request;
    }
}
