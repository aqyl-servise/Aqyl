import { Controller, Post, Get, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { KmzhService } from './kmzh.service';
import { KmzhGenerateDto } from './dto/kmzh-generate.dto';
import { KmzhRegenerateDto } from './dto/kmzh-regenerate.dto';
import { KmzhSaveDto } from './dto/kmzh-save.dto';

@Controller('kmzh')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KmzhController {
  constructor(private readonly kmzhService: KmzhService) {}

  @Post('generate')
  @Roles('teacher', 'class_teacher', 'principal', 'admin')
  async generate(@Body() dto: KmzhGenerateDto, @Req() req: { user: { sub: string; schoolId: string } }) {
    return this.kmzhService.generate(dto, req.user.sub, req.user.schoolId);
  }

  @Post('regenerate')
  @Roles('teacher', 'class_teacher', 'principal', 'admin')
  async regenerate(@Body() dto: KmzhRegenerateDto, @Req() req: { user: { sub: string; schoolId: string } }) {
    return this.kmzhService.regenerate(
      dto.sessionId, dto.kmzhInput, req.user.sub, req.user.schoolId
    );
  }

  @Post('save')
  @Roles('teacher', 'class_teacher')
  async save(@Body() dto: KmzhSaveDto, @Req() req: { user: { sub: string; schoolId: string } }) {
    return this.kmzhService.save(dto, req.user.sub, req.user.schoolId);
  }

  @Get('saved')
  @Roles('teacher', 'class_teacher')
  async getMySaved(@Req() req: { user: { sub: string; schoolId: string } }) {
    return this.kmzhService.getMySaved(req.user.sub, req.user.schoolId);
  }

  @Get('values/:month')
  async getValues(@Param('month') month: string, @Query('lang') lang: string) {
    const values = this.kmzhService.getValuesByMonth(month);
    if (!values) return null;
    return lang ? { value: values[lang] } : values;
  }
}
