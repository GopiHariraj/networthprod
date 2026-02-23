import { Injectable, ForbiddenException } from '@nestjs/common';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class OpenAiService {
  private openai: OpenAI | null = null;
  private readonly ADMIN_EMAIL = 'Admin@fortstec.com';

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      console.log('[OpenAiService] Initialized with OpenAI API');
    } else {
      console.warn('[OpenAiService] OpenAI API key not found');
    }
  }

  async parseExpenseText(text: string, email: string): Promise<any> {
    try {
      if (!this.openai) {
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

  async parseSMSTransaction(smsText: string, email: string): Promise<any> {
    try {
      if (!this.openai) {
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
  "merchant": "string",
  "category": "string",
  "confidence": 0.0-1.0
}

SMS: "${smsText}"
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      return JSON.parse(completion.choices[0]?.message?.content || '{}');
    } catch (error) {
      console.error('OpenAI SMS parse error:', error);
      return this.mockParseSMS(smsText);
    }
  }

  async analyzeReceiptImage(imageBase64: string, email: string): Promise<any> {
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
  "items": [{"name": "item", "quantity": 1, "price": 1}],
  "category": "Groceries",
  "paymentMethod": "cash" | "card",
  "confidence": 0.9
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

      return JSON.parse(completion.choices[0]?.message?.content || '{}');
    } catch (error) {
      console.error('OpenAI Vision error:', error);
      throw new Error('Receipt analysis failed.');
    }
  }

  async transcribeAudio(fileBuffer: Buffer, mimetype: string, email: string): Promise<any> {
    try {
      if (!this.openai) {
        return this.mockParseExpenseText("Mock audio transcript: spent 45 on coffee");
      }
      const extension = mimetype.split('/')[1] || 'm4a';
      const tempFilePath = path.join(__dirname, `../../../../../temp_audio_${Date.now()}.${extension}`);
      fs.writeFileSync(tempFilePath, fileBuffer);

      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: 'whisper-1',
      });

      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      return this.parseExpenseText(transcription.text, email);
    } catch (error) {
      console.error('OpenAI Audio error:', error);
      throw new Error('Audio transcription failed.');
    }
  }

  async analyzeDocumentText(textContent: string, email: string): Promise<any> {
    try {
      if (!this.openai) {
        return this.mockParseExpenseText("Mock document parse: spent 100 on groceries");
      }

      const prompt = `
Analyze the following document text and extract the most prominent expense transaction.
Categories: Groceries, Restaurants, Transport, Fuel, Utilities (DEWA), Rent/EMI, School Fees, Insurance, Self-care, Shopping, Entertainment, Medical, Travel, Misc
Return format (ONLY valid JSON):
{
  "items": [{
    "date": "YYYY-MM-DD",
    "amount": number,
    "currency": "AED",
    "category": "pick from categories",
    "merchant": "merchant name",
    "notes": "short description"
  }]
}
Text chunk (first 2000 chars): "${textContent.substring(0, 2000)}"
`;
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });
      return JSON.parse(completion.choices[0]?.message?.content || '{}');
    } catch (error) {
      console.error('Document analysis error:', error);
      throw new Error('Document extraction failed.');
    }
  }

  private mockParseExpenseText(text: string): any {
    return { items: [{ date: new Date().toISOString().split('T')[0], amount: 0, currency: 'AED', category: 'Misc', merchant: 'Mock', paymentMethod: 'cash', notes: text, confidence: 0.5 }] };
  }

  private mockParseSMS(text: string): any {
    return { type: 'EXPENSE', amount: 0, currency: 'AED', date: new Date().toISOString().split('T')[0], confidence: 0.5 };
  }
}
