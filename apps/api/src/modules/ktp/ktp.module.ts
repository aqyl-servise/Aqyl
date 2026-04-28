import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { KtpReview } from "../schools/entities/ktp-review.entity";
import { UploadedFile } from "../schools/entities/uploaded-file.entity";
import { KtpService } from "./ktp.service";
import { KtpController } from "./ktp.controller";

@Module({
  imports: [TypeOrmModule.forFeature([KtpReview, UploadedFile])],
  providers: [KtpService],
  controllers: [KtpController],
})
export class KtpModule {}
