import { Controller, Post, Get, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { KmzhService } from './kmzh.service';
import { ALL_TEACHER_ROLES } from '../../common/roles.constants';
import { KmzhGenerateDto } from './dto/kmzh-generate.dto';
import { KmzhRegenerateDto } from './dto/kmzh-regenerate.dto';
import { KmzhSaveDto } from './dto/kmzh-save.dto';

@Controller('kmzh')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
export class KmzhController {
  constructor(private readonly kmzhService: KmzhService) {}

  @Post('generate')
  @Throttle({ medium: { limit: 10, ttl: 60_000 } })
  @Roles('teacher', 'class_teacher', 'principal', 'admin')
  async generate(@Body() dto: KmzhGenerateDto, @Req() req: { user: { id: string; sub?: string; schoolId: string; role: string } }) {
    return this.kmzhService.generate(dto, { userId: req.user.id ?? req.user.sub, schoolId: req.user.schoolId, role: req.user.role });
  }

  @Post('regenerate')
  @Throttle({ medium: { limit: 10, ttl: 60_000 } })
  @Roles('teacher', 'class_teacher', 'principal', 'admin')
  async regenerate(@Body() dto: KmzhRegenerateDto, @Req() req: { user: { id: string; sub?: string; schoolId: string; role: string } }) {
    return this.kmzhService.regenerate(
      dto.sessionId, dto.kmzhInput, { userId: req.user.id ?? req.user.sub, schoolId: req.user.schoolId, role: req.user.role }
    );
  }

  @Post('save')
  @Roles('teacher', 'class_teacher')
  async save(@Body() dto: KmzhSaveDto, @Req() req: { user: { id: string; sub?: string; schoolId: string } }) {
    return this.kmzhService.save(dto, req.user.id ?? req.user.sub, req.user.schoolId);
  }

  @Get('saved')
  @Roles('teacher', 'class_teacher')
  async getMySaved(@Req() req: { user: { id: string; sub?: string; schoolId: string } }) {
    return this.kmzhService.getMySaved(req.user.id ?? req.user.sub, req.user.schoolId);
  }

  @Get('values/:month')
  @Roles(...ALL_TEACHER_ROLES)
  async getValues(@Param('month') month: string, @Query('lang') lang: string) {
    const values = this.kmzhService.getValuesByMonth(month);
    if (!values) return null;
    return lang ? { value: values[lang] } : values;
  }
}
