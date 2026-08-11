import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lesson } from './entities/lesson.entity';
import { LessonStage } from './entities/lesson-stage.entity';
import { Descriptor } from './entities/descriptor.entity';
import { ToolCatalog } from './entities/tool-catalog.entity';
import { ValueLinkReference } from './entities/value-link-reference.entity';
import { Handout } from './entities/handout.entity';
import { HandoutPackage } from './entities/handout-package.entity';
import { GenerationCostLog } from './entities/generation-cost-log.entity';
import { LessonsSeedService } from './lesson-plans.seed.service';
import { LessonPlansService } from './lesson-plans.service';
import { LessonPlansController } from './lesson-plans.controller';
import { HandoutsService } from './handouts/handouts.service';
import { CostLoggerService } from './handouts/cost-logger.service';
import { AiClientModule } from '../../services/ai-client.module';
import { BillingModule } from '../billing/billing.module';

// КСП (short-term lesson plan) generator — Срез 1 + раздаточные материалы (Срез 2).
// Named `lesson-plans` to avoid the existing `lessons` module (open-lesson analysis).
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lesson,
      LessonStage,
      Descriptor,
      ToolCatalog,
      ValueLinkReference,
      Handout,
      HandoutPackage,
      GenerationCostLog,
    ]),
    AiClientModule,
    BillingModule,
  ],
  controllers: [LessonPlansController],
  providers: [LessonsSeedService, LessonPlansService, HandoutsService, CostLoggerService],
  exports: [LessonPlansService, HandoutsService],
})
export class LessonPlansModule {}
