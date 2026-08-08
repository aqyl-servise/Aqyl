import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiUsageDaily } from '../modules/ai-usage/ai-usage.entity';
import { AiClientService } from './ai-client.service';
import { AiUsageRecorder } from './ai-usage-recorder.service';

@Module({
  imports: [TypeOrmModule.forFeature([AiUsageDaily])],
  providers: [AiClientService, AiUsageRecorder],
  exports: [AiClientService],
})
export class AiClientModule {}
