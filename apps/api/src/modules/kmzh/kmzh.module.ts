import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KmzhController } from './kmzh.controller';
import { KmzhService } from './kmzh.service';
import { KmzhCacheService } from './kmzh.cache.service';
import { KmzhSessionService } from './kmzh.session.service';
import { KmzhStageCache } from './entities/kmzh-stage-cache.entity';
import { KmzhGenerationSession } from './entities/kmzh-generation-session.entity';
import { KmzhSaved } from './entities/kmzh-saved.entity';
import { AiClientModule } from '../../services/ai-client.module';
import { AiUsageModule } from '../ai-usage/ai-usage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([KmzhStageCache, KmzhGenerationSession, KmzhSaved]),
    AiClientModule,
    AiUsageModule,
  ],
  controllers: [KmzhController],
  providers: [KmzhService, KmzhCacheService, KmzhSessionService],
})
export class KmzhModule {}
