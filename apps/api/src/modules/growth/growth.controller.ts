import { Controller, Get, NotFoundException, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Response } from 'express';
import { Repository } from 'typeorm';
import { Teacher } from '../teachers/entities/teacher.entity';
import { ShortLink } from './short-link.entity';
import { readUnsubscribeToken, SHORT_CODE_RE } from './growth-utils';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReferralService } from './referral.service';

/**
 * Публичные адреса воронки: раскрытие короткой ссылки и отписка от писем.
 * Без входа — по ним переходят из листовки и из письма.
 */
@Controller()
export class GrowthController {
  constructor(
    @InjectRepository(ShortLink) private readonly links: Repository<ShortLink>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    private readonly referrals: ReferralService,
  ) {}

  /** Страница «Пригласить коллегу»: код, условия и сколько уже получено. */
  @Get('referral/me')
  @UseGuards(JwtAuthGuard)
  myReferral(@Req() req: { user: { id: string } }) {
    return this.referrals.mine(req.user.id);
  }

  /**
   * Короткая ссылка → куда вести и с какими метками. Редирект делает веб
   * (/r/[code]), здесь только данные и счётчик.
   */
  @Get('r/:code')
  async resolve(@Param('code') code: string) {
    const c = String(code ?? '').toLowerCase();
    if (!SHORT_CODE_RE.test(c)) throw new NotFoundException();
    const link = await this.links.findOne({ where: { code: c } });
    if (!link) throw new NotFoundException();
    await this.links.increment({ code: c }, 'clicks', 1);
    const params: Record<string, string> = { utm_source: link.utmSource };
    if (link.utmMedium) params.utm_medium = link.utmMedium;
    if (link.utmCampaign) params.utm_campaign = link.utmCampaign;
    return { path: link.lang === 'kz' ? '/kz' : '/', params };
  }

  /**
   * Страница отписки. GET ничего не меняет — только спрашивает: почтовые
   * сканеры открывают ссылки из писем сами, и отписка по GET отписывала бы
   * людей без их ведома.
   */
  @Get('mail/unsubscribe')
  async unsubscribePage(@Query('t') t: string, @Res() res: Response) {
    const id = readUnsubscribeToken(t);
    const exists = id ? (await this.teachers.count({ where: { id } })) > 0 : false;
    if (!exists) return this.page(res, 400, BAD_LINK);
    const action = `?t=${encodeURIComponent(t)}`;
    return this.page(res, 200, `
<h1>Отписаться от писем-подсказок?</h1>
<p>Больше не будем присылать напоминания и советы. Квитанции об оплате и письма о доступе к аккаунту продолжат приходить.</p>
<p class="kz">Кеңестер мен ескертпелер бар хаттар бұдан былай келмейді. Төлем түбіртектері мен аккаунтқа қолжетімділік туралы хаттар келе береді.</p>
<form method="post" action="${action}"><button type="submit">Отписаться · Бас тарту</button></form>`);
  }

  /** Отписка. Сюда же приходит «отписаться в один клик» из интерфейса почты (RFC 8058). */
  @Post('mail/unsubscribe')
  async unsubscribe(@Query('t') t: string, @Res() res: Response) {
    const id = readUnsubscribeToken(t);
    if (!id) return this.page(res, 400, BAD_LINK);
    const r = await this.teachers.update({ id }, { emailNudgesOff: true });
    if (!r.affected) return this.page(res, 400, BAD_LINK);
    return this.page(res, 200, `
<h1>Готово, вы отписаны</h1>
<p>Писем-подсказок больше не будет. Квитанции и письма о доступе продолжат приходить.</p>
<p class="kz">Дайын, сіз бас тарттыңыз. Кеңес хаттары енді келмейді.</p>
<p><a href="/">aqyl-service.kz</a></p>`);
  }

  private page(res: Response, status: number, body: string) {
    res.status(status).type('html').send(`<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Aqyl</title>
<style>
body{margin:0;background:#f4f6f9;font-family:Arial,sans-serif;color:#1e293b}
main{max-width:480px;margin:48px auto;padding:28px;background:#fff;border-radius:12px}
h1{font-size:20px;margin:0 0 12px}p{line-height:1.6;margin:0 0 12px}.kz{color:#475569;font-size:14px}
button{background:#6f61d6;color:#fff;border:0;border-radius:8px;padding:12px 22px;font-size:15px;cursor:pointer}
a{color:#6f61d6}
</style></head><body><main>${body}</main></body></html>`);
  }
}

const BAD_LINK = `<h1>Ссылка недействительна</h1>
<p>Возможно, она повреждена при копировании. Откройте ссылку прямо из письма.</p>
<p class="kz">Сілтеме жарамсыз. Оны хаттың өзінен ашыңыз.</p>`;
