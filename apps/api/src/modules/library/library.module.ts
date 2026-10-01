import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Lesson } from '../lesson-plans/entities/lesson.entity';
import { LessonPlansModule } from '../lesson-plans/lesson-plans.module';
import { GrowthModule } from '../growth/growth.module';
import { FunnelModule } from '../funnel/funnel.module';
import { LessonExample } from './lesson-example.entity';
import { LibraryService } from './library.service';
import { LibraryAdminController, LibraryPublicController, ShareController } from './library.controller';
import { ShareService } from './share.service';

/** Публичная библиотека примеров планов уроков (для поиска) и ссылки «Поделиться уроком». */
@Module({
  imports: [TypeOrmModule.forFeature([LessonExample, Teacher, Lesson]), LessonPlansModule, GrowthModule, FunnelModule],
  controllers: [LibraryPublicController, LibraryAdminController, ShareController],
  providers: [LibraryService, ShareService],
})
export class LibraryModule {}
