import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GeneratedDocument } from "../schools/entities/generated-document.entity";
import { AiService } from "./ai.service";
import { GeneratorsController } from "./generators.controller";
import { GeneratorsService } from "./generators.service";

@Module({
  imports: [TypeOrmModule.forFeature([GeneratedDocument])],
  controllers: [GeneratorsController],
  providers: [AiService, GeneratorsService],
})
export class GeneratorsModule {}
