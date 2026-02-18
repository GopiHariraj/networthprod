import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import * as https from 'https';

@Injectable()
export class StockPriceService {
    private openai: OpenAI;

    constructor() {
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
            console.log('[StockPriceService] Using OpenAI o1-mini for stock prices');
        } else {
            console.warn('[StockPriceService] OPENAI_API_KEY not set, stock price refresh will not work');
        }
    }

    /**
     * Map stock exchange to its native trading currency
     */
    private getExchangeCurrency(market: string): string {
        const exchangeToCurrency: Record<string, string> = {
            'NASDAQ': 'USD', 'NYSE': 'USD', 'AMEX': 'USD',
            'NSE': 'INR', 'BSE': 'INR',
            'LSE': 'GBP', 'HKEX': 'HKD', 'TSE': 'JPY',
            'SSE': 'CNY', 'SZSE': 'CNY', 'EURONEXT': 'EUR',
            'FRA': 'EUR', 'SIX': 'CHF', 'ASX': 'AUD', 'TSX': 'CAD',
        };
        return exchangeToCurrency[market?.toUpperCase()] || 'USD';
    }

    /**
     * Map internal market code to Google Finance exchange code
     */
    private getGoogleFinanceExchange(market: string): string {
        const map: Record<string, string> = {
            'NSE': 'NSE',
            'BSE': 'BOM',
            'NASDAQ': 'NASDAQ',
            'NYSE': 'NYSE',
            'LSE': 'LON',
            'HKEX': 'HKG',
            'TSE': 'TYO',
            'TSX': 'TSE', // Toronto
            'ASX': 'ASX',
        };
        return map[market?.toUpperCase()] || market;
    }

    async fetchStockPrice(symbol: string, market: string, userEmail: string): Promise<{ price: number; currency: string } | null> {
        if (!this.openai) {
            console.error('[StockPriceService] OpenAI not initialized');
            return null;
        }

        const nativeCurrency = this.getExchangeCurrency(market);

        // 1. Try Live Verification via Google Finance + OpenAI extraction
        try {
            const googleExchange = this.getGoogleFinanceExchange(market);
            const livePrice = await this.fetchLivePriceFromGoogle(symbol, googleExchange, nativeCurrency);

            if (livePrice) {
                return { price: livePrice, currency: nativeCurrency };
            }
        } catch (error) {
            console.warn(`[StockPriceService] Live fetch failed for ${symbol}: ${error.message}. Falling back to historical knowledge.`);
        }

        // 2. Fallback to Historical OpenAI Knowledge
        return this.fetchHistoricalFromOpenAI(symbol, market, nativeCurrency);
    }

    /**
     * Fetches HTML from Google Finance and uses OpenAI to extract the price from the relevant snippet
     */
    private async fetchLivePriceFromGoogle(symbol: string, exchange: string, currency: string): Promise<number | null> {
        const url = `https://www.google.com/finance/quote/${symbol}:${exchange}`;
        console.log(`[StockPriceService] Fetching live data from: ${url}`);

        return new Promise((resolve) => {
            https.get(url, async (res) => {
                let data = '';
                // We don't need the whole body, but price is usually in the first 1MB. 
                // We can't easily abort without socket destroy, so we'll just read it.

                res.on('data', (d) => data += d);

                res.on('end', async () => {
                    if (res.statusCode !== 200) {
                        console.warn(`[StockPriceService] Google Finance returned status ${res.statusCode}`);
                        resolve(null);
                        return;
                    }

                    // Locate price element: class "YMlKec fxKbKc"
                    const marker = 'YMlKec fxKbKc';
                    const idx = data.indexOf(marker);

                    if (idx === -1) {
                        console.warn(`[StockPriceService] Could not find price marker in HTML for ${symbol}`);
                        resolve(null);
                        return;
                    }

                    // Extract a small snippet around the marker (e.g., 200 chars)
                    // The HTML looks like: <div class="YMlKec fxKbKc">₹262.40</div>
                    const snippet = data.substring(idx, idx + 200);

                    console.log(`[StockPriceService] Found snippet for ${symbol}: ${snippet}`);

                    // Use OpenAI to parse the exact number from this snippet
                    const price = await this.askOpenAIToExtractPrice(snippet, currency);
                    resolve(price);
                });

            }).on('error', (e) => {
                console.error(`[StockPriceService] Network error fetching ${url}:`, e);
                resolve(null);
            });
        });
    }

    private async askOpenAIToExtractPrice(snippet: string, currency: string): Promise<number | null> {
        try {
            const prompt = `Extract the exact numeric stock price from this HTML snippet. 
            Snippet: "${snippet}"
            Return ONLY the number. No currency symbols. 
            Example output: 262.40`;

            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a data extraction engine. Output only the numeric value.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0,
            });

            const text = completion.choices[0]?.message?.content?.trim();
            const price = parseFloat(text?.replace(/[^0-9.]/g, '') || '0');

            if (price > 0) {
                console.log(`[StockPriceService] ✓ OpenAI extracted LIVE price: ${price} ${currency}`);
                return price;
            }
        } catch (error) {
            console.error('[StockPriceService] OpenAI extraction failed:', error);
        }
        return null;
    }

    private async fetchHistoricalFromOpenAI(symbol: string, market: string, nativeCurrency: string): Promise<{ price: number; currency: string } | null> {
        // ... existing historical fallback logic ...
        const prompt = `What is the latest known stock price for ${symbol} traded on ${market}?
         Return ONLY the numeric value in ${nativeCurrency}.`;

        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }]
        });

        const text = completion.choices[0]?.message?.content?.trim();
        const price = parseFloat(text?.replace(/[^0-9.]/g, '') || '0');

        if (price > 0) {
            console.log(`[StockPriceService] (Historical) OpenAI price for ${symbol}: ${price}`);
            return { price, currency: nativeCurrency };
        }
        return null;
    }
    async fetchGoldPrice(currency: string = 'AED'): Promise<number | null> {
        if (!this.openai) {
            console.error('[StockPriceService] OpenAI not initialized');
            return null;
        }

        const prompt = `What is the current live market rate for 24K Gold per Gram in ${currency}?
        Return ONLY the numeric value. Do not include currency symbols.`;

        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }]
            });

            const text = completion.choices[0]?.message?.content?.trim();
            const price = parseFloat(text?.replace(/[^0-9.]/g, '') || '0');

            if (price > 0) {
                console.log(`[StockPriceService] Gold price fetched: ${price} ${currency}`);
                return price;
            }
        } catch (error) {
            console.error('[StockPriceService] Failed to fetch gold price:', error);
        }
        return null;
    }
}
