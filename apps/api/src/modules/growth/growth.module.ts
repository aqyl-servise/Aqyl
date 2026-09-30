import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Teacher } from '../teachers/entities/teacher.entity';
import { MailModule } from '../mail/mail.module';
import { BillingModule } from '../billing/billing.module';
import { FunnelModule } from '../funnel/funnel.module';
import { ShortLink } from './short-link.entity';
import { Referral } from './referral.entity';
import { ReferralService } from './referral.service';
import { GrowthController } from './growth.controller';
import { GrowthAdminController } from './growth-admin.controller';
import { NudgeService } from './nudge.service';
import { OpsAlertService } from './ops-alert.service';

/** Воронка роста: источники, письма-подсказки, короткие ссылки, приглашения коллег, наблюдение за генерацией. */
@Module({
  imports: [TypeOrmModule.forFeature([Teacher, ShortLink, Referral]), MailModule, BillingModule, FunnelModule],
  controllers: [GrowthController, GrowthAdminController],
  providers: [NudgeService, OpsAlertService, ReferralService],
})
export class GrowthModule {}
