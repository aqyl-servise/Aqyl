import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiteracySet } from './entities/literacy-set.entity';
import { LiteracyQuestion } from './entities/literacy-question.entity';
import { LiteracyService } from './literacy.service';
import { LiteracyGeneratorService } from './literacy-generator.service';
import { LiteracyController } from './literacy.controller';
import { AiClientModule } from '../../services/ai-client.module';

// Функциональная грамотность (PISA) — Срез 2. Base path `/literacy`.
@Module({
  imports: [TypeOrmModule.forFeature([LiteracySet, LiteracyQuestion]), AiClientModule],
  controllers: [LiteracyController],
  providers: [LiteracyService, LiteracyGeneratorService],
  // Export the generator so the lesson generator can reuse it (next срез).
  exports: [LiteracyService, LiteracyGeneratorService],
})
export class LiteracyModule {}
