import { Controller, Get, Post, Body, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MalimetService } from './malimet.service';
import { MalimetGenerateDto } from './dto/malimet-generate.dto';
import { MalimetSaveDto } from './dto/malimet-save.dto';

@Controller('malimet')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MalimetController {
  constructor(private readonly service: MalimetService) {}

  @Get('prefill')
  @Roles('class_teacher')
  async prefill(@Query('quarter') _quarter: string, @Req() req: { user: { sub: string; schoolId: string; managedClassroomId: string } }) {
    return this.service.prefill(req.user.managedClassroomId, req.user.sub, req.user.schoolId);
  }

  @Post('generate')
  @Roles('class_teacher')
  async generate(
    @Body() dto: MalimetGenerateDto,
    @Req() req: { user: { sub: string; schoolId: string } },
    @Res() res: Response,
  ) {
    const buffer = await this.service.generate(dto, req.user.sub, req.user.schoolId);
    const className = dto.formData.classroomName.replace(/\s/g, '');
    const ext = dto.format === 'pdf' ? 'pdf' : 'docx';
    const filename = `malimet_${className}_Q${dto.formData.quarter}.${ext}`;

    if (dto.format === 'pdf') {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
    } else {
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
    }
    res.send(buffer);
  }

  @Post('save')
  @Roles('class_teacher')
  async save(
    @Body() dto: MalimetSaveDto,
    @Req() req: { user: { sub: string; schoolId: string } },
  ) {
    return this.service.save(dto, req.user.sub, req.user.schoolId);
  }

  @Get('list')
  @Roles('class_teacher', 'vice_principal', 'vice_principal_academic', 'principal', 'admin')
  async list(
    @Query('classroomId') classroomId: string,
    @Req() req: { user: { schoolId: string; managedClassroomId?: string } },
  ) {
    const id = classroomId || req.user.managedClassroomId || '';
    return this.service.list(id, req.user.schoolId);
  }
}
