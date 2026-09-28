import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Teacher } from '../teachers/entities/teacher.entity';
import { MailModule } from '../mail/mail.module';
import { BillingModule } from '../billing/billing.module';
import { ShortLink } from './short-link.entity';
import { GrowthController } from './growth.controller';
import { GrowthAdminController } from './growth-admin.controller';
import { NudgeService } from './nudge.service';
import { OpsAlertService } from './ops-alert.service';

/** Воронка роста: источники, письма-подсказки, короткие ссылки, наблюдение за генерацией. */
@Module({
  imports: [TypeOrmModule.forFeature([Teacher, ShortLink]), MailModule, BillingModule],
  controllers: [GrowthController, GrowthAdminController],
  providers: [NudgeService, OpsAlertService],
})
export class GrowthModule {}
