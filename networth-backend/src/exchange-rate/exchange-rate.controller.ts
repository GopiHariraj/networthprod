import {
    Controller,
    Get,
    Post,
    UseGuards,
    Request,
    Query,
} from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('exchange-rates')
@UseGuards(JwtAuthGuard)
export class ExchangeRateController {
    constructor(private readonly exchangeRateService: ExchangeRateService) { }

    @Get()
    async getExchangeRates(@Request() req: any) {
        const targetCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'SAR'];

        console.log('[ExchangeRateController] getExchangeRates called');
        console.log('[ExchangeRateController] User from request:', JSON.stringify(req.user));
        // Always use AED as base currency since all DB values are stored in AED
        // and the frontend expects rates relative to AED
        const baseCurrency = 'AED';
        console.log('[ExchangeRateController] Forcing base currency to:', baseCurrency);

        const result = await this.exchangeRateService.getRatesWithFallback(
            baseCurrency,
            targetCurrencies,
        );
        console.log('[ExchangeRateController] Result success:', result.success);
        console.log('[ExchangeRateController] Rate count:', Object.keys(result.rates || {}).length);
        return result;
    }

    @Get('cached')
    async getCachedRates(@Request() req: any) {
        const userCurrency = req.user.currency || 'AED';
        return this.exchangeRateService.getCachedRates(userCurrency);
    }

    @Post('refresh')
    async refreshRates(@Request() req: any) {
        const userCurrency = req.user.currency || 'AED';
        const targetCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'SAR'];

        return this.exchangeRateService.getRatesWithFallback(
            userCurrency,
            targetCurrencies,
        );
    }

    @Get('rate')
    async getSpecificRate(
        @Request() req: any,
        @Query('target') targetCurrency: string,
    ) {
        const baseCurrency = req.user.currency || 'AED';
        return this.exchangeRateService.getRate(baseCurrency, targetCurrency);
    }
}
