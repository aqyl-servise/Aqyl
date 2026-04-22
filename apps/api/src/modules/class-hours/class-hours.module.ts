import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ClassHour } from "../schools/entities/class-hour.entity";
import { ClassHoursService } from "./class-hours.service";
import { ClassHoursController } from "./class-hours.controller";

@Module({
  imports: [TypeOrmModule.forFeature([ClassHour])],
  providers: [ClassHoursService],
  controllers: [ClassHoursController],
})
export class ClassHoursModule {}
