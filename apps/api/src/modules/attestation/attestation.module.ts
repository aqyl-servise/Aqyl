import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TeacherAttestation } from "../schools/entities/teacher-attestation.entity";
import { Teacher } from "../teachers/entities/teacher.entity";
import { AttestationService } from "./attestation.service";
import { AttestationController } from "./attestation.controller";

@Module({
  imports: [TypeOrmModule.forFeature([TeacherAttestation, Teacher])],
  providers: [AttestationService],
  controllers: [AttestationController],
})
export class AttestationModule {}
