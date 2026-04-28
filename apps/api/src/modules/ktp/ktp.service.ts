import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { KtpReview, KtpStatus } from "../schools/entities/ktp-review.entity";
import { UploadedFile } from "../schools/entities/uploaded-file.entity";
import { Teacher } from "../teachers/entities/teacher.entity";

@Injectable()
export class KtpService {
  constructor(
    @InjectRepository(KtpReview)
    private readonly reviewRepo: Repository<KtpReview>,
    @InjectRepository(UploadedFile)
    private readonly fileRepo: Repository<UploadedFile>,
  ) {}

  async getFilesWithReviews(section: string) {
    const files = await this.fileRepo.find({
      where: { section },
      relations: ["uploadedBy"],
      order: { createdAt: "DESC" },
    });

    if (files.length === 0) return [];

    const reviews = await this.reviewRepo.find({
      where: { fileId: In(files.map((f) => f.id)) },
      relations: ["reviewedBy"],
    });
    const reviewMap = new Map(reviews.map((r) => [r.fileId, r]));

    return files.map((f) => ({
      id: f.id,
      filename: f.filename,
      originalName: f.originalName,
      mimetype: f.mimetype,
      size: f.size,
      createdAt: f.createdAt,
      uploadedBy: f.uploadedBy ? { id: (f.uploadedBy as { id: string }).id, fullName: (f.uploadedBy as { fullName: string }).fullName } : null,
      review: reviewMap.get(f.id)
        ? {
            status: reviewMap.get(f.id)!.status,
            comment: reviewMap.get(f.id)!.comment,
            reviewedBy: reviewMap.get(f.id)!.reviewedBy?.fullName ?? null,
            updatedAt: reviewMap.get(f.id)!.updatedAt,
          }
        : null,
    }));
  }

  async upsertReview(fileId: string, data: { status: KtpStatus; comment?: string }, reviewerId: string) {
    let review = await this.reviewRepo.findOne({ where: { fileId } });
    if (!review) {
      review = this.reviewRepo.create({ fileId });
    }
    review.status = data.status;
    review.comment = data.comment ?? undefined;
    review.reviewedBy = { id: reviewerId } as Teacher;
    return this.reviewRepo.save(review);
  }
}
