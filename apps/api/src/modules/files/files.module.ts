import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MulterModule } from "@nestjs/platform-express";
import { UploadedFile } from "../schools/entities/uploaded-file.entity";
import { FileFolder } from "../schools/entities/file-folder.entity";
import { FilesController } from "./files.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([UploadedFile, FileFolder]),
    // TODO: MIGRATE_TO_S3 — local disk ("./uploads") does not survive horizontal scaling
    // (multiple PM2 instances / multiple VPS) and has no redundancy. Move to S3-compatible
    // object storage (e.g. AWS S3 / Cloudflare R2 / MinIO) before scaling out.
    MulterModule.register({ dest: "./uploads" }),
  ],
  controllers: [FilesController],
  exports: [TypeOrmModule],
})
export class FilesModule {}
