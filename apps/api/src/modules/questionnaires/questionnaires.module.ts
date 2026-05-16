import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Questionnaire } from "../schools/entities/questionnaire.entity";
import { QuestionnaireResponse } from "../schools/entities/questionnaire-response.entity";
import { QuestionnairesController } from "./questionnaires.controller";
import { QuestionnairesService } from "./questionnaires.service";
import { AiClientModule } from "../../services/ai-client.module";

@Module({
  imports: [TypeOrmModule.forFeature([Questionnaire, QuestionnaireResponse]), AiClientModule],
  controllers: [QuestionnairesController],
  providers: [QuestionnairesService],
  exports: [QuestionnairesService],
})
export class QuestionnairesModule {}
