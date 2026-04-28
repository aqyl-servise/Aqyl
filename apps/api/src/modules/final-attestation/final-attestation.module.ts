import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FinalAttestationStudent } from "../schools/entities/final-attestation-student.entity";
import { FinalAttestationService } from "./final-attestation.service";
import { FinalAttestationController } from "./final-attestation.controller";

@Module({
  imports: [TypeOrmModule.forFeature([FinalAttestationStudent])],
  providers: [FinalAttestationService],
  controllers: [FinalAttestationController],
})
export class FinalAttestationModule {}
