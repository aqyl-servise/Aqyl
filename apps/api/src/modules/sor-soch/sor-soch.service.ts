import { Injectable, NotFoundException } from "@nestjs/common";
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

  findOne(id: string, schoolId?: string | null) {
    return this.repo.findOne({ where: schoolId ? { id, schoolId } : { id }, relations: ["teacher", "classroom"] });
  }

  create(data: Partial<SorSochDocument>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<SorSochDocument>, schoolId?: string | null) {
    const res = await this.repo.update(schoolId ? { id, schoolId } : { id }, data as never);
    if (!res.affected) throw new NotFoundException();
    return this.findOne(id, schoolId);
  }

  async remove(id: string, schoolId?: string | null) {
    const res = await this.repo.delete(schoolId ? { id, schoolId } : { id });
    if (!res.affected) throw new NotFoundException();
    return { ok: true };
  }
}
