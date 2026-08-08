import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TrialGuardModule } from '../trial-guard/trial-guard.module';
import { RetentionService } from './retention.service';

/** Регламентная очистка данных с истёкшим сроком хранения. */
@Module({
  imports: [AuthModule, TrialGuardModule],
  providers: [RetentionService],
  exports: [RetentionService],
})
export class RetentionModule {}
