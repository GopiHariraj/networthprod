import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StockAssetsService } from './stock-assets.service';
import {
  CreateStockAssetDto,
  UpdateStockAssetDto,
} from './dto/stock-asset.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('stock-assets')
@UseGuards(JwtAuthGuard)
export class StockAssetsController {
  constructor(private stockAssetsService: StockAssetsService) { }

  @Get()
  findAll(@Request() req: any) {
    return this.stockAssetsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.stockAssetsService.findOne(id, req.user.id);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateStockAssetDto) {
    return this.stockAssetsService.create(req.user.id, dto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateStockAssetDto,
  ) {
    return this.stockAssetsService.update(id, req.user.id, dto);
  }

  @Get('quote/:symbol')
  async getQuote(@Param('symbol') symbol: string) {
    return this.stockAssetsService.getQuoteBySymbol(symbol);
  }

  @Post(':id/refresh-price')
  refreshPrice(@Param('id') id: string, @Request() req: any) {
    return this.stockAssetsService.refreshPrice(id, req.user.id);
  }

  @Post('refresh-all-prices')
  refreshAllPrices(@Request() req: any) {
    return this.stockAssetsService.refreshAllPrices(req.user.id);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.stockAssetsService.delete(id, req.user.id);
  }
}
