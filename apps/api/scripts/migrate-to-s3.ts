#!/usr/bin/env ts-node
/**
 * TODO: RUN_MIGRATION_SCRIPT
 * Одноразовый скрипт для загрузки существующих файлов с диска в S3.
 * Запускать только один раз после настройки S3 (переменные S3_* в окружении).
 * Использование: npx ts-node -r tsconfig-paths/register scripts/migrate-to-s3.ts
 */

import * as fs from "fs";
import * as path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as mime from "mime-types";

const s3 = new S3Client({
  region: process.env.S3_REGION || "ru-central1",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET!;
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

async function uploadDir(localDir: string, s3Prefix: string) {
  if (!fs.existsSync(localDir)) {
    console.log(`Папка не найдена: ${localDir}`);
    return;
  }
  const files = fs.readdirSync(localDir);
  for (const file of files) {
    const filePath = path.join(localDir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      await uploadDir(filePath, `${s3Prefix}/${file}`);
      continue;
    }
    const key = `${s3Prefix}/${file}`;
    const buffer = fs.readFileSync(filePath);
    const mimeType = mime.lookup(file) || "application/octet-stream";
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
    console.log(`✅ Загружен: ${key}`);
  }
}

async function main() {
  console.log("Начинаем миграцию файлов на S3...");
  await uploadDir(path.join(UPLOADS_DIR, "presentations"), "presentations");
  await uploadDir(path.join(UPLOADS_DIR, "illustrations"), "illustrations");
  await uploadDir(UPLOADS_DIR, "uploads"); // остальные файлы
  console.log("✅ Миграция завершена");
}

main().catch(console.error);
