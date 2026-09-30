import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Lesson } from '../lesson-plans/entities/lesson.entity';
import { LessonPlansModule } from '../lesson-plans/lesson-plans.module';
import { LessonExample } from './lesson-example.entity';
import { LibraryService } from './library.service';
import { LibraryAdminController, LibraryPublicController } from './library.controller';

/** Публичная библиотека примеров планов уроков (для поиска). */
@Module({
  imports: [TypeOrmModule.forFeature([LessonExample, Teacher, Lesson]), LessonPlansModule],
  controllers: [LibraryPublicController, LibraryAdminController],
  providers: [LibraryService],
})
export class LibraryModule {}
