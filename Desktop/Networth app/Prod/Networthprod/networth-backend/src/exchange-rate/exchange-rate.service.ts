import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ExchangeRateService {
    private readonly alphaVantageApiKey: string;
    private readonly baseUrl = 'https://www.alphavantage.co/query';

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) {
        this.alphaVantageApiKey = this.configService.get<string>('ALPHA_VANTAGE_API_KEY') || 'TPVKHORBWQ1ZPWQX';
    }

    /**
     * Fetch live exchange rates from Alpha Vantage
     */
    async fetchLiveRates(baseCurrency: string, targetCurrencies: string[]) {
        try {
            const rates: Record<string, number> = {};

            console.log('[ExchangeRateService] Fetching rates from Alpha Vantage for', baseCurrency, 'to', targetCurrencies);

            // Fetch rates for each target currency
            // Note: Alpha Vantage free tier: 25 requests/day, 5 requests/minute
            for (const targetCurrency of targetCurrencies) {
                try {
                    const url = `${this.baseUrl}?function=CURRENCY_EXCHANGE_RATE&from_currency=${baseCurrency}&to_currency=${targetCurrency}&apikey=${this.alphaVantageApiKey}`;

                    console.log(`[ExchangeRateService] Fetching ${baseCurrency}->${targetCurrency}...`);

                    // Use native https module for compatibility
                    const data: any = await new Promise((resolve, reject) => {
                        const https = require('https');
                        https.get(url, { headers: { 'User-Agent': 'NestJS' } }, (res: any) => {
                            let body = '';
                            res.on('data', (chunk: any) => body += chunk);
                            res.on('end', () => {
                                try {
                                    resolve(JSON.parse(body));
                                } catch (e) {
                                    reject(new Error('Failed to parse response'));
                                }
                            });
                        }).on('error', reject);
                    }).catch(err => {
                        throw new Error(`HTTP request failed: ${err.message}`);
                    });

                    // Check for API errors
                    if ('Error Message' in data) {
                        console.error(`[ExchangeRateService] Alpha Vantage error for ${baseCurrency}->${targetCurrency}:`, data['Error Message']);
                        continue;
                    }

                    if ('Note' in data) {
                        console.warn('[ExchangeRateService] Alpha Vantage rate limit hit:', data['Note']);
                        throw new Error('Alpha Vantage API rate limit exceeded');
                    }

                    const exchangeData = data['Realtime Currency Exchange Rate'];
                    if (!exchangeData) {
                        console.error(`[ExchangeRateService] No exchange rate data for ${baseCurrency}->${targetCurrency}`);
                        console.log(`[ExchangeRateService] Full response:`, JSON.stringify(data));
                        continue;
                    }

                    const rate = parseFloat(exchangeData['5. Exchange Rate']);
                    if (isNaN(rate) || rate <= 0) {
                        console.error(`[ExchangeRateService] Invalid rate for ${targetCurrency}:`, rate);
                        continue;
                    }

                    rates[targetCurrency] = rate;
                    console.log(`[ExchangeRateService] ✓ Got rate ${baseCurrency}->${targetCurrency}: ${rate}`);

                    // Add small delay to respect rate limits (5 requests/minute = 12s between requests)  
                    if (targetCurrencies.indexOf(targetCurrency) < targetCurrencies.length - 1) {
                        console.log('[ExchangeRateService] Waiting 12s before next request...');
                        await new Promise(resolve => setTimeout(resolve, 12000));
                    }
                } catch (error) {
                    console.error(`[ExchangeRateService] Failed to fetch ${baseCurrency}->${targetCurrency}:`, error.message);
                    continue;
                }
            }

            if (Object.keys(rates).length === 0) {
                throw new Error('No exchange rates could be fetched from Alpha Vantage');
            }

            // Store in database
            for (const [currency, rate] of Object.entries(rates)) {
                await this.prisma.exchangeRate.upsert({
                    where: {
                        baseCurrency_targetCurrency: {
                            baseCurrency,
                            targetCurrency: currency
                        }
                    },
                    create: {
                        baseCurrency,
                        targetCurrency: currency,
                        rate: Number(rate),
                        source: 'alpha_vantage',
                    },
                    update: {
                        rate: Number(rate),
                        source: 'alpha_vantage',
                        fetchedAt: new Date(),
                    },
                });
            }

            console.log('[ExchangeRateService] Successfully stored', Object.keys(rates).length, 'rates in database');
            return { success: true, rates, fetchedAt: new Date() };
        } catch (error) {
            console.error('[ExchangeRateService] Failed to fetch live rates:', error.message, error.stack);
            throw error;
        }
    }

    /**
     * Get cached exchange rates from database
     */
    async getCachedRates(baseCurrency: string) {
        const rates = await this.prisma.exchangeRate.findMany({
            where: { baseCurrency },
            orderBy: { fetchedAt: 'desc' },
        });

        if (rates.length === 0) {
            return null;
        }

        const ratesMap = rates.reduce((acc, r) => {
            acc[r.targetCurrency] = {
                rate: Number(r.rate),
                fetchedAt: r.fetchedAt,
                source: r.source,
            };
            return acc;
        }, {} as Record<string, { rate: number; fetchedAt: Date; source: string }>);

        return {
            baseCurrency,
            rates: ratesMap,
            oldestUpdate: rates[rates.length - 1]?.fetchedAt,
            newestUpdate: rates[0]?.fetchedAt,
        };
    }

    /**
     * Get rates with fallback to cached or hardcoded if API fails
     */
    async getRatesWithFallback(baseCurrency: string, targetCurrencies: string[]) {
        try {
            // Try to fetch live rates
            return await this.fetchLiveRates(baseCurrency, targetCurrencies);
        } catch (error) {
            console.warn('[ExchangeRateService] Live API failed, trying cache:', error.message);

            try {
                // Try fallback to cached rates
                const cached = await this.getCachedRates(baseCurrency);

                if (cached && Object.keys(cached.rates).length > 0) {
                    return {
                        success: true,
                        rates: Object.entries(cached.rates).reduce((acc, [curr, data]) => {
                            acc[curr] = data.rate;
                            return acc;
                        }, {} as Record<string, number>),
                        fetchedAt: cached.newestUpdate,
                        usingCache: true,
                        warning: 'Using cached exchange rates due to API failure',
                    };
                }
            } catch (cacheError) {
                console.error('[ExchangeRateService] Cache lookup failed:', cacheError.message);
            }

            console.info('[ExchangeRateService] Using hardcoded fallback rates');
            // Ultimate fallback to hardcoded rates if everything else fails
            const hardcodedRates = this.getHardcodedRates(baseCurrency);

            return {
                success: true,
                rates: hardcodedRates,
                fetchedAt: new Date(),
                usingCache: true,
                warning: 'Using hardcoded fallback rates (API & Cache unavailable)',
            };
        }
    }

    /**
     * Ultimate fallback rates for AED base
     */
    private getHardcodedRates(baseCurrency: string): Record<string, number> {
        // Default relative to AED
        const aedToTarget: Record<string, number> = {
            'USD': 0.2723,
            'EUR': 0.2514,
            'GBP': 0.2145,
            'INR': 22.74,
            'SAR': 1.021,
            'AED': 1.0
        };

        if (baseCurrency === 'AED') {
            return aedToTarget;
        }

        // If base is something else, we could calculate, but for now just return AED ones 
        // as the app primarily uses AED as base storage.
        return aedToTarget;
    }

    /**
     * Get the latest exchange rate for a specific currency pair
     */
    async getRate(baseCurrency: string, targetCurrency: string) {
        const rate = await this.prisma.exchangeRate.findUnique({
            where: {
                baseCurrency_targetCurrency: { baseCurrency, targetCurrency }
            }
        });

        if (!rate) {
            return null;
        }

        return {
            rate: Number(rate.rate),
            fetchedAt: rate.fetchedAt,
            source: rate.source,
        };
    }
}
