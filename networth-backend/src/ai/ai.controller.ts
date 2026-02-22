import { Body, Controller, Post, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) { }

  @Post('analyze')
  @UseGuards(JwtAuthGuard)
  async analyze(@Body('text') text: string, @Request() req: any) {
    if (req.user.planType !== 'PRO' && req.user.planType !== 'ENTERPRISE') {
      throw new ForbiddenException('AI analysis requires a Pro plan.');
    }
    return this.aiService.parseFinanceUpdate(text, req.user.email);
  }

  @Post('execute')
  @UseGuards(JwtAuthGuard)
  async execute(@Body() data: any, @Request() req: any) {
    if (req.user.planType !== 'PRO' && req.user.planType !== 'ENTERPRISE') {
      throw new ForbiddenException('AI execution requires a Pro plan.');
    }
    return this.aiService.executeUpdates(data, req.user.email);
  }

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  async chat(@Body() body: { message: string, context: any, history?: any[] }, @Request() req: any) {
    if (req.user.planType !== 'PRO' && req.user.planType !== 'ENTERPRISE') {
      throw new ForbiddenException('AI chat requires a Pro plan.');
    }
    return this.aiService.chat(body.message, body.context, req.user.email, body.history);
  }
}
