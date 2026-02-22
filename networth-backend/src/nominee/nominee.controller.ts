import { Controller, Get, Post, Put, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { NomineeService } from './nominee.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateNomineeDto, RequestNomineeAccessDto, VerifyNomineeAccessDto } from './dto/nominee.dto';

@Controller('nominee')
export class NomineeController {
    constructor(private readonly nomineeService: NomineeService) { }

    @UseGuards(JwtAuthGuard)
    @Get()
    getNominee(@Request() req: any) {
        if (req.user.planType !== 'PRO' && req.user.planType !== 'ENTERPRISE') {
            throw new ForbiddenException('Nominee access features require a Pro plan.');
        }
        return this.nomineeService.getNominee(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Put()
    updateNominee(@Request() req: any, @Body() updateNomineeDto: UpdateNomineeDto) {
        if (req.user.planType !== 'PRO' && req.user.planType !== 'ENTERPRISE') {
            throw new ForbiddenException('Nominee access features require a Pro plan.');
        }
        return this.nomineeService.updateNominee(req.user.userId, updateNomineeDto);
    }

    // Admin/Testing Endpoint to trigger check manually (could be guarded)
    @UseGuards(JwtAuthGuard)
    @Post('trigger-check')
    async triggerCheck(@Request() req: any) {
        await this.nomineeService.checkInactivityForUser(req.user.userId);
        return { success: true, message: 'Inactivity check triggered' };
    }

    // Public Endpoints for the Nominee arriving via email link

    @Post('access/request-otp')
    requestAccess(@Body() dto: RequestNomineeAccessDto) {
        return this.nomineeService.requestAccess(dto);
    }

    @Post('access/verify-otp')
    verifyAccess(@Body() dto: VerifyNomineeAccessDto) {
        return this.nomineeService.verifyAccess(dto);
    }
}
