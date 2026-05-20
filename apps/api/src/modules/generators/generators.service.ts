import { Injectable, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GeneratedDocument } from "../schools/entities/generated-document.entity";
import { KmzhCacheService } from "../kmzh-cache/kmzh-cache.service";
import { GenerateLessonPlanDto } from "./dto/generate-lesson-plan.dto";
import { GenerateTaskSetDto } from "./dto/generate-task-set.dto";
import { AiService } from "./ai.service";
import { TokenService } from "../tokens/token.service";

@Injectable()
export class GeneratorsService {
  constructor(
    private readonly aiService: AiService,
    @InjectRepository(GeneratedDocument)
    private readonly generatedDocumentRepository: Repository<GeneratedDocument>,
    @Optional() private readonly kmzhCacheService?: KmzhCacheService,
    @Optional() private readonly tokenService?: TokenService,
  ) {}

  async generateLessonPlan(teacherId: string, schoolId: string | undefined, input: GenerateLessonPlanDto) {
    let payload: Record<string, unknown>;
    let fromCache = false;
    let useCount: number | undefined;
    const userCtx = { schoolId, userId: teacherId };

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
          () => this.aiService.generateLessonPlan(input, userCtx),
        );
        payload = result.content;
        fromCache = result.fromCache;
        useCount = result.useCount;
        if (fromCache) {
          this.tokenService?.deductTokens({
            schoolId, userId: teacherId,
            inputTokens: 0, outputTokens: 0,
            actionType: "kmzh_generate", model: "cache", fromCache: true,
          }).catch(() => {});
        }
      } catch {
        payload = await this.aiService.generateLessonPlan(input, userCtx);
      }
    } else {
      payload = await this.aiService.generateLessonPlan(input, userCtx);
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

  async generateTaskSet(teacherId: string, input: GenerateTaskSetDto, schoolId?: string) {
    const payload = await this.aiService.generateTaskSet(input, { schoolId, userId: teacherId });
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
