import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TextAdapterController } from './text-adapter.controller';
import { TextAdapterService } from './text-adapter.service';
import { Adaptation } from './entities/adaptation.entity';
import { AiClientModule } from '../../services/ai-client.module';

@Module({
  imports: [TypeOrmModule.forFeature([Adaptation]), AiClientModule],
  controllers: [TextAdapterController],
  providers: [TextAdapterService],
})
export class TextAdapterModule {}
