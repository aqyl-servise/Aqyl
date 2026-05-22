import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Schedule } from "../schools/entities/schedule.entity";
import { Classroom } from "../schools/entities/classroom.entity";
import { ScheduleVersion } from "../schools/entities/schedule-version.entity";
import { ScheduleService } from "./schedule.service";
import { ScheduleController } from "./schedule.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Schedule, Classroom, ScheduleVersion])],
  providers: [ScheduleService],
  controllers: [ScheduleController],
  exports: [ScheduleService],
})
export class ScheduleModule {}
