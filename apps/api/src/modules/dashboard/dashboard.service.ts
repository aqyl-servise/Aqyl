import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Classroom } from "../schools/entities/classroom.entity";
import { GeneratedDocument } from "../schools/entities/generated-document.entity";
import { Submission } from "../schools/entities/submission.entity";

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Classroom)
    private readonly classroomRepository: Repository<Classroom>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(GeneratedDocument)
    private readonly generatedDocumentRepository: Repository<GeneratedDocument>,
  ) {}

  async getDashboard(teacherId: string) {
    const classrooms = await this.classroomRepository.find({
      where: { teacher: { id: teacherId } },
      relations: { students: true, teacher: true },
      order: { grade: "ASC", name: "ASC" },
    });

    const submissions = await this.submissionRepository.find({
      relations: { student: { classroom: { teacher: true } } },
      order: { submittedAt: "DESC" },
    });
    const filteredSubmissions = submissions.filter(
      (item) => item.student.classroom.teacher.id === teacherId,
    );

    const generatedDocuments = await this.generatedDocumentRepository.find({
      where: { teacher: { id: teacherId } },
      order: { createdAt: "DESC" },
      take: 5,
    });

    const totalStudents = classrooms.reduce(
      (sum, classroom) => sum + classroom.students.length,
      0,
    );
    const averageScore =
      filteredSubmissions.reduce(
        (sum, item) => sum + Number(item.score) / Number(item.maxScore),
        0,
      ) / Math.max(filteredSubmissions.length, 1);

    const topicMap = new Map<string, { total: number; count: number }>();
    filteredSubmissions.forEach((item) => {
      const current = topicMap.get(item.topic) ?? { total: 0, count: 0 };
      current.total += Number(item.score) / Number(item.maxScore);
      current.count += 1;
      topicMap.set(item.topic, current);
    });

    const topicPerformance = [...topicMap.entries()]
      .map(([topic, value]) => ({
        topic,
        average: Math.round((value.total / value.count) * 100),
      }))
      .sort((left, right) => left.average - right.average);

    const studentAverages = classrooms.flatMap((classroom) =>
      classroom.students.map((student) => {
        const studentSubmissions = filteredSubmissions.filter(
          (submission) => submission.student.id === student.id,
        );
        const average =
          studentSubmissions.reduce(
            (sum, item) => sum + Number(item.score) / Number(item.maxScore),
            0,
          ) / Math.max(studentSubmissions.length, 1);

        return {
          id: student.id,
          fullName: student.fullName,
          classroom: classroom.name,
          average: Math.round(average * 100),
        };
      }),
    );

    return {
      summary: {
        totalClasses: classrooms.length,
        totalStudents,
        averageScore: Math.round(averageScore * 100),
        generatedDocuments: generatedDocuments.length,
      },
      classes: classrooms.map((classroom) => ({
        id: classroom.id,
        name: classroom.name,
        grade: classroom.grade,
        subject: classroom.subject,
        studentCount: classroom.students.length,
      })),
      topicPerformance,
      strugglingStudents: studentAverages
        .filter((student) => student.average < 60)
        .sort((left, right) => left.average - right.average)
        .slice(0, 5),
      recentDocuments: generatedDocuments.map((document) => ({
        id: document.id,
        type: document.type,
        title: document.title,
        language: document.language,
        createdAt: document.createdAt,
      })),
    };
  }
}
