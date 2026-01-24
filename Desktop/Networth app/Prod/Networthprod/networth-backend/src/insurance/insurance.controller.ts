import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { CreateInsurancePolicyDto, UpdateInsurancePolicyDto } from './dto/insurance-policy.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('insurance')
@UseGuards(JwtAuthGuard)
export class InsuranceController {
    constructor(private readonly insuranceService: InsuranceService) { }

    @Post()
    create(@Request() req: any, @Body() createDto: CreateInsurancePolicyDto) {
        return this.insuranceService.create(req.user.id, createDto);
    }

    @Get()
    findAll(@Request() req: any) {
        return this.insuranceService.findAll(req.user.id);
    }

    @Get(':id')
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.insuranceService.findOne(req.user.id, id);
    }

    @Patch(':id')
    update(@Request() req: any, @Param('id') id: string, @Body() updateDto: UpdateInsurancePolicyDto) {
        return this.insuranceService.update(req.user.id, id, updateDto);
    }

    @Delete(':id')
    remove(@Request() req: any, @Param('id') id: string) {
        return this.insuranceService.remove(req.user.id, id);
    }
}
