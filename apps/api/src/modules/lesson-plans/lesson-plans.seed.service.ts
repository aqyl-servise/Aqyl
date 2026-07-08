import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ToolCatalog } from './entities/tool-catalog.entity';
import { ValueLinkReference } from './entities/value-link-reference.entity';
import { TOOL_CATALOG_SEED } from './seed/tool-catalog.seed';
import { VALUE_LINK_SEED } from './seed/value-link.seed';

// Idempotently seeds the reference tables on boot (save by PK overwrites).
@Injectable()
export class LessonsSeedService implements OnModuleInit {
  private readonly logger = new Logger(LessonsSeedService.name);

  constructor(
    @InjectRepository(ToolCatalog) private readonly toolRepo: Repository<ToolCatalog>,
    @InjectRepository(ValueLinkReference) private readonly valueRepo: Repository<ValueLinkReference>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.toolRepo.save(TOOL_CATALOG_SEED);
      await this.valueRepo.save(VALUE_LINK_SEED);
      this.logger.log(
        `Seeded ${TOOL_CATALOG_SEED.length} tools, ${VALUE_LINK_SEED.length} value links`,
      );
    } catch (err) {
      // Don't crash the app if the tables don't exist yet (first boot before sync).
      this.logger.warn(`Lessons seed skipped: ${(err as Error).message}`);
    }
  }
}
