import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createS3Client } from "../../config/s3.config";
import * as crypto from "crypto";
import * as path from "path";

// TODO: RUN_MIGRATION_SCRIPT — после настройки S3 на VPS один раз запустить
// apps/api/scripts/migrate-to-s3.ts, чтобы перенести существующие файлы с диска в бакет.
@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly logger = new Logger(StorageService.name);
  private readonly cdnUrl: string;

  constructor(private config: ConfigService) {
    this.s3 = createS3Client(config);
    this.bucket = config.get<string>("S3_BUCKET", "");
    this.cdnUrl = config.get<string>("S3_CDN_URL", ""); // опционально: CDN поверх S3
  }

  // Генерация уникального ключа для файла
  generateKey(folder: string, originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const hash = crypto.randomBytes(16).toString("hex");
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    return `${folder}/${date}/${hash}${ext}`;
  }

  // Загрузка файла из Buffer
  async uploadBuffer(
    buffer: Buffer,
    key: string,
    mimeType: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: metadata,
      }),
    );
    return this.getPublicUrl(key);
  }

  // Загрузка файла из multer (Express.Multer.File)
  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ key: string; url: string }> {
    const key = this.generateKey(folder, file.originalname);
    const url = await this.uploadBuffer(file.buffer, key, file.mimetype, {
      uploadedAt: new Date().toISOString(),
    });
    this.logger.log(`Uploaded file: ${key}`);
    return { key, url };
  }

  // Загрузка из локального пути (для миграции существующих файлов)
  async uploadFromPath(
    filePath: string,
    folder: string,
    mimeType: string,
  ): Promise<{ key: string; url: string }> {
    const fs = await import("fs");
    const buffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const key = this.generateKey(folder, fileName);
    const url = await this.uploadBuffer(buffer, key, mimeType);
    return { key, url };
  }

  // Удаление файла
  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      this.logger.log(`Deleted file: ${key}`);
    } catch (err) {
      this.logger.error(`Failed to delete file ${key}:`, err as Error);
    }
  }

  // Публичный URL (для публичных бакетов)
  getPublicUrl(key: string): string {
    if (this.cdnUrl) {
      return `${this.cdnUrl}/${key}`;
    }
    const endpoint = this.config.get<string>(
      "S3_ENDPOINT",
      "https://storage.yandexcloud.net",
    );
    return `${endpoint}/${this.bucket}/${key}`;
  }

  // Presigned URL для приватных файлов (действует 1 час)
  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  // Загрузка файла напрямую в Buffer (для скачивания)
  async downloadToBuffer(key: string): Promise<Buffer> {
    const response = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
}
