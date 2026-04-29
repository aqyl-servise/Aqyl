import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Teacher, UserRole } from "./entities/teacher.entity";

@Injectable()
export class TeachersService {
  constructor(
    @InjectRepository(Teacher)
    private readonly teachersRepository: Repository<Teacher>,
  ) {}

  findByEmail(email: string) {
    return this.teachersRepository.findOne({ where: { email: email.toLowerCase() } });
  }

  /** Used during login — resolves schoolId from the school relation if needed */
  findById_withSchool(email: string) {
    return this.teachersRepository.findOne({ where: { email: email.toLowerCase() } });
  }

  findById(id: string) {
    return this.teachersRepository.findOne({ where: { id } });
  }

  findAll() {
    return this.teachersRepository.find({ order: { fullName: "ASC" } });
  }

  findBySchool(schoolId: string) {
    return this.teachersRepository.find({ where: { schoolId }, order: { fullName: "ASC" } });
  }

  findByRole(role: UserRole) {
    return this.teachersRepository.find({ where: { role }, order: { fullName: "ASC" } });
  }

  findByRoleAndSchool(role: UserRole, schoolId?: string) {
    if (!schoolId) return this.findByRole(role);
    return this.teachersRepository.find({ where: { role, schoolId }, order: { fullName: "ASC" } });
  }

  async updateProfile(id: string, data: Record<string, unknown>) {
    await this.teachersRepository.update(id, data as never);
    return this.findById(id);
  }

  create(data: Partial<Teacher>) {
    return this.teachersRepository.save(this.teachersRepository.create(data));
  }

  async remove(id: string) {
    await this.teachersRepository.delete(id);
  }
}
