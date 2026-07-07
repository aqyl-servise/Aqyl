import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Protocol } from "../schools/entities/protocol.entity";

@Injectable()
export class ProtocolsService {
  constructor(
    @InjectRepository(Protocol)
    private readonly repo: Repository<Protocol>,
  ) {}

  getAll(schoolId?: string | null) {
    const where = schoolId ? { schoolId } : {};
    return this.repo.find({ where, relations: { createdBy: true }, order: { date: "DESC" } });
  }

  findOne(id: string, schoolId?: string | null) {
    return this.repo.findOne({ where: schoolId ? { id, schoolId } : { id }, relations: { createdBy: true } });
  }

  create(data: Partial<Protocol>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Record<string, unknown>, schoolId?: string | null) {
    const res = await this.repo.update(schoolId ? { id, schoolId } : { id }, data as never);
    if (!res.affected) throw new NotFoundException();
    return this.findOne(id, schoolId);
  }

  async remove(id: string, schoolId?: string | null) {
    const res = await this.repo.delete(schoolId ? { id, schoolId } : { id });
    if (!res.affected) throw new NotFoundException();
  }
}
