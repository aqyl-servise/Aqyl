import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OpenLesson } from "../schools/entities/open-lesson.entity";
import { LessonsService } from "./lessons.service";
import { LessonsController } from "./lessons.controller";

@Module({
  imports: [TypeOrmModule.forFeature([OpenLesson])],
  providers: [LessonsService],
  controllers: [LessonsController],
})
export class LessonsModule {}
