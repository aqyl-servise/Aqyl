import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OpenLesson } from "../schools/entities/open-lesson.entity";
import { LessonAnalysis } from "../schools/entities/lesson-analysis.entity";
import { LessonsService } from "./lessons.service";
import { LessonsController } from "./lessons.controller";

@Module({
  imports: [TypeOrmModule.forFeature([OpenLesson, LessonAnalysis])],
  providers: [LessonsService],
  controllers: [LessonsController],
})
export class LessonsModule {}
