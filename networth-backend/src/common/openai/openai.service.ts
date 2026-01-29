import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenAiService {
  private defaultOpenai: OpenAI | null = null;

  constructor() {
    // Initialize default if available as backup
    if (process.env.OPENAI_API_KEY) {
      this.defaultOpenai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  private getClient(apiKey?: string): OpenAI | null {
    if (apiKey) {
      return new OpenAI({ apiKey });
    }
    return this.defaultOpenai;
  }

  async parseExpenseText(text: string): Promise<any> {
    try {
      // Use specific key for expenses if available, otherwise fallback
      const apiKey = process.env.OPENAI_API_KEY_EXPENSES || process.env.OPENAI_API_KEY;

      const client = this.getClient(apiKey);
      if (!client) {
        console.log('OpenAI API key (Expenses) not found, using mock parser');
        return this.mockParseExpenseText(text);
      }

      console.log(`[OpenAiService] Parse Expenses using key: ${apiKey ? '***' + apiKey.slice(-4) : 'none'}`);

      const completion = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expense extraction assistant. Extract expense information from user text and return ONLY valid JSON.
            
Categories: Groceries, Restaurants, Transport, Fuel, Utilities (DEWA), Rent/EMI, School Fees, Insurance, Self-care, Shopping, Entertainment, Medical, Travel, Misc

Return format:
{
  "items": [
    {
      "date": "YYYY-MM-DD",
      "amount": number,
      "currency": "AED" (or detected currency),
      "category": "one of the categories above",
      "merchant": "string",
      "paymentMethod": "cash" | "bank" | "credit_card",
      "notes": "original text snippet",
      "confidence": 0.0-1.0
    }
  ]
}

If date is relative (today, yesterday), convert to actual date.
If no currency mentioned, assume AED.
Assign appropriate category based on merchant and context.
Confidence: 1.0 for explicit data, 0.7-0.9 for inferred data, 0.5-0.7 for guessed data.`
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('No content received from OpenAI');

      const result = JSON.parse(content);
      return result;
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.mockParseExpenseText(text);
    }
  }

  async parseSMSTransaction(text: string): Promise<any> {
    try {
      // Use specific key for transactions if available, otherwise fallback
      const apiKey = process.env.OPENAI_API_KEY_TRANSACTIONS || process.env.OPENAI_API_KEY;

      const client = this.getClient(apiKey);
      if (!client) {
        console.log('OpenAI API key (Transactions) not found, using mock parser');
        return this.mockParseSMS(text);
      }

      console.log(`[OpenAiService] Parse SMS using key: ${apiKey ? '***' + apiKey.slice(-4) : 'none'}`);

      const completion = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Parse this financial transaction SMS and extract details. Return ONLY valid JSON.

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
}`
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('No content received from OpenAI');

      return JSON.parse(content);
    } catch (error) {
      console.error('OpenAI SMS parse error:', error);
      return this.mockParseSMS(text);
    }
  }

  async parseStatement(text: string): Promise<any> {
    try {
      const apiKey = process.env.OPENAI_API_KEY_EXPENSES || process.env.OPENAI_API_KEY;
      const client = this.getClient(apiKey);

      if (!client) {
        console.log('OpenAI API key (Expenses) not found, using mock parser');
        return this.mockParseExpenseText(text); // Fallback to single text parse or improve mock
      }

      console.log(`[OpenAiService] Parse Statement using key: ${apiKey ? '***' + apiKey.slice(-4) : 'none'}`);

      const completion = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert financial assistant. Parse the following bank statement text and extract all transactions. Return ONLY valid JSON.

Return format:
{
  "expenses": [
      {
          "date": "YYYY-MM-DD",
          "description": "original description",
          "amount": number,
          "merchant": "extracted merchant name",
          "category": "Groceries" | "Restaurants" | "Transport" | "Utilities" | "Shopping" | "Entertainment" | "Medical" | "Travel" | "Misc" | "Income" | "Transfer",
          "type": "EXPENSE" | "INCOME"
      }
  ]
}

Rules:
1. Ignore headers, footers, and page numbers.
2. If multiple transactions exist, list them all.
3. If amount is negative or labeled DR, it is an EXPENSE. If positive or CR (and logic suggests income), it is INCOME. However, most statements verify expense as debit.
4. Convert dates to YYYY-MM-DD.
5. Identify merchant from description.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        response_format: { type: 'json_object' }
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('No content from OpenAI');

      return JSON.parse(content);

    } catch (error) {
      console.error('OpenAI Statement parse error:', error);
      return { expenses: [] };
    }
  }

  private mockParseExpenseText(text: string): any {
    // Simple regex-based parser as fallback
    const amountMatch = text.match(/(\d+(?:\.\d{1,2})?)\s*(AED|USD|EUR|dirhams?)?/i);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
    const currency = amountMatch?.[2]?.toUpperCase() || 'AED';

    // Detect category based on keywords
    const categoryMap: Record<string, string[]> = {
      Groceries: ['lulu', 'carrefour', 'spinneys', 'grocery', 'groceries', 'supermarket'],
      Restaurants: ['restaurant', 'cafe', 'starbucks', 'mcdonalds', 'kfc', 'dining', 'food'],
      Transport: ['uber', 'careem', 'taxi', 'metro', 'bus', 'transport'],
      Fuel: ['enoc', 'eppco', 'adnoc', 'petrol', 'gasoline', 'fuel', 'gas'],
      'Utilities (DEWA)': ['dewa', 'electricity', 'water', 'utility', 'utilities'],
      Shopping: ['mall', 'shop', 'shopping', 'clothes', 'amazon', 'noon'],
      Entertainment: ['cinema', 'movie', 'game', 'entertainment'],
      Medical: ['hospital', 'clinic', 'pharmacy', 'doctor', 'medical'],
    };

    let category = 'Misc';
    const lowerText = text.toLowerCase();
    for (const [cat, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        category = cat;
        break;
      }
    }

    const words = text.split(/\s+/).filter(w => isNaN(Number(w)));
    const merchant = words.length > 0 ? words.slice(0, 2).join(' ') : 'General';
    const date = new Date().toISOString().split('T')[0];

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

  private mockParseSMS(smsText: string): any {
    const lowerText = smsText.toLowerCase();

    // Detect transaction type
    let type = 'EXPENSE';
    if (lowerText.includes('gold') || lowerText.includes('chain')) type = 'GOLD';
    else if (lowerText.includes('stock') || lowerText.includes('share')) type = 'STOCK';
    else if (lowerText.includes('bond')) type = 'BOND';
    else if (lowerText.includes('salary') || lowerText.includes('credit')) type = 'INCOME';
    else if (lowerText.includes('deposit')) type = 'BANK_DEPOSIT';

    const amountMatch = smsText.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

    return {
      type,
      amount,
      currency: 'AED',
      date: new Date().toISOString().split('T')[0],
      confidence: 0.5,
      merchant: 'Unknown',
      category: 'Uncategorized'
    };
  }
  async analyzeReceiptImage(imageBase64: string): Promise<any> {
    try {
      // Use expenses key for receipts as it's expense related, or fallback
      const apiKey = process.env.OPENAI_API_KEY_EXPENSES || process.env.OPENAI_API_KEY;

      const client = this.getClient(apiKey);
      if (!client) {
        throw new Error('OpenAI API key required for image analysis');
      }

      console.log(`[OpenAiService] Analyze Receipt using key: ${apiKey ? '***' + apiKey.slice(-4) : 'none'}`);

      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Analyze this receipt image and extract all transaction details. Return ONLY valid JSON.
            
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
}`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract receipt details" },
              {
                type: "image_url",
                image_url: {
                  "url": imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('No content received from OpenAI');

      return JSON.parse(content);
    } catch (error) {
      console.error('OpenAI Vision error:', error);
      throw new Error('Receipt analysis failed. Please ensure image is clear and try again.');
    }
  }

  async getStockQuote(symbol: string): Promise<{ price: number; currency: string }> {
    try {
      const apiKey = process.env.OPENAI_API_KEY_STOCKS || process.env.OPENAI_API_KEY;

      const client = this.getClient(apiKey);
      if (!client) {
        // Fallback to mock if no key
        return { price: 0, currency: 'USD' };
      }

      console.log(`[OpenAiService] Get Stock Quote using key: ${apiKey ? '***' + apiKey.slice(-4) : 'none'}`);

      const completion = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a financial assistant. Provide the LAST KNOWN closing stock price for the given symbol.
Since you cannot browse the web for real-time data, provide the most recent price you have knowledge of (or a reasonable estimate for a stock of this type if data is unavailable).
              
Return ONLY valid JSON:
{
  "price": number,
  "currency": "USD"
}`
          },
          {
            role: 'user',
            content: `What is the price of ${symbol}?`
          }
        ],
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('No content from OpenAI');

      const result = JSON.parse(content);
      return { price: result.price, currency: result.currency || 'USD' };
    } catch (error) {
      console.error('OpenAI Stock Quote error:', error);
      console.log(`[OpenAiService] Fallback to Mock Price for ${symbol}`);
      // Generate deterministic mock price based on symbol char codes to keep it consistent-ish
      const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const mockPrice = 100 + (seed % 900) + (Math.random() * 10); // Price between 100 and 1000
      return { price: parseFloat(mockPrice.toFixed(2)), currency: 'USD' };
    }
  }
}
