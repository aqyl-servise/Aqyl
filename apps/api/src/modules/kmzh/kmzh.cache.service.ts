import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { KmzhStageCache } from './entities/kmzh-stage-cache.entity';
import { CURRENT_PROMPT_VERSION } from './constants/prompt-version.constants';
import { KmzhGenerateDto } from './dto/kmzh-generate.dto';

@Injectable()
export class KmzhStageCacheService {
  private readonly logger = new Logger(KmzhStageCacheService.name);

  constructor(
    @InjectRepository(KmzhStageCache)
    private readonly cacheRepo: Repository<KmzhStageCache>,
  ) {}

  buildCacheKey(input: KmzhGenerateDto): string {
    const normalized = {
      lang: input.lang,
      subject: input.lessonTitle.toLowerCase().trim(),
      grade: input.grade,
      topic: input.unitTopic
        .toLowerCase()
        .trim()
        .replace(/[^a-zа-яёәіңғүұқөһ0-9\s]/gi, '')
        .replace(/\s+/g, ' '),
      objectives: input.learningObjectives.toLowerCase().trim().slice(0, 100),
    };
    const str = JSON.stringify(normalized);
    return 'kmzh:stages:' + crypto.createHash('sha256').update(str).digest('hex');
  }

  async getCached(input: KmzhGenerateDto): Promise<any | null> {
    const key = this.buildCacheKey(input);
    const cached = await this.cacheRepo.findOne({ where: { cacheKey: key } });
    if (!cached || cached.promptVersion !== CURRENT_PROMPT_VERSION) {
      return null;
    }
    await this.cacheRepo.update(cached.id, {
      useCount: cached.useCount + 1,
      lastUsedAt: new Date(),
    });
    this.logger.log('Cache HIT for key: ' + key);
    return JSON.parse(cached.stagesJson);
  }

  async saveCache(input: KmzhGenerateDto, stages: any): Promise<void> {
    const key = this.buildCacheKey(input);
    const existing = await this.cacheRepo.findOne({ where: { cacheKey: key } });
    if (existing) {
      await this.cacheRepo.update(existing.id, {
        stagesJson: JSON.stringify(stages),
        promptVersion: CURRENT_PROMPT_VERSION,
        useCount: existing.useCount + 1,
        lastUsedAt: new Date(),
      });
    } else {
      await this.cacheRepo.save({
        cacheKey: key,
        lang: input.lang,
        subject: input.lessonTitle,
        grade: input.grade,
        stagesJson: JSON.stringify(stages),
        promptVersion: CURRENT_PROMPT_VERSION,
      });
    }
    this.logger.log('Cache SAVED for key: ' + key);
  }
}
