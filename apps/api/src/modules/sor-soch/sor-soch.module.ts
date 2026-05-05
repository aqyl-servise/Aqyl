import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SorSochDocument } from "../schools/entities/sor-soch-document.entity";
import { SorSochService } from "./sor-soch.service";
import { SorSochController } from "./sor-soch.controller";

@Module({
  imports: [TypeOrmModule.forFeature([SorSochDocument])],
  controllers: [SorSochController],
  providers: [SorSochService],
  exports: [SorSochService],
})
export class SorSochModule {}
