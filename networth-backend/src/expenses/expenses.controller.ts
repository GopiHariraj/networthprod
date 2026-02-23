import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OpenAiService } from '../common/openai/openai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto, ReportFilterDto } from './dto/expense.dto';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(
    private readonly openAiService: OpenAiService,
    private readonly expensesService: ExpensesService,
  ) { }

  @Get()
  findAll(@Request() req: any) {
    return this.expensesService.findAll(req.user.id);
  }

  @Get('insights')
  async getInsights(@Request() req: any) {
    return this.expensesService.getInsights(req.user.id);
  }

  @Post('report')
  async getReport(@Request() req: any, @Body() filterDto: ReportFilterDto) {
    return this.expensesService.generateReport(req.user.id, filterDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.expensesService.findOne(id, req.user.id);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(req.user.id, dto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.expensesService.delete(id, req.user.id);
  }

  @Post('ai-parse-text')
  async parseExpenseText(@Body() body: { text: string }, @Request() req: any) {
    if (!body.text || body.text.trim().length === 0) {
      return { error: 'Text is required' };
    }

    try {
      const result = await this.openAiService.parseExpenseText(body.text, req.user.email);
      return result;
    } catch (error) {
      return {
        error: 'Failed to parse expenses',
        message: error.message,
      };
    }
  }

  @Post('ai/voice')
  @UseInterceptors(FileInterceptor('file'))
  async parseVoice(@UploadedFile() file: any, @Request() req: any) {
    if (!file) return { error: 'Audio file is required' };
    try {
      return await this.openAiService.transcribeAudio(file.buffer, file.mimetype, req.user.email);
    } catch (error) {
      return { error: 'Failed to process voice', message: error.message };
    }
  }

  @Post('ai/image')
  @UseInterceptors(FileInterceptor('file'))
  async parseImage(@UploadedFile() file: any, @Request() req: any) {
    if (!file) return { error: 'Image file is required' };
    try {
      const base64 = file.buffer.toString('base64');
      return await this.openAiService.analyzeReceiptImage(base64, req.user.email);
    } catch (error) {
      return { error: 'Failed to process receipt', message: error.message };
    }
  }

  @Post('ai/document')
  @UseInterceptors(FileInterceptor('file'))
  async parseDocument(@UploadedFile() file: any, @Request() req: any) {
    if (!file) return { error: 'Document file is required' };
    try {
      return await this.openAiService.analyzeDocumentText(file.buffer.toString('utf8'), req.user.email);
    } catch (error) {
      return { error: 'Failed to process document', message: error.message };
    }
  }

  @Post('ai/link')
  async parseLink(@Body() body: { url: string }, @Request() req: any) {
    if (!body.url) return { error: 'URL is required' };
    try {
      // Basic text parser fallback for links as scraper was removed
      return await this.openAiService.parseExpenseText("Analyze this link for an expense transaction: " + body.url, req.user.email);
    } catch (error) {
      return { error: 'Failed to process link', message: error.message };
    }
  }
}
