import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Classroom } from "../schools/entities/classroom.entity";
import { GeneratedDocument } from "../schools/entities/generated-document.entity";
import { Submission } from "../schools/entities/submission.entity";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Classroom, Submission, GeneratedDocument]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
