import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrialFingerprint } from './entities/trial-fingerprint.entity';
import { TrialGuardService } from './trial-guard.service';
import { AccountSignal } from './entities/account-signal.entity';
import { AccountSignalsService } from './account-signals.service';
import { Teacher } from '../teachers/entities/teacher.entity';

/** Защита пробного периода: необратимые отпечатки почты/телефона. */
@Module({
  imports: [TypeOrmModule.forFeature([TrialFingerprint, AccountSignal, Teacher])],
  providers: [TrialGuardService, AccountSignalsService],
  exports: [TrialGuardService, AccountSignalsService],
})
export class TrialGuardModule {}
