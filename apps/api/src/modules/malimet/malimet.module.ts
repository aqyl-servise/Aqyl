import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MalimetController } from './malimet.controller';
import { MalimetService } from './malimet.service';
import { MalimetDocument } from './entities/malimet-document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MalimetDocument])],
  controllers: [MalimetController],
  providers: [MalimetService],
})
export class MalimetModule {}
