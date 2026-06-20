import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MulterModule } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { UploadedFile } from "../schools/entities/uploaded-file.entity";
import { FileFolder } from "../schools/entities/file-folder.entity";
import { FilesController } from "./files.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([UploadedFile, FileFolder]),
    // Files are now streamed to S3-compatible object storage (StorageService),
    // so uploads are buffered in memory rather than written to local disk.
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [FilesController],
  exports: [TypeOrmModule],
})
export class FilesModule {}
