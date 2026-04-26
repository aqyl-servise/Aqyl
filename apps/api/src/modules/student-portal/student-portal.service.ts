import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Student } from "../schools/entities/student.entity";
import { Schedule } from "../schools/entities/schedule.entity";
import { Assignment } from "../schools/entities/assignment.entity";
import { TaskSubmission } from "../schools/entities/task-submission.entity";

@Injectable()
export class StudentPortalService {
  constructor(
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Schedule) private readonly scheduleRepo: Repository<Schedule>,
    @InjectRepository(Assignment) private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(TaskSubmission) private readonly submissionRepo: Repository<TaskSubmission>,
  ) {}

  async getStudentByUserId(userId: string) {
    const student = await this.studentRepo.findOne({
      where: { userId },
      relations: ["classroom", "classTeacher"],
    });
    if (!student) throw new NotFoundException("STUDENT_PROFILE_NOT_LINKED");
    return student;
  }

  async getSchedule(userId: string) {
    const student = await this.getStudentByUserId(userId);
    return this.scheduleRepo.find({
      where: { classroom: { id: student.classroom.id } },
      relations: ["teacher"],
      order: { dayOfWeek: "ASC", period: "ASC" },
    });
  }

  async getAssignments(userId: string) {
    const student = await this.getStudentByUserId(userId);
    const [assignments, submissions] = await Promise.all([
      this.assignmentRepo.find({
        where: { classroom: { id: student.classroom.id } },
        relations: ["teacher"],
        order: { dueDate: "ASC" },
      }),
      this.submissionRepo.find({
        where: { student: { id: student.id } },
        relations: ["assignment"],
      }),
    ]);

    const subMap = new Map(submissions.map((s) => [s.assignment.id, s]));
    return assignments.map((a) => ({ ...a, submission: subMap.get(a.id) ?? null }));
  }

  async submitAssignment(userId: string, assignmentId: string, content?: string, fileUrl?: string) {
    const student = await this.getStudentByUserId(userId);
    const existing = await this.submissionRepo.findOne({
      where: { student: { id: student.id }, assignment: { id: assignmentId } },
    });

    if (existing) {
      await this.submissionRepo.update(existing.id, {
        content,
        fileUrl,
        status: "submitted",
        submittedAt: new Date(),
      });
      return this.submissionRepo.findOne({ where: { id: existing.id } });
    }

    return this.submissionRepo.save(
      this.submissionRepo.create({
        student: { id: student.id },
        assignment: { id: assignmentId },
        content,
        fileUrl,
        status: "submitted",
        submittedAt: new Date(),
      }),
    );
  }

  async getGrades(userId: string) {
    const student = await this.getStudentByUserId(userId);
    return this.submissionRepo.find({
      where: { student: { id: student.id } },
      relations: ["assignment", "assignment.teacher"],
      order: { submittedAt: "DESC" },
    });
  }

  async getMyProfile(userId: string) {
    return this.getStudentByUserId(userId);
  }
}
