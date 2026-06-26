import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SkipSchoolIsolation } from '../../common/decorators/skip-school-isolation.decorator';
import { TextAdapterService } from './text-adapter.service';
import { AdaptTextDto } from './dto/adapt-text.dto';
import { SaveAdaptationDto } from './dto/save-adaptation.dto';
import { UpdateAdaptationDto } from './dto/update-adaptation.dto';

type AuthRequest = {
  user: { sub?: string; id?: string; schoolId?: string | null; role: string };
};

// B2C teachers have no school — skip school isolation. We derive schoolId
// solely from the authenticated user, never from the request body, so there
// is no cross-school risk.
@Controller('text-adapter')
@UseGuards(JwtAuthGuard, RolesGuard)
@SkipSchoolIsolation()
@Roles(
  'teacher',
  'class_teacher',
  'admin',
  'principal',
  'vice_principal',
  'vice_principal_academic',
  'vice_principal_education',
)
export class TextAdapterController {
  constructor(private readonly textAdapterService: TextAdapterService) {}

  private userId(req: AuthRequest): string {
    return (req.user.sub ?? req.user.id) as string;
  }

  private schoolId(req: AuthRequest): string | null {
    return req.user.schoolId ?? null;
  }

  // ── /extract-pdf, /adapt, /translate must precede /:id so they aren't captured ──

  @Post('extract-pdf')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new BadRequestException('Только PDF файлы'), false);
      },
    }),
  )
  async extractPdf(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Файл не получен');
    }
    return this.textAdapterService.extractPdf(file.buffer);
  }

  @Post('adapt')
  async adapt(@Body() dto: AdaptTextDto, @Req() req: AuthRequest) {
    return this.textAdapterService.adapt(dto, this.userId(req), this.schoolId(req));
  }

  @Post('translate')
  async translate(
    @Body()
    body: { result: Record<string, any>; fromLang: string; toLang: string },
    @Req() req: AuthRequest,
  ) {
    return this.textAdapterService.translate(
      body.result,
      body.fromLang,
      body.toLang,
      this.userId(req),
    );
  }

  @Post()
  async save(@Body() dto: SaveAdaptationDto, @Req() req: AuthRequest) {
    return this.textAdapterService.save(dto, this.userId(req), this.schoolId(req));
  }

  @Get()
  async findAll(@Req() req: AuthRequest) {
    return this.textAdapterService.findAll(this.userId(req));
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.textAdapterService.findOne(id, this.userId(req));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAdaptationDto,
    @Req() req: AuthRequest,
  ) {
    return this.textAdapterService.update(id, dto, this.userId(req));
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.textAdapterService.remove(id, this.userId(req));
  }
}
