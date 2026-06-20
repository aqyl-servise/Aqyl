import { S3Client } from "@aws-sdk/client-s3";
import { ConfigService } from "@nestjs/config";

export function createS3Client(config: ConfigService): S3Client {
  return new S3Client({
    region: config.get<string>("S3_REGION", "ru-central1"), // Yandex Cloud дефолт
    endpoint: config.get<string>("S3_ENDPOINT"), // для Yandex: https://storage.yandexcloud.net
    credentials: {
      accessKeyId: config.get<string>("S3_ACCESS_KEY", ""),
      secretAccessKey: config.get<string>("S3_SECRET_KEY", ""),
    },
    forcePathStyle: true, // нужно для Yandex Cloud и MinIO
  });
}
