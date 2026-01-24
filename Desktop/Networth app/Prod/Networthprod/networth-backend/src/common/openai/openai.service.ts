import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenAiService {
  private openai: OpenAI;

  constructor() {
    // Only initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  async parseExpenseText(text: string): Promise<any> {
    try {
      const apiKey = process.env.OPENAI_API_KEY;

      if (!apiKey) {
        // Fallback to mock parser when OpenAI is not configured
        console.log('OpenAI API key not found, using mock parser');
        return this.mockParseExpenseText(text);
      }

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
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
Confidence: 1.0 for explicit data, 0.7-0.9 for inferred data, 0.5-0.7 for guessed data.`,
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
      if (!content) {
        throw new Error('No content received from OpenAI');
      }
      const result = JSON.parse(content);
      return result;
    } catch (error) {
      console.error('OpenAI API error:', error);
      // Fallback to mock parser if OpenAI fails
      return this.mockParseExpenseText(text);
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

    // Extract merchant name
    const commonWords = ['spent', 'paid', 'bought', 'at', 'for', 'from', 'in', 'on', 'the', 'a', 'an'];
    const words = text.split(/\s+/).filter(w => !commonWords.includes(w.toLowerCase()) && isNaN(Number(w)));
    const merchant = words.length > 0 ? words.slice(0, 2).join(' ') : 'General';

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
}
