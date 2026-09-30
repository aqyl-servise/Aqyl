import {
  BadRequestException, Body, ConflictException, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';
import { DataSource, Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SkipSchoolIsolation } from '../../common/decorators/skip-school-isolation.decorator';
import { ShortLink } from './short-link.entity';
import { NudgeService } from './nudge.service';
import { ReferralService } from './referral.service';
import { acquisitionSource } from './growth-utils';

class CreateShortLinkDto {
  @Matches(/^[a-z0-9][a-z0-9-]{1,39}$/, { message: 'Код: латиница в нижнем регистре, цифры и дефис, 2–40 символов' })
  code!: string;

  @IsIn(['ru', 'kz'])
  lang!: 'ru' | 'kz';

  @IsString() @Length(1, 60) @Matches(/^[a-z0-9_-]+$/, { message: 'Источник: латиница, цифры, _ и -' })
  utmSource!: string;

  @IsOptional() @IsString() @Length(0, 60) @Matches(/^[a-z0-9_-]*$/, { message: 'Канал: латиница, цифры, _ и -' })
  utmMedium?: string;

  @IsOptional() @IsString() @Length(0, 80) @Matches(/^[a-z0-9_-]*$/, { message: 'Кампания: латиница, цифры, _ и -' })
  utmCampaign?: string;

  @IsOptional() @IsString() @Length(0, 200)
  note?: string;
}

class TestNudgeDto {
  @IsIn(['activation', 'trialEnd'])
  kind!: 'activation' | 'trialEnd';

  @IsIn(['ru', 'kz'])
  lang!: 'ru' | 'kz';

  @IsEmail({}, { message: 'Укажите адрес почты' })
  email!: string;
}

/**
 * Рост в админке: откуда приходят учителя, письма-подсказки, короткие ссылки.
 * Только администратор платформы.
 */
@Controller('admin/growth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@SkipSchoolIsolation()
export class GrowthAdminController {
  constructor(
    private readonly db: DataSource,
    private readonly nudges: NudgeService,
    private readonly referrals: ReferralService,
    @InjectRepository(ShortLink) private readonly links: Repository<ShortLink>,
  ) {}

  /**
   * Источники регистраций за период: сколько пришло, сколько сделали хотя бы
   * один готовый урок, сколько заплатили. Считается по teacher.acquisition —
   * до 25.09.2026 источник не записывался, такие учителя идут строкой
   * «не записан».
   */
  @Get('sources')
  async sources(@Query('days') daysRaw?: string) {
    const days = Math.max(0, Math.min(3650, Number(daysRaw ?? 30) || 0));
    const rows: Array<{ acquisition: Record<string, string> | null; activated: boolean; paid: boolean }> =
      await this.db.query(
        `SELECT t.acquisition,
                EXISTS (SELECT 1 FROM lessons l WHERE l."userId" = t.id::text AND l.status = 'ready') AS activated,
                EXISTS (SELECT 1 FROM payments p WHERE p."teacherId"::text = t.id::text AND p.status = 'paid') AS paid
         FROM teacher t
         WHERE t."registrationSource" = 'b2c' ${days ? `AND t."createdAt" > now() - make_interval(days => $1)` : ''}`,
        days ? [days] : [],
      );
    const bySource = new Map<string, { source: string; campaigns: Map<string, number>; registered: number; activated: number; paid: number }>();
    for (const r of rows) {
      const source = acquisitionSource(r.acquisition);
      const g = bySource.get(source) ?? { source, campaigns: new Map(), registered: 0, activated: 0, paid: 0 };
      g.registered++;
      if (r.activated) g.activated++;
      if (r.paid) g.paid++;
      const camp = r.acquisition?.utm_campaign;
      if (camp) g.campaigns.set(camp, (g.campaigns.get(camp) ?? 0) + 1);
      bySource.set(source, g);
    }
    return {
      days,
      total: rows.length,
      rows: [...bySource.values()]
        .map((g) => ({
          source: g.source, registered: g.registered, activated: g.activated, paid: g.paid,
          campaigns: [...g.campaigns.entries()].map(([campaign, n]) => ({ campaign, n })).sort((a, b) => b.n - a.n),
        }))
        .sort((a, b) => b.registered - a.registered),
    };
  }

  /** Сколько писем ждут отправки и сколько уже ушло. */
  @Get('nudges')
  async nudgeStats() {
    const [activationAuto, activationBacklog, trialEnd] = await Promise.all([
      this.nudges.candidates('activation', { maxAgeDays: 7 }),
      this.nudges.candidates('activation', { maxAgeDays: null }),
      this.nudges.candidates('trialEnd', {}),
    ]);
    const [sent] = await this.db.query(
      `SELECT count(*) FILTER (WHERE nudges ? 'activation')::int AS activation,
              count(*) FILTER (WHERE nudges ? 'trialEnd')::int AS "trialEnd",
              count(*) FILTER (WHERE "emailNudgesOff")::int AS unsubscribed
       FROM teacher WHERE "registrationSource" = 'b2c'`,
    );
    return {
      pending: {
        activationAuto: activationAuto.length,
        // Старые регистрации — те, кого утренняя рассылка не тронет.
        activationBacklog: activationBacklog.length - activationAuto.length,
        trialEnd: trialEnd.length,
      },
      sent,
      // Ход рассылки по кнопке: админка опрашивает, пока running.
      progress: this.nudges.getProgress(),
    };
  }

  /**
   * Тестовое письмо на указанный адрес — проверить, куда оно попадает
   * (входящие, «Промоакции», спам) в Gmail и Mail.ru. 29.09 из 88 писем
   * за сутки не было ни одного перехода, хотя SPF/DKIM/DMARC настроены.
   */
  @Post('nudges/test')
  async sendTest(@Body() dto: TestNudgeDto) {
    await this.nudges.sendTest(dto.kind, dto.lang, dto.email);
    return { ok: true };
  }

  @Get('nudges/preview')
  preview(@Query('kind') kind: string, @Query('lang') lang: string) {
    if (kind !== 'activation' && kind !== 'trialEnd') throw new BadRequestException('kind');
    return this.nudges.preview(kind, lang === 'kz' ? 'kz' : 'ru');
  }

  /**
   * Письмо «сделайте первый урок» всем, кто не начал, включая старые
   * регистрации. Не больше одной партии за вызов — см. BATCH_LIMIT.
   */
  @Post('nudges/activation')
  sendActivation() {
    try {
      return this.nudges.startBacklog();
    } catch (err) {
      throw new ConflictException((err as Error).message);
    }
  }

  /** Приглашения: итоги, спорные случаи на проверку, самые активные. */
  @Get('referrals')
  referralsOverview() {
    return this.referrals.adminOverview();
  }

  @Post('referrals/:inviteeId/approve')
  approveReferral(@Param('inviteeId', new ParseUUIDPipe()) inviteeId: string) {
    return this.referrals.adminApprove(inviteeId);
  }

  @Post('referrals/:inviteeId/decline')
  declineReferral(@Param('inviteeId', new ParseUUIDPipe()) inviteeId: string) {
    return this.referrals.adminDecline(inviteeId);
  }

  @Get('short-links')
  listLinks() {
    return this.links.find({ order: { createdAt: 'DESC' } });
  }

  @Post('short-links')
  async createLink(@Body() dto: CreateShortLinkDto) {
    if (await this.links.count({ where: { code: dto.code } })) {
      throw new ConflictException('Такой код уже есть');
    }
    return this.links.save(this.links.create({
      code: dto.code, lang: dto.lang, utmSource: dto.utmSource,
      utmMedium: dto.utmMedium || null, utmCampaign: dto.utmCampaign || null, note: dto.note || null,
    }));
  }

  @Delete('short-links/:code')
  async deleteLink(@Param('code') code: string) {
    await this.links.delete({ code });
    return { ok: true };
  }
}
