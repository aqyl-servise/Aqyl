import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SorSochDocument } from "../schools/entities/sor-soch-document.entity";

@Injectable()
export class SorSochService {
  constructor(
    @InjectRepository(SorSochDocument)
    private readonly repo: Repository<SorSochDocument>,
  ) {}

  findAll(opts: { schoolId?: string; teacherId?: string; type?: "sor" | "soch"; subject?: string; classroomId?: string; quarter?: string }) {
    const where: Record<string, unknown> = {};
    if (opts.schoolId) where["schoolId"] = opts.schoolId;
    if (opts.teacherId) where["teacherId"] = opts.teacherId;
    if (opts.type) where["type"] = opts.type;
    if (opts.subject) where["subject"] = opts.subject;
    if (opts.classroomId) where["classroomId"] = opts.classroomId;
    if (opts.quarter) where["quarter"] = opts.quarter;
    return this.repo.find({ where, relations: ["teacher", "classroom"], order: { createdAt: "DESC" } });
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id }, relations: ["teacher", "classroom"] });
  }

  create(data: Partial<SorSochDocument>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<SorSochDocument>) {
    await this.repo.update(id, data as never);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.repo.delete(id);
    return { ok: true };
  }
}
