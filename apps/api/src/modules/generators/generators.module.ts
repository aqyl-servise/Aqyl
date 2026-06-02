import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GeneratedDocument } from "../schools/entities/generated-document.entity";
import { KmzhCacheModule } from "../kmzh-cache/kmzh-cache.module";
import { AiClientModule } from "../../services/ai-client.module";
import { AiUsageModule } from "../ai-usage/ai-usage.module";
import { AiService } from "./ai.service";
import { GeneratorsController } from "./generators.controller";
import { GeneratorsService } from "./generators.service";

@Module({
  imports: [TypeOrmModule.forFeature([GeneratedDocument]), KmzhCacheModule, AiClientModule, AiUsageModule],
  controllers: [GeneratorsController],
  providers: [AiService, GeneratorsService],
})
export class GeneratorsModule {}
