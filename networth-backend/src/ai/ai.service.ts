import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private openai: OpenAI | null = null;
  private readonly ADMIN_EMAIL = 'Admin@fortstec.com';
  private readonly ALLOWED_EMAILS = ['sunto2@gmail.com', 'admin@fortstec.com'];

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      console.log('[AiService] Initialized with OpenAI API');
    } else {
      console.warn('[AiService] OpenAI API key not found');
    }
  }

  private validateAdminAccess(email: string) {
    if (!email || !this.ALLOWED_EMAILS.some(allowed => allowed.toLowerCase() === email.toLowerCase())) {
      throw new ForbiddenException('AI features are restricted to administrator access only.');
    }
  }

  async parseFinanceUpdate(text: string, email: string) {
    this.validateAdminAccess(email);

    if (!this.openai) {
      return this.mockParse(text);
    }

    try {
      const prompt = `
        You are a financial assistant. Analyze the following text and extract financial updates.
        Return a JSON object with this structure:
        {
          "transactions": [
            { "description": "...", "amount": number, "type": "INCOME" | "EXPENSE", "category": "..." }
          ],
          "assetUpdates": [
            { "name": "...", "type": "Gold" | "Stock" | "Cash", "valueChange": number, "newValue": number (optional) }
          ],
          "liabilityUpdates": [
             { "name": "...", "amountPaid": number }
          ]
        }
        Text: "${text}"
      `;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      return JSON.parse(responseText);
    } catch (error) {
      console.error('OpenAI API Error:', error);
      return this.mockParse(text);
    }
  }

  private mockParse(text: string) {
    console.log('Using Mock AI Parser for:', text);
    // Simple regex fallback for demo
    const numbers = text.match(/\d+/g)?.map(Number) || [];
    const isExpense = /paid|spent|bought/i.test(text);

    return {
      transactions: [
        {
          description: 'Parsed Update (Mock)',
          amount: numbers[0] || 0,
          type: isExpense ? 'EXPENSE' : 'INCOME',
          category: 'Uncategorized',
        },
      ],
      assetUpdates: [],
      liabilityUpdates: [],
    };
  }

  async executeUpdates(data: any, email: string) {
    this.validateAdminAccess(email);
    // Logic to actually update DB would go here
    return { success: true, message: 'Updates processed successfully' };
  }

  async chat(message: string, context: any, email: string) {
    this.validateAdminAccess(email);

    if (!this.openai) {
      return {
        text: "I'm sorry, but I haven't been configured with an API key yet. Please check your settings.",
        chart: null
      };
    }

    try {
      const prompt = `
        You are an advanced financial advisor AI named "Smart Wealth Chat".
        
        CONTEXT:
        The user has provided their current financial data:
        ${JSON.stringify(context, null, 2)}
        
        USER QUESTION:
        "${message}"
        
        INSTRUCTIONS:
        1. Analyze the user's financial data to answer the question.
        2. Be concise, professional, and encouraging.
        3. Use specific numbers from the data to back up your points.
        4. Provide actionable insights or suggestions where applicable.
        5. Format your response in clean Markdown.
        6. If the user asks for a specific chart or visualization that fits the data, describe it textually but also suggest what kind of chart would be best (e.g., "A pie chart of your assets would show...").
        7. Do NOT make up data. If data is missing (e.g., no gold assets), mention that.
        8. Maintain a helpful and objective tone.
        
        RESPONSE FORMAT:
        Just return the text content directly (markdown supported).
      `;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText = completion.choices[0]?.message?.content || "I'm having trouble processing your request.";
      return { text: responseText };
    } catch (error) {
      console.error('OpenAI Chat Error:', error);
      return { text: "I'm having trouble connecting to my brain right now. Please try again later." };
    }
  }
}
