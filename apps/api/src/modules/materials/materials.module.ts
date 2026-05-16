import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GeneratedPresentation } from "../schools/entities/generated-presentation.entity";
import { GeneratedIllustration } from "../schools/entities/generated-illustration.entity";
import { AiClientModule } from "../../services/ai-client.module";
import { MaterialsService } from "./materials.service";
import { MaterialsController } from "./materials.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([GeneratedPresentation, GeneratedIllustration]),
    AiClientModule,
  ],
  providers: [MaterialsService],
  controllers: [MaterialsController],
})
export class MaterialsModule {}
