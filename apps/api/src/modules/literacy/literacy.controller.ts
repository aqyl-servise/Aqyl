import {
  BadRequestException, Body, Controller, Delete, Get, Param, Post, Query, Req, Res,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { SkipSchoolIsolation } from '../../common/decorators/skip-school-isolation.decorator';
import { ALL_TEACHER_ROLES, ADMIN_ROLES } from '../../common/roles.constants';
import { LiteracyService } from './literacy.service';
import { CreateSetDto, SetStimulusDto } from './dto/literacy.dto';

type AuthRequest = { user: { id: string; sub?: string; schoolId: string | null; role: string } };
interface MulterFile { originalname: string; mimetype: string; size: number; buffer: Buffer }

const ALLOWED = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

// Функциональная грамотность (PISA). B2C-friendly: SkipSchoolIsolation, scoped by userId.
@SkipSchoolIsolation()
@Controller('literacy')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ALL_TEACHER_ROLES, ...ADMIN_ROLES)
export class LiteracyController {
  constructor(private readonly service: LiteracyService) {}

  private ctx(req: AuthRequest) {
    return { userId: req.user.id ?? req.user.sub!, schoolId: req.user.schoolId ?? null, role: req.user.role };
  }

  @Get('sets')
  list(@Req() req: AuthRequest) {
    return this.service.list(this.ctx(req));
  }

  @Post('sets')
  create(@Body() body: CreateSetDto, @Req() req: AuthRequest) {
    return this.service.createSet(this.ctx(req), body as never);
  }

  @Get('sets/:id')
  getOne(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.getOne(id, this.ctx(req));
  }

  @Post('sets/:id/stimulus')
  @UseGuards(SubscriptionGuard)
  setStimulus(@Param('id') id: string, @Body() body: SetStimulusDto, @Req() req: AuthRequest) {
    return this.service.setStimulus(id, this.ctx(req), body);
  }

  // Upload PDF / DOCX / TXT → extract text (no DB write).
  @Post('sets/:id/upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => cb(ALLOWED.has(file.mimetype) ? null : new BadRequestException(`Тип файла ${file.mimetype} не поддерживается`), ALLOWED.has(file.mimetype)),
  }))
  async upload(@UploadedFile() file: MulterFile): Promise<{ text: string }> {
    if (!file) throw new BadRequestException('Файл обязателен');
    const text = await extractText(file);
    if (!text || text.trim().length < 20) {
      throw new BadRequestException('В файле нет текстового слоя. Вставьте текст вручную.');
    }
    return { text: text.trim().slice(0, 15000) };
  }

  @Post('sets/:id/generate')
  @UseGuards(SubscriptionGuard)
  generate(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.startGeneration(id, this.ctx(req));
  }

  @Post('sets/:id/questions/:qid/regenerate')
  @UseGuards(SubscriptionGuard)
  regenerate(@Param('id') id: string, @Param('qid') qid: string, @Req() req: AuthRequest) {
    return this.service.regenerateQuestion(id, qid, this.ctx(req));
  }

  @Delete('sets/:id/questions/:qid')
  deleteQuestion(@Param('id') id: string, @Param('qid') qid: string, @Req() req: AuthRequest) {
    return this.service.deleteQuestion(id, qid, this.ctx(req));
  }

  // Export: mode=student (без ключей) | teacher (с ключами).
  @Get('sets/:id/export')
  async export(@Param('id') id: string, @Query('mode') mode: string, @Req() req: AuthRequest, @Res() res: Response) {
    const teacher = mode === 'teacher';
    const buf = await this.service.exportDocx(id, this.ctx(req), teacher ? 'teacher' : 'student');
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="literacy-${id}-${teacher ? 'teacher' : 'student'}.docx"`,
    });
    res.send(buf);
  }
}

async function extractText(file: MulterFile): Promise<string> {
  if (file.mimetype === 'text/plain') return file.buffer.toString('utf8');
  if (file.mimetype === 'application/pdf') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdf = require('pdf-parse') as (b: Buffer) => Promise<{ text: string }>;
    const data = await pdf(file.buffer);
    return data.text ?? '';
  }
  // DOCX
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require('mammoth') as { extractRawText(opts: { buffer: Buffer }): Promise<{ value: string }> };
  const out = await mammoth.extractRawText({ buffer: file.buffer });
  return out.value ?? '';
}
