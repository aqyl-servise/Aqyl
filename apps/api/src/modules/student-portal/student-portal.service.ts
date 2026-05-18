import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

function getCurrentAcademicYear(): string {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-based
  const year = now.getFullYear();
  return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}
import { Student } from "../schools/entities/student.entity";
import { Schedule } from "../schools/entities/schedule.entity";
import { Assignment } from "../schools/entities/assignment.entity";
import { TaskSubmission } from "../schools/entities/task-submission.entity";
import { Questionnaire } from "../schools/entities/questionnaire.entity";
import { QuestionnaireResponse } from "../schools/entities/questionnaire-response.entity";
import { SubjectTeacherAssignment } from "../schools/entities/subject-teacher-assignment.entity";

@Injectable()
export class StudentPortalService {
  constructor(
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Schedule) private readonly scheduleRepo: Repository<Schedule>,
    @InjectRepository(Assignment) private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(TaskSubmission) private readonly submissionRepo: Repository<TaskSubmission>,
    @InjectRepository(Questionnaire) private readonly questionnaireRepo: Repository<Questionnaire>,
    @InjectRepository(QuestionnaireResponse) private readonly responseRepo: Repository<QuestionnaireResponse>,
    @InjectRepository(SubjectTeacherAssignment) private readonly subjectTeacherRepo: Repository<SubjectTeacherAssignment>,
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
    const classroomId = student.classroom.id;
    const academicYear = getCurrentAcademicYear();

    // Prefer admin-entered schedule for the current academic year (version="main")
    const adminSchedule = await this.scheduleRepo.find({
      where: { classroom: { id: classroomId }, version: "main", academicYear },
      relations: ["teacher"],
      order: { dayOfWeek: "ASC", period: "ASC" },
    });
    if (adminSchedule.length > 0) return adminSchedule;

    // Fall back to any version="main" entries (legacy or undated entries)
    return this.scheduleRepo.find({
      where: { classroom: { id: classroomId }, version: "main" },
      relations: ["teacher"],
      order: { dayOfWeek: "ASC", period: "ASC" },
    });
  }

  async getAssignments(userId: string) {
    const student = await this.getStudentByUserId(userId);
    const [assignments, submissions] = await Promise.all([
      this.assignmentRepo.find({
        where: [
          { classroom: { id: student.classroom.id }, status: "published" },
          { classroom: { id: student.classroom.id }, status: "active" },
        ],
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

  async getClassmates(userId: string) {
    const student = await this.getStudentByUserId(userId);
    return this.studentRepo.find({
      where: { classroom: { id: student.classroom.id } },
      order: { fullName: "ASC" },
    });
  }

  async getMyTeachers(userId: string) {
    const student = await this.getStudentByUserId(userId);
    return this.subjectTeacherRepo.find({
      where: { classroomId: student.classroom.id },
      relations: ["teacher"],
      order: { subject: "ASC" },
    });
  }

  async getMyQuestionnaires(userId: string) {
    const student = await this.getStudentByUserId(userId);
    const classroomId = student.classroom.id;

    const questionnaires = await this.questionnaireRepo
      .createQueryBuilder("q")
      .where("q.status IN (:...statuses)", { statuses: ["assigned", "completed"] })
      .andWhere(`:cid = ANY(q."assignedClassroomIds")`, { cid: classroomId })
      .orderBy("q.createdAt", "DESC")
      .getMany();

    const responses = await this.responseRepo.find({
      where: { studentId: student.id },
    });
    const responseMap = new Map(responses.map(r => [r.questionnaireId, r]));

    return questionnaires.map(q => ({
      ...q,
      myResponse: responseMap.get(q.id) ?? null,
    }));
  }

  async submitQuestionnaireResponse(userId: string, questionnaireId: string, answers: unknown) {
    const student = await this.getStudentByUserId(userId);
    const existing = await this.responseRepo.findOne({
      where: { questionnaireId, studentId: student.id },
    });
    if (existing) {
      await this.responseRepo.update(existing.id, { answers: answers as never, submittedAt: new Date() });
      return this.responseRepo.findOne({ where: { id: existing.id } });
    }
    return this.responseRepo.save(this.responseRepo.create({
      questionnaireId,
      studentId: student.id,
      answers: answers as never,
      submittedAt: new Date(),
    }));
  }
}
