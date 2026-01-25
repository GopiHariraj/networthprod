import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { DepreciatingAssetsService } from './depreciating-assets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('depreciating-assets')
@UseGuards(JwtAuthGuard)
export class DepreciatingAssetsController {
    constructor(private readonly depreciatingAssetsService: DepreciatingAssetsService) { }

    @Post()
    create(@Request() req: any, @Body() createDepreciatingAssetDto: any) {
        return this.depreciatingAssetsService.create(req.user.id, createDepreciatingAssetDto);
    }

    @Get()
    findAll(@Request() req: any) {
        return this.depreciatingAssetsService.findAll(req.user.id);
    }

    @Get(':id')
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.depreciatingAssetsService.findOne(id, req.user.id);
    }

    @Patch(':id')
    update(@Request() req: any, @Param('id') id: string, @Body() updateDepreciatingAssetDto: any) {
        return this.depreciatingAssetsService.update(id, req.user.id, updateDepreciatingAssetDto);
    }

    @Delete(':id')
    remove(@Request() req: any, @Param('id') id: string) {
        return this.depreciatingAssetsService.remove(id, req.user.id);
    }
}
