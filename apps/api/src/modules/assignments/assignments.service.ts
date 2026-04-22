import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Assignment } from "../schools/entities/assignment.entity";
import { TaskSubmission } from "../schools/entities/task-submission.entity";

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(TaskSubmission)
    private readonly submissionRepo: Repository<TaskSubmission>,
  ) {}

  getForTeacher(teacherId: string) {
    return this.assignmentRepo.find({
      where: { teacher: { id: teacherId } },
      relations: { classroom: true, submissions: { student: true } },
      order: { createdAt: "DESC" },
    });
  }

  getForClassroom(classroomId: string) {
    return this.assignmentRepo.find({
      where: { classroom: { id: classroomId }, status: "active" },
      relations: { teacher: true },
      order: { dueDate: "ASC" },
    });
  }

  getAll() {
    return this.assignmentRepo.find({
      relations: { classroom: true, teacher: true },
      order: { createdAt: "DESC" },
    });
  }

  findOne(id: string) {
    return this.assignmentRepo.findOne({
      where: { id },
      relations: { classroom: true, teacher: true, submissions: { student: true } },
    });
  }

  create(data: Partial<Assignment>) {
    return this.assignmentRepo.save(this.assignmentRepo.create(data));
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.assignmentRepo.update(id, data as never);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.assignmentRepo.delete(id);
  }

  // Submissions
  getSubmissionsForAssignment(assignmentId: string) {
    return this.submissionRepo.find({
      where: { assignment: { id: assignmentId } },
      relations: { student: { classroom: true } },
    });
  }

  submitWork(data: Partial<TaskSubmission>) {
    return this.submissionRepo.save(this.submissionRepo.create({
      ...data,
      status: "submitted",
      submittedAt: new Date(),
    }));
  }

  async gradeSubmission(id: string, score: number) {
    await this.submissionRepo.update(id, { score, status: "graded" });
    return this.submissionRepo.findOne({ where: { id } });
  }
}
