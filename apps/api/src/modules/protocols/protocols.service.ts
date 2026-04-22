import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Protocol } from "../schools/entities/protocol.entity";

@Injectable()
export class ProtocolsService {
  constructor(
    @InjectRepository(Protocol)
    private readonly repo: Repository<Protocol>,
  ) {}

  getAll() {
    return this.repo.find({ relations: { createdBy: true }, order: { date: "DESC" } });
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id }, relations: { createdBy: true } });
  }

  create(data: Partial<Protocol>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.repo.update(id, data as never);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.repo.delete(id);
  }
}
