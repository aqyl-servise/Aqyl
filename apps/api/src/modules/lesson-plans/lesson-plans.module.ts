import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lesson } from './entities/lesson.entity';
import { LessonStage } from './entities/lesson-stage.entity';
import { Descriptor } from './entities/descriptor.entity';
import { ToolCatalog } from './entities/tool-catalog.entity';
import { ValueLinkReference } from './entities/value-link-reference.entity';
import { LessonsSeedService } from './lesson-plans.seed.service';
import { LessonPlansService } from './lesson-plans.service';
import { LessonPlansController } from './lesson-plans.controller';
import { AiClientModule } from '../../services/ai-client.module';

// КСП (short-term lesson plan) generator — Срез 1.
// Named `lesson-plans` to avoid the existing `lessons` module (open-lesson analysis).
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lesson,
      LessonStage,
      Descriptor,
      ToolCatalog,
      ValueLinkReference,
    ]),
    AiClientModule,
  ],
  controllers: [LessonPlansController],
  providers: [LessonsSeedService, LessonPlansService],
  exports: [LessonPlansService],
})
export class LessonPlansModule {}
