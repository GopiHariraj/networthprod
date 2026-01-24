import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface AlphaVantageQuote {
    'Global Quote': {
        '01. symbol': string;
        '05. price': string;
        '08. previous close': string;
        '09. change': string;
        '10. change percent': string;
    };
}

@Injectable()
export class AlphaVantageService {
    private readonly apiKey: string;
    private readonly baseUrl = 'https://www.alphavantage.co/query';

    constructor(private configService: ConfigService) {
        this.apiKey = this.configService.get<string>('ALPHA_VANTAGE_API_KEY') || 'TPVKHORBWQ1ZPWQX';
    }

    async getStockQuote(symbol: string): Promise<{ price: number; symbol: string }> {
        try {
            const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`;

            const response = await fetch(url);
            const data: AlphaVantageQuote = await response.json();

            // Check for API errors
            if ('Error Message' in data) {
                throw new HttpException(
                    `Invalid stock symbol: ${symbol}`,
                    HttpStatus.BAD_REQUEST,
                );
            }

            if ('Note' in data) {
                throw new HttpException(
                    'API rate limit exceeded. Please try again later.',
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }

            const quote = data['Global Quote'];
            if (!quote || !quote['05. price']) {
                throw new HttpException(
                    `No data found for symbol: ${symbol}`,
                    HttpStatus.NOT_FOUND,
                );
            }

            return {
                symbol: quote['01. symbol'],
                price: parseFloat(quote['05. price']),
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            console.error('Alpha Vantage API error:', error);
            throw new HttpException(
                'Failed to fetch stock price from Alpha Vantage',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async getBatchQuotes(symbols: string[]): Promise<Map<string, number>> {
        const results = new Map<string, number>();

        // Process sequentially to avoid rate limits
        for (const symbol of symbols) {
            try {
                const quote = await this.getStockQuote(symbol);
                results.set(symbol, quote.price);
                // Add small delay to respect rate limits (5 requests per minute for free tier)
                await new Promise(resolve => setTimeout(resolve, 12000));
            } catch (error) {
                console.error(`Failed to fetch price for ${symbol}:`, error);
                // Continue with other symbols even if one fails
            }
        }

        return results;
    }
}
