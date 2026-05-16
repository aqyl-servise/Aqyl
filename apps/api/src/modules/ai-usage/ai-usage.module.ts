import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AiUsageController } from "./ai-usage.controller";
import { AiUsageService } from "./ai-usage.service";
import { AiUsageAlert, AiUsageDaily } from "./ai-usage.entity";
import { Teacher } from "../teachers/entities/teacher.entity";

@Module({
  imports: [TypeOrmModule.forFeature([AiUsageDaily, AiUsageAlert, Teacher])],
  controllers: [AiUsageController],
  providers: [AiUsageService],
  exports: [AiUsageService],
})
export class AiUsageModule {}
