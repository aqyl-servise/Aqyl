import { BadRequestException, Body, Controller, Module, Post, Req, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SkipSchoolIsolation } from '../../common/decorators/skip-school-isolation.decorator';
import { CLIENT_EVENTS, FunnelEvent, FunnelService } from './funnel.service';

class TrackDto {
  @IsString()
  event!: string;
}

/** Клиентские события воронки — только из белого списка CLIENT_EVENTS. */
@Controller('events')
@UseGuards(JwtAuthGuard)
@SkipSchoolIsolation()
export class FunnelController {
  constructor(private readonly funnel: FunnelService) {}

  @Post()
  async track(@Body() dto: TrackDto, @Req() req: { user: { id: string } }) {
    if (!CLIENT_EVENTS.includes(dto.event as FunnelEvent)) throw new BadRequestException('Неизвестное событие');
    await this.funnel.record(req.user.id, dto.event as FunnelEvent);
    return { ok: true };
  }
}

/** Учёт шагов воронки активации, которых нет в других таблицах. */
@Module({
  controllers: [FunnelController],
  providers: [FunnelService],
  exports: [FunnelService],
})
export class FunnelModule {}
