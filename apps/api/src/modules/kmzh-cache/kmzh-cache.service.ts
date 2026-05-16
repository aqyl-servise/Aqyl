import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThanOrEqual, Repository } from "typeorm";
import * as crypto from "crypto";
import { KmzhCache } from "./entities/kmzh-cache.entity";
import { KmzhCacheHit } from "./entities/kmzh-cache-hit.entity";
import { PROMPT_VERSIONS } from "../../config/prompt-versions";

const CURRENT_PROMPT_VERSION = PROMPT_VERSIONS.kmzh;

export interface FindOrGenerateParams {
  subject: string;
  classNumber: number;
  topic: string;
  language: string;
  userId: string;
  schoolId?: string;
  bypassCache?: boolean;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  tokensSaved: number;
  mostUsed: Array<{ subject: string; classNumber: number; topic: string; useCount: number }>;
}

@Injectable()
export class KmzhCacheService {
  constructor(
    @InjectRepository(KmzhCache)
    private readonly cacheRepo: Repository<KmzhCache>,
    @InjectRepository(KmzhCacheHit)
    private readonly hitRepo: Repository<KmzhCacheHit>,
  ) {}

  normalizeTopic(topic: string): string {
    return topic
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[.,!?;:]/g, "");
  }

  generateCacheKey(subject: string, classNumber: number, topic: string, language: string): string {
    const normalized = `${subject.toLowerCase()}|${classNumber}|${this.normalizeTopic(topic)}|${language}|${CURRENT_PROMPT_VERSION}`;
    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  async findOrGenerate(
    params: FindOrGenerateParams,
    generateFn: () => Promise<Record<string, unknown>>,
  ): Promise<{ content: Record<string, unknown>; fromCache: boolean; useCount: number }> {
    const { subject, classNumber, topic, language, userId, schoolId, bypassCache } = params;
    const cacheKey = this.generateCacheKey(subject, classNumber, topic, language);
    const topicNormalized = this.normalizeTopic(topic);
    const schoolRef = schoolId ? { id: schoolId } : null;

    if (bypassCache !== true) {
      const cached = await this.cacheRepo.findOne({
        where: { cacheKey, promptVersion: CURRENT_PROMPT_VERSION },
      });

      if (cached) {
        const newCount = cached.useCount + 1;
        await this.cacheRepo.update(cached.id, { useCount: newCount, lastUsedAt: new Date() });
        await this.hitRepo.save(
          this.hitRepo.create({ cache: cached, userId, school: schoolRef, hitType: "hit" }),
        );
        return { content: JSON.parse(cached.content), fromCache: true, useCount: newCount };
      }
    }

    const payload = await generateFn();
    const contentJson = JSON.stringify(payload);

    const existing = await this.cacheRepo.findOne({ where: { cacheKey } });
    let savedEntry: KmzhCache;

    if (existing) {
      await this.cacheRepo.update(existing.id, {
        content: contentJson,
        promptVersion: CURRENT_PROMPT_VERSION,
        lastUsedAt: new Date(),
      });
      savedEntry = { ...existing, content: contentJson };
    } else {
      savedEntry = await this.cacheRepo.save(
        this.cacheRepo.create({
          cacheKey,
          subject,
          classNumber,
          topic,
          topicNormalized,
          language,
          content: contentJson,
          promptVersion: CURRENT_PROMPT_VERSION,
          useCount: 1,
          lastUsedAt: new Date(),
        }),
      );
    }

    await this.hitRepo.save(
      this.hitRepo.create({ cache: savedEntry, userId, school: schoolRef, hitType: "miss" }),
    );

    return { content: payload, fromCache: false, useCount: 1 };
  }

  async getCacheStats(_schoolId?: string): Promise<CacheStats> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalEntries, recentHits, recentMisses, useSumResult] = await Promise.all([
      this.cacheRepo.count(),
      this.hitRepo.count({ where: { hitType: "hit", createdAt: MoreThanOrEqual(thirtyDaysAgo) } }),
      this.hitRepo.count({ where: { hitType: "miss", createdAt: MoreThanOrEqual(thirtyDaysAgo) } }),
      this.cacheRepo
        .createQueryBuilder("c")
        .select("SUM(c.useCount)", "total")
        .getRawOne<{ total: string }>(),
    ]);

    const total = recentHits + recentMisses;
    const hitRate = total > 0 ? Math.round((recentHits / total) * 100) : 0;
    const totalUseCount = Number(useSumResult?.total ?? 0);
    const tokensSaved = Math.max(0, (totalUseCount - totalEntries) * 2000);

    const mostUsed = await this.cacheRepo.find({
      select: ["subject", "classNumber", "topic", "useCount"],
      order: { useCount: "DESC" },
      take: 5,
    });

    return { totalEntries, hitRate, tokensSaved, mostUsed };
  }

  async clearCache(subject?: string, classNumber?: number): Promise<void> {
    if (!subject && classNumber === undefined) {
      await this.cacheRepo.clear();
      return;
    }
    const where: { subject?: string; classNumber?: number } = {};
    if (subject) where.subject = subject;
    if (classNumber !== undefined) where.classNumber = classNumber;
    await this.cacheRepo.delete(where);
  }
}
