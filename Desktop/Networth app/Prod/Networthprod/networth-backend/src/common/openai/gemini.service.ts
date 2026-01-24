import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
    private genAI: GoogleGenerativeAI | null = null;
    private model: any = null;

    constructor() {
        // Only initialize Gemini if API key is available
        if (process.env.GEMINI_API_KEY) {
            this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const modelName = 'gemini-1.5-flash';
            console.log(`[GeminiService] Initializing with model: ${modelName} (API version: v1)`);
            // Explicitly set API version to v1 to avoid v1beta issues
            this.model = this.genAI.getGenerativeModel(
                { model: modelName },
                { apiVersion: 'v1' }
            );

            // Log available models for debugging (async, don't block)
            this.listAvailableModels();
        }
    }

    private async listAvailableModels() {
        try {
            // Note: listModels is on the genAI instance
            // But sometimes it requires special permissions.
            // Let's just try a simple check.
            console.log('[GeminiService] Checking model availability...');
        } catch (e) {
            console.warn('[GeminiService] Could not list models:', e.message);
        }
    }

    async parseExpenseText(text: string): Promise<any> {
        try {
            const apiKey = process.env.GEMINI_API_KEY;

            if (!apiKey || !this.model) {
                // Fallback to mock parser when Gemini is not configured
                console.log('Gemini API key not found, using mock parser');
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

Return ONLY the JSON object, no extra text or markdown.
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            let jsonText = response.text();

            // Clean up markdown code blocks if present
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            const parsed = JSON.parse(jsonText);
            return parsed;
        } catch (error) {
            console.error('Gemini API error:', error);
            // Fallback to mock parser if Gemini fails
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

    async parseSMSTransaction(smsText: string): Promise<any> {
        try {
            const apiKey = process.env.GEMINI_API_KEY;

            if (!apiKey || !this.model) {
                console.log('Gemini API key not found, using mock SMS parser');
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

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            let jsonText = response.text();

            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            return JSON.parse(jsonText);
        } catch (error) {
            console.error('Gemini SMS parse error:', error);
            return this.mockParseSMS(smsText);
        }
    }

    async analyzeReceiptImage(imageBase64: string): Promise<any> {
        try {
            const apiKey = process.env.GEMINI_API_KEY;

            if (!apiKey || !this.genAI) {
                throw new Error('Gemini API key required for image analysis');
            }

            const visionModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

Return ONLY the JSON object.
`;

            const imageParts = {
                inlineData: {
                    data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
                    mimeType: 'image/jpeg'
                }
            };

            const result = await visionModel.generateContent([prompt, imageParts]);
            const response = await result.response;
            let jsonText = response.text();

            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            return JSON.parse(jsonText);
        } catch (error) {
            console.error('Gemini Vision error:', error);
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

    /**
     * Generic content generation method
     */
    async generateContent(prompt: string): Promise<string> {
        try {
            if (!this.model) {
                throw new Error('Gemini API key not configured');
            }

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Gemini generateContent error:', error);
            throw error;
        }
    }
}
