import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrialFingerprint } from './entities/trial-fingerprint.entity';
import { TrialGuardService } from './trial-guard.service';

/** Защита пробного периода: необратимые отпечатки почты/телефона. */
@Module({
  imports: [TypeOrmModule.forFeature([TrialFingerprint])],
  providers: [TrialGuardService],
  exports: [TrialGuardService],
})
export class TrialGuardModule {}
