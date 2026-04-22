import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MulterModule } from "@nestjs/platform-express";
import { UploadedFile } from "../schools/entities/uploaded-file.entity";
import { FilesController } from "./files.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([UploadedFile]),
    MulterModule.register({ dest: "./uploads" }),
  ],
  controllers: [FilesController],
})
export class FilesModule {}
