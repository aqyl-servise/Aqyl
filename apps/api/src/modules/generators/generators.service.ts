import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GeneratedDocument } from "../schools/entities/generated-document.entity";
import { GenerateLessonPlanDto } from "./dto/generate-lesson-plan.dto";
import { GenerateTaskSetDto } from "./dto/generate-task-set.dto";
import { AiService } from "./ai.service";

@Injectable()
export class GeneratorsService {
  constructor(
    private readonly aiService: AiService,
    @InjectRepository(GeneratedDocument)
    private readonly generatedDocumentRepository: Repository<GeneratedDocument>,
  ) {}

  async generateLessonPlan(teacherId: string, input: GenerateLessonPlanDto) {
    const payload = await this.aiService.generateLessonPlan(input);
    const document = this.generatedDocumentRepository.create({
      teacher: { id: teacherId },
      type: "lesson-plan",
      title: payload.title,
      language: input.language,
      payload,
    });
    await this.generatedDocumentRepository.save(document);
    return { id: document.id, ...payload };
  }

  async generateTaskSet(teacherId: string, input: GenerateTaskSetDto) {
    const payload = await this.aiService.generateTaskSet(input);
    const document = this.generatedDocumentRepository.create({
      teacher: { id: teacherId },
      type: "task-set",
      title: payload.title,
      language: input.language,
      payload,
    });
    await this.generatedDocumentRepository.save(document);
    return { id: document.id, ...payload };
  }
}
