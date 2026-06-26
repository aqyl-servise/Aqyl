import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisualizerController } from './visualizer.controller';
import { VisualizerService } from './visualizer.service';
import { Diagram } from './entities/diagram.entity';
import { AiClientModule } from '../../services/ai-client.module';

@Module({
  imports: [TypeOrmModule.forFeature([Diagram]), AiClientModule],
  controllers: [VisualizerController],
  providers: [VisualizerService],
})
export class VisualizerModule {}
