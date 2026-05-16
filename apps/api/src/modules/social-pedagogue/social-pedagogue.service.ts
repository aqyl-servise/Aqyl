import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NutritionStudent } from "../schools/entities/nutrition-student.entity";
import { NutritionOrder } from "../schools/entities/nutrition-order.entity";
import { SpecialAttentionStudent } from "../schools/entities/special-attention-student.entity";

@Injectable()
export class SocialPedagogueService {
  constructor(
    @InjectRepository(NutritionStudent) private readonly nutritionStudentRepo: Repository<NutritionStudent>,
    @InjectRepository(NutritionOrder) private readonly nutritionOrderRepo: Repository<NutritionOrder>,
    @InjectRepository(SpecialAttentionStudent) private readonly specialAttentionRepo: Repository<SpecialAttentionStudent>,
  ) {}

  // ── Nutrition Students ──────────────────────────────────────────────────
  async getNutritionStudents(schoolId: string, academicYear?: string) {
    const where: Record<string, unknown> = { schoolId };
    if (academicYear) where["academicYear"] = academicYear;
    return this.nutritionStudentRepo.find({ where, order: { createdAt: "DESC" } });
  }

  async upsertNutritionStudent(data: {
    schoolId: string; studentId: string; nutritionType: string;
    academicYear?: string; notes?: string;
  }) {
    const existing = await this.nutritionStudentRepo.findOne({
      where: { schoolId: data.schoolId, studentId: data.studentId, academicYear: data.academicYear },
    });
    if (existing) {
      await this.nutritionStudentRepo.update(existing.id, {
        nutritionType: data.nutritionType,
        notes: data.notes,
      });
      return this.nutritionStudentRepo.findOne({ where: { id: existing.id } });
    }
    return this.nutritionStudentRepo.save(this.nutritionStudentRepo.create(data));
  }

  async removeNutritionStudent(id: string) {
    await this.nutritionStudentRepo.delete(id);
  }

  // ── Nutrition Orders ────────────────────────────────────────────────────
  async getNutritionOrders(schoolId: string) {
    return this.nutritionOrderRepo.find({ where: { schoolId }, order: { createdAt: "DESC" } });
  }

  async createNutritionOrder(data: { schoolId: string; title: string; fileUrl?: string }) {
    return this.nutritionOrderRepo.save(this.nutritionOrderRepo.create(data));
  }

  async removeNutritionOrder(id: string) {
    await this.nutritionOrderRepo.delete(id);
  }

  // ── Special Attention Students ──────────────────────────────────────────
  async getSpecialAttentionStudents(schoolId: string) {
    return this.specialAttentionRepo.find({ where: { schoolId }, order: { createdAt: "DESC" } });
  }

  async upsertSpecialAttentionStudent(data: {
    schoolId: string; studentId: string; reason: string;
    documents?: { title: string; fileUrl: string }[];
  }) {
    const existing = await this.specialAttentionRepo.findOne({
      where: { schoolId: data.schoolId, studentId: data.studentId },
    });
    if (existing) {
      await this.specialAttentionRepo.update(existing.id, {
        reason: data.reason,
        documents: data.documents ?? existing.documents,
      });
      return this.specialAttentionRepo.findOne({ where: { id: existing.id } });
    }
    return this.specialAttentionRepo.save(this.specialAttentionRepo.create({
      ...data,
      documents: data.documents ?? [],
    }));
  }

  async removeSpecialAttentionStudent(id: string) {
    await this.specialAttentionRepo.delete(id);
  }

  async addDocument(id: string, doc: { title: string; fileUrl: string }) {
    const record = await this.specialAttentionRepo.findOne({ where: { id } });
    if (!record) return null;
    record.documents = [...(record.documents ?? []), doc];
    return this.specialAttentionRepo.save(record);
  }
}
