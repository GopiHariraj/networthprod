import { Injectable, ForbiddenException } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class GeminiService {
    private openai: OpenAI | null = null;
    private readonly ADMIN_EMAIL = 'Admin@fortstec.com';

    constructor() {
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            console.log('[GeminiService] Initialized with OpenAI API (Replacing Gemini)');
        } else {
            console.warn('[GeminiService] OpenAI API key not found');
        }
    }

    private validateAdminAccess(email: string) {
        if (!email || email.toLowerCase() !== this.ADMIN_EMAIL.toLowerCase()) {
            throw new ForbiddenException('AI features are restricted to administrator access only.');
        }
    }

    async parseExpenseText(text: string, email: string): Promise<any> {
        this.validateAdminAccess(email);

        try {
            if (!this.openai) {
                console.log('OpenAI API key not found, using mock parser');
                return this.mockParseExpenseText(text);
            }

            const prompt = `
Parse the following expense description and return a JSON object.

Categories: Groceries, Restaurants, Transport, Fuel, Utilities (DEWA), Rent/EMI, School Fees, Insurance, Self-care, Shopping, Entertainment, Medical, Travel, Misc

Return format (ONLY valid JSON, no markdown):
{
  "items": [
    {
      "date": "YYYY-MM-DD" (use today's date if not specified),
      "amount": number,
      "currency": "AED" (or detected currency),
      "category": "pick from categories above",
      "merchant": "store/company name",
      "paymentMethod": "cash" or "bank" or "credit_card",
      "notes": "additional details",
      "confidence": 0.8
    }
  ]
}

Text to parse: "${text}"
`;

            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            });

            const content = completion.choices[0]?.message?.content || '{}';
            return JSON.parse(content);
        } catch (error) {
            console.error('OpenAI API error:', error);
            return this.mockParseExpenseText(text);
        }
    }

    private mockParseExpenseText(text: string): any {
        // Simple regex-based parser as fallback
        const amountMatch = text.match(/(\d+(?:\.\d{1,2})?)\s*(AED|USD|EUR|dirhams?)?/i);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
        const currency = amountMatch?.[2]?.toUpperCase().replace('DIRHAMS', 'AED').replace('DIRHAM', 'AED') || 'AED';

        // Detect category based on keywords
        const categoryMap: Record<string, string[]> = {
            Groceries: ['lulu', 'carrefour', 'spinneys', 'grocery', 'groceries', 'supermarket', 'mart'],
            Restaurants: ['restaurant', 'cafe', 'starbucks', 'mcdonalds', 'kfc', 'dining', 'food', 'pizza', 'burger'],
            Transport: ['uber', 'careem', 'taxi', 'metro', 'bus', 'transport', 'ride'],
            Fuel: ['enoc', 'eppco', 'adnoc', 'petrol', 'gasoline', 'fuel', 'gas', 'shell'],
            'Utilities (DEWA)': ['dewa', 'electricity', 'water', 'utility', 'utilities', 'bill'],
            Shopping: ['mall', 'shop', 'shopping', 'clothes', 'amazon', 'noon', 'store'],
            Entertainment: ['cinema', 'movie', 'game', 'entertainment', 'park'],
            Medical: ['hospital', 'clinic', 'pharmacy', 'doctor', 'medical', 'medicine'],
        };

        let category = 'Misc';
        const lowerText = text.toLowerCase();
        for (const [cat, keywords] of Object.entries(categoryMap)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                category = cat;
                break;
            }
        }

        // Extract merchant name from common patterns
        const merchantPatterns = [
            /(?:at|from|to)\s+([A-Z][A-Za-z\s]+?)(?:\s+for|\s+\d|$)/i,
            /([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)/,
        ];

        let merchant = 'General';
        for (const pattern of merchantPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                merchant = match[1].trim();
                break;
            }
        }

        // Detect date
        const today = new Date();
        let date = today.toISOString().split('T')[0];

        if (text.match(/yesterday/i)) {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            date = yesterday.toISOString().split('T')[0];
        }

        return {
            items: [
                {
                    date,
                    amount,
                    currency,
                    category,
                    merchant: merchant.length > 30 ? merchant.substring(0, 30) : merchant,
                    paymentMethod: 'cash',
                    notes: text,
                    confidence: 0.6,
                },
            ],
        };
    }

    async parseSMSTransaction(smsText: string, email: string): Promise<any> {
        this.validateAdminAccess(email);

        try {
            if (!this.openai) {
                console.log('OpenAI API key not found, using mock SMS parser');
                return this.mockParseSMS(smsText);
            }

            const prompt = `
Parse this financial transaction SMS and extract details. Return ONLY valid JSON.

Transaction types: GOLD, STOCK, BOND, EXPENSE, INCOME, BANK_DEPOSIT

Return format:
{
  "type": "GOLD" | "STOCK" | "BOND" | "EXPENSE" | "INCOME" | "BANK_DEPOSIT",
  "amount": number,
  "currency": "AED" | "USD",
  "date": "YYYY-MM-DD",
  
  // For GOLD:
  "weight": number (in grams),
  "purity": "22K" | "24K" | "18K",
  "ornamentName": "string",
  
  // For STOCK:
  "stockSymbol": "string",
  "units": number,
  "unitPrice": number,
  "market": "NASDAQ" | "NYSE" | "DFM",
  
  // For BOND:
  "bondName": "string",
  "interestRate": number,
  "maturityDate": "YYYY-MM-DD",
  
  // For EXPENSE/INCOME:
  "merchant": "string",
  "category": "string",
  
  "confidence": 0.0-1.0
}

SMS: "${smsText}"

Return ONLY the JSON object.
`;

            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            });

            const content = completion.choices[0]?.message?.content || '{}';
            return JSON.parse(content);
        } catch (error) {
            console.error('OpenAI SMS parse error:', error);
            return this.mockParseSMS(smsText);
        }
    }

    async analyzeReceiptImage(imageBase64: string, email: string): Promise<any> {
        this.validateAdminAccess(email);

        try {
            if (!this.openai) {
                throw new Error('OpenAI API key required for image analysis');
            }

            const prompt = `
Analyze this receipt image and extract all transaction details. Return ONLY valid JSON.

Extract:
{
  "merchant": "store name",
  "date": "YYYY-MM-DD",
  "total": number,
  "currency": "AED" | "USD",
  "items": [
    {
      "name": "item name",
      "quantity": number,
      "price": number
    }
  ],
  "category": "Groceries" | "Restaurants" | "Shopping" | etc.,
  "paymentMethod": "cash" | "card",
  "confidence": 0.0-1.0
}
`;

            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` } }
                        ]
                    }
                ],
                response_format: { type: 'json_object' }
            });

            const content = completion.choices[0]?.message?.content || '{}';
            return JSON.parse(content);
        } catch (error) {
            console.error('OpenAI Vision error:', error);
            throw new Error('Receipt analysis failed. Please ensure image is clear and try again.');
        }
    }

    private mockParseSMS(smsText: string): any {
        const lowerText = smsText.toLowerCase();

        // Detect transaction type
        let type = 'EXPENSE';
        if (lowerText.includes('gold') || lowerText.includes('chain') || lowerText.includes('ring') || lowerText.includes('bracelet')) {
            type = 'GOLD';
        } else if (lowerText.includes('share') || lowerText.includes('stock') || lowerText.includes('aapl') || lowerText.includes('googl')) {
            type = 'STOCK';
        } else if (lowerText.includes('bond')) {
            type = 'BOND';
        } else if (lowerText.includes('salary') || lowerText.includes('credited') || lowerText.includes('income') || lowerText.includes('received')) {
            type = 'INCOME';
        } else if (lowerText.includes('deposit')) {
            type = 'BANK_DEPOSIT';
        }

        // Extract amount
        const amountMatch = smsText.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(AED|USD|\$)?/i);
        const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
        const currency = amountMatch?.[2]?.toUpperCase().replace('$', 'USD') || 'AED';

        const result: any = {
            type,
            amount,
            currency,
            date: new Date().toISOString().split('T')[0],
            confidence: 0.5
        };

        if (type === 'GOLD') {
            const weightMatch = smsText.match(/(\d+(?:\.\d+)?)\s*g/i);
            const purityMatch = smsText.match(/(22K|24K|18K)/i);
            result.weight = weightMatch ? parseFloat(weightMatch[1]) : 10;
            result.purity = purityMatch ? purityMatch[1] : '22K';
            result.ornamentName = 'Gold Item';
        } else if (type === 'STOCK') {
            const symbolMatch = smsText.match(/([A-Z]{1,5})/);
            const unitsMatch = smsText.match(/(\d+)\s*share/i);
            result.stockSymbol = symbolMatch ? symbolMatch[1] : 'AAPL';
            result.units = unitsMatch ? parseInt(unitsMatch[1]) : 1;
            result.unitPrice = result.amount / (result.units || 1);
            result.market = 'NASDAQ';
        }

        return result;
    }
}
