import { Injectable, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GeneratedDocument } from "../schools/entities/generated-document.entity";
import { KmzhCacheService } from "../kmzh-cache/kmzh-cache.service";
import { GenerateLessonPlanDto } from "./dto/generate-lesson-plan.dto";
import { GenerateTaskSetDto } from "./dto/generate-task-set.dto";
import { AiService } from "./ai.service";

@Injectable()
export class GeneratorsService {
  constructor(
    private readonly aiService: AiService,
    @InjectRepository(GeneratedDocument)
    private readonly generatedDocumentRepository: Repository<GeneratedDocument>,
    @Optional() private readonly kmzhCacheService?: KmzhCacheService,
  ) {}

  async generateLessonPlan(teacherId: string, schoolId: string | undefined, input: GenerateLessonPlanDto) {
    let payload: Record<string, unknown>;
    let fromCache = false;
    let useCount: number | undefined;

    if (this.kmzhCacheService) {
      try {
        const result = await this.kmzhCacheService.findOrGenerate(
          {
            subject: input.subject,
            classNumber: input.grade,
            topic: input.topic,
            language: input.language || "ru",
            userId: teacherId,
            schoolId,
            bypassCache: input.bypassCache ?? false,
          },
          () => this.aiService.generateLessonPlan(input),
        );
        payload = result.content;
        fromCache = result.fromCache;
        useCount = result.useCount;
      } catch {
        payload = await this.aiService.generateLessonPlan(input);
      }
    } else {
      payload = await this.aiService.generateLessonPlan(input);
    }

    const document = this.generatedDocumentRepository.create({
      teacher: { id: teacherId },
      type: "lesson-plan",
      title: String(payload.title ?? "КМЖ"),
      language: input.language,
      payload,
    });
    await this.generatedDocumentRepository.save(document);

    return {
      id: document.id,
      ...payload,
      fromCache,
      ...(useCount !== undefined ? { useCount } : {}),
    };
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
