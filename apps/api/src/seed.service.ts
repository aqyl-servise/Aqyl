import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { Repository } from "typeorm";
import { Classroom } from "./modules/schools/entities/classroom.entity";
import { Student } from "./modules/schools/entities/student.entity";
import { Submission } from "./modules/schools/entities/submission.entity";
import { Schedule } from "./modules/schools/entities/schedule.entity";
import { Assignment } from "./modules/schools/entities/assignment.entity";
import { OpenLesson } from "./modules/schools/entities/open-lesson.entity";
import { Protocol } from "./modules/schools/entities/protocol.entity";
import { ClassHour } from "./modules/schools/entities/class-hour.entity";
import { Teacher } from "./modules/teachers/entities/teacher.entity";
import { GiftedStudent } from "./modules/schools/entities/gifted-student.entity";
import { GiftedTeacherAssignment } from "./modules/schools/entities/gifted-teacher-assignment.entity";
import { GiftedMaterial } from "./modules/schools/entities/gifted-material.entity";
import { GiftedAchievement } from "./modules/schools/entities/gifted-achievement.entity";

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(Classroom) private readonly classroomRepo: Repository<Classroom>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Submission) private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(Schedule) private readonly scheduleRepo: Repository<Schedule>,
    @InjectRepository(Assignment) private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(OpenLesson) private readonly lessonRepo: Repository<OpenLesson>,
    @InjectRepository(Protocol) private readonly protocolRepo: Repository<Protocol>,
    @InjectRepository(ClassHour) private readonly classHourRepo: Repository<ClassHour>,
    @InjectRepository(GiftedStudent) private readonly giftedStudentRepo: Repository<GiftedStudent>,
    @InjectRepository(GiftedTeacherAssignment) private readonly giftedAssignmentRepo: Repository<GiftedTeacherAssignment>,
    @InjectRepository(GiftedMaterial) private readonly giftedMaterialRepo: Repository<GiftedMaterial>,
    @InjectRepository(GiftedAchievement) private readonly giftedAchievementRepo: Repository<GiftedAchievement>,
  ) {}

  async seed() {
    const existing = await this.teacherRepo.findOne({ where: { email: "teacher@aqyl.kz" } });
    if (existing) return;

    const hash = (pw: string) => bcrypt.hash(pw, 10);

    // ── Staff ──────────────────────────────────────────────────────
    const [admin, principal, vpAcademic, vpWelfare, teacher1, teacher2, teacher3, teacher4, teacher5, ct1, ct2, ct3] = await Promise.all([
      this.teacherRepo.save(this.teacherRepo.create({ fullName: "Администратор", email: "admin@aqyl.kz", passwordHash: await hash("admin123"), role: "admin", preferredLanguage: "ru" })),
      this.teacherRepo.save(this.teacherRepo.create({ fullName: "Аскар Бейсенов", email: "principal@aqyl.kz", passwordHash: await hash("principal123"), role: "principal", preferredLanguage: "ru", experience: 20, category: "Высшая", university: "КазНПУ им. Абая" })),
      this.teacherRepo.save(this.teacherRepo.create({ fullName: "Гульнара Сейткали", email: "vp.academic@aqyl.kz", passwordHash: await hash("vp123"), role: "vice_principal", preferredLanguage: "ru", experience: 15, category: "Первая" })),
      this.teacherRepo.save(this.teacherRepo.create({ fullName: "Динара Жақсыбай", email: "vp.welfare@aqyl.kz", passwordHash: await hash("vp123"), role: "vice_principal", preferredLanguage: "kz", experience: 12, category: "Первая" })),
      this.teacherRepo.save(this.teacherRepo.create({ fullName: "Айнур Бекова", email: "teacher@aqyl.kz", passwordHash: await hash("aqyl123"), role: "teacher", subject: "Математика", experience: 10, category: "Первая", university: "КазНУ им. аль-Фараби", preferredLanguage: "ru" })),
      this.teacherRepo.save(this.teacherRepo.create({ fullName: "Ерлан Нұрланов", email: "teacher2@aqyl.kz", passwordHash: await hash("aqyl123"), role: "teacher", subject: "Физика", experience: 7, category: "Вторая", university: "ЕНУ им. Гумилёва", preferredLanguage: "kz" })),
      this.teacherRepo.save(this.teacherRepo.create({ fullName: "Самал Ахметова", email: "teacher3@aqyl.kz", passwordHash: await hash("aqyl123"), role: "teacher", subject: "Казахский язык", experience: 14, category: "Высшая", university: "КазНПУ им. Абая", preferredLanguage: "kz" })),
      this.teacherRepo.save(this.teacherRepo.create({ fullName: "Мария Петрова", email: "teacher4@aqyl.kz", passwordHash: await hash("aqyl123"), role: "teacher", subject: "Русская литература", experience: 9, category: "Первая", university: "КарГУ", preferredLanguage: "ru" })),
      this.teacherRepo.save(this.teacherRepo.create({ fullName: "Бауыржан Сейтқали", email: "teacher5@aqyl.kz", passwordHash: await hash("aqyl123"), role: "teacher", subject: "История", experience: 5, category: "Вторая", university: "ЕНУ им. Гумилёва", preferredLanguage: "kz" })),
      this.teacherRepo.save(this.teacherRepo.create({ fullName: "Зауреш Нұрмағамбет", email: "ct1@aqyl.kz", passwordHash: await hash("ct123"), role: "class_teacher", subject: "Биология", experience: 8, preferredLanguage: "kz" })),
      this.teacherRepo.save(this.teacherRepo.create({ fullName: "Игорь Соколов", email: "ct2@aqyl.kz", passwordHash: await hash("ct123"), role: "class_teacher", subject: "Химия", experience: 11, preferredLanguage: "ru" })),
      this.teacherRepo.save(this.teacherRepo.create({ fullName: "Асел Қонақбай", email: "ct3@aqyl.kz", passwordHash: await hash("ct123"), role: "class_teacher", subject: "Информатика", experience: 6, preferredLanguage: "kz" })),
    ]);

    // ── Classrooms ──────────────────────────────────────────────────
    const [cls1A, cls5B, cls8V, cls9A, cls11B] = await Promise.all([
      this.classroomRepo.save(this.classroomRepo.create({ name: "1А", grade: 1, subject: "Начальные классы", teacher: teacher1, classTeacher: ct1 })),
      this.classroomRepo.save(this.classroomRepo.create({ name: "5Б", grade: 5, subject: "Математика", teacher: teacher1, classTeacher: ct2 })),
      this.classroomRepo.save(this.classroomRepo.create({ name: "8В", grade: 8, subject: "Математика", teacher: teacher1, classTeacher: ct3 })),
      this.classroomRepo.save(this.classroomRepo.create({ name: "9А", grade: 9, subject: "Физика", teacher: teacher2, classTeacher: ct1 })),
      this.classroomRepo.save(this.classroomRepo.create({ name: "11Б", grade: 11, subject: "История", teacher: teacher5, classTeacher: ct2 })),
    ]);

    // ── Students (6 per class = 30 total) ──────────────────────────
    const studentNames = [
      ["Айгерім Сапар", "Бекзат Омар", "Дана Мұқан", "Нұрсұлтан Рай", "Камила Ораз", "Аликан Серік"],
      ["Асель Жұмаш", "Дамир Алиев", "Жанна Бекова", "Руслан Нұрлан", "Айдана Сейт", "Марат Ахмет"],
      ["Тимур Қасым", "Ұлан Тоқаев", "Зарина Мырза", "Алихан Дүйсен", "Айнұр Жақып", "Рахим Бауыр"],
      ["Санжар Əлім", "Меруерт Нұр", "Арман Қожа", "Ботагөз Еркін", "Дəурен Сейіт", "Лаура Байжан"],
      ["Əділ Марат", "Гүлжан Айдар", "Нұрлан Сейт", "Айбек Жанат", "Мадина Болат", "Ерлан Хасан"],
    ];
    const classrooms = [cls1A, cls5B, cls8V, cls9A, cls11B];
    const allStudents: Student[] = [];
    for (let ci = 0; ci < classrooms.length; ci++) {
      for (let si = 0; si < 6; si++) {
        const student = await this.studentRepo.save(
          this.studentRepo.create({ fullName: studentNames[ci][si], orderNum: si + 1, classroom: classrooms[ci] }),
        );
        allStudents.push(student);
      }
    }

    // ── Submissions ─────────────────────────────────────────────────
    const topics = ["Дроби", "Уравнения", "Функции", "Геометрия", "Линейные уравнения", "Статистика"];
    const scoreMatrix = [
      [17,12,16,18,15,14], [11,9,10,13,12,12], [18,17,19,16,18,18],
      [13,14,11,12,10,15], [19,18,18,17,18,19], [12,10,13,11,13,14],
    ];
    const mathStudents = allStudents.filter((_, i) => i < 12); // 1А + 5Б
    for (const [si, student] of mathStudents.entries()) {
      for (const [ti, topic] of topics.entries()) {
        await this.submissionRepo.save(
          this.submissionRepo.create({
            student,
            topic,
            score: scoreMatrix[si % 6][ti],
            maxScore: 20,
            submittedAt: new Date(Date.now() - ti * 86400000 - si * 3600000),
          }),
        );
      }
    }

    // ── Schedule (5B, Monday-Friday) ────────────────────────────────
    const times = ["08:00-08:45","08:55-09:40","09:50-10:35","10:50-11:35","11:45-12:30","12:40-13:25","13:35-14:20","14:30-15:15"];
    const scheduleData = [
      { day: 1, period: 1, subject: "Математика", teacher: teacher1, classroom: cls5B },
      { day: 1, period: 2, subject: "Казахский язык", teacher: teacher3, classroom: cls5B },
      { day: 1, period: 3, subject: "Русская литература", teacher: teacher4, classroom: cls5B },
      { day: 1, period: 4, subject: "История", teacher: teacher5, classroom: cls5B },
      { day: 2, period: 1, subject: "Физика", teacher: teacher2, classroom: cls5B },
      { day: 2, period: 2, subject: "Математика", teacher: teacher1, classroom: cls5B },
      { day: 2, period: 3, subject: "Казахский язык", teacher: teacher3, classroom: cls5B },
      { day: 3, period: 1, subject: "История", teacher: teacher5, classroom: cls5B },
      { day: 3, period: 2, subject: "Физика", teacher: teacher2, classroom: cls5B },
      { day: 3, period: 3, subject: "Математика", teacher: teacher1, classroom: cls5B },
      { day: 4, period: 1, subject: "Русская литература", teacher: teacher4, classroom: cls5B },
      { day: 4, period: 2, subject: "Казахский язык", teacher: teacher3, classroom: cls5B },
      { day: 5, period: 1, subject: "Математика", teacher: teacher1, classroom: cls5B },
      { day: 5, period: 2, subject: "Физика", teacher: teacher2, classroom: cls5B },
    ];
    for (const s of scheduleData) {
      const [start, end] = times[s.period - 1].split("-");
      await this.scheduleRepo.save(
        this.scheduleRepo.create({ dayOfWeek: s.day, period: s.period, subject: s.subject, startTime: start, endTime: end, classroom: s.classroom, teacher: s.teacher }),
      );
    }

    // ── Assignments ─────────────────────────────────────────────────
    const [asgn1, asgn2] = await Promise.all([
      this.assignmentRepo.save(this.assignmentRepo.create({
        title: "Задачи по линейным уравнениям",
        description: "Решите задачи №1-10 из учебника, покажите полное решение.",
        subject: "Математика",
        dueDate: new Date(Date.now() + 7 * 86400000),
        maxScore: 100,
        teacher: teacher1,
        classroom: cls8V,
      })),
      this.assignmentRepo.save(this.assignmentRepo.create({
        title: "Эссе: Независимость Казахстана",
        description: "Напишите эссе объёмом 400-500 слов на тему «Путь к независимости».",
        subject: "История",
        dueDate: new Date(Date.now() + 10 * 86400000),
        maxScore: 100,
        teacher: teacher5,
        classroom: cls11B,
      })),
    ]);

    // ── Open Lessons ─────────────────────────────────────────────────
    await Promise.all([
      this.lessonRepo.save(this.lessonRepo.create({
        title: "Открытый урок: Системы уравнений",
        subject: "Математика",
        grade: 9,
        date: new Date(Date.now() - 14 * 86400000),
        description: "Использование метода подстановки и сложения для решения систем уравнений.",
        status: "reviewed",
        directorComment: "Урок проведён методически грамотно. Использованы современные технологии обучения.",
        teacher: teacher1,
      })),
      this.lessonRepo.save(this.lessonRepo.create({
        title: "Урок физики: Законы Ньютона",
        subject: "Физика",
        grade: 8,
        date: new Date(Date.now() + 3 * 86400000),
        description: "Демонстрация и лабораторная работа по первому и второму законам Ньютона.",
        status: "planned",
        teacher: teacher2,
      })),
    ]);

    // ── Protocols ────────────────────────────────────────────────────
    await Promise.all([
      this.protocolRepo.save(this.protocolRepo.create({
        title: "Педагогический совет №1 — Итоги I четверти",
        type: "pedagogical-council",
        date: new Date(Date.now() - 30 * 86400000),
        content: "Повестка:\n1. Итоги успеваемости за I четверть\n2. Анализ качества знаний\n3. Разное\n\nРешение: Усилить индивидуальную работу с отстающими учениками.",
        createdBy: principal,
      })),
      this.protocolRepo.save(this.protocolRepo.create({
        title: "Родительское собрание — 9А класс",
        type: "parent-meeting",
        date: new Date(Date.now() - 7 * 86400000),
        content: "Обсуждение подготовки к итоговой аттестации. Рекомендации по организации самостоятельной работы.",
        createdBy: vpAcademic,
      })),
    ]);

    // ── Class Hours ──────────────────────────────────────────────────
    await Promise.all([
      this.classHourRepo.save(this.classHourRepo.create({
        title: "Классный час: Безопасность в интернете",
        topic: "education",
        date: new Date(Date.now() - 5 * 86400000),
        duration: 45,
        notes: "Обсуждение правил поведения в сети, опасности незнакомых контактов.",
        classTeacher: ct1,
        classroom: cls1A,
      })),
      this.classHourRepo.save(this.classHourRepo.create({
        title: "Классный час: Правовые основы",
        topic: "law",
        date: new Date(Date.now() - 10 * 86400000),
        duration: 45,
        notes: "Права и обязанности ученика. Устав школы.",
        classTeacher: ct2,
        classroom: cls5B,
      })),
      this.classHourRepo.save(this.classHourRepo.create({
        title: "Кружок программирования",
        topic: "circle",
        date: new Date(Date.now() - 2 * 86400000),
        duration: 60,
        notes: "Введение в Scratch. Создание первой программы.",
        classTeacher: ct3,
        classroom: cls8V,
      })),
    ]);
  }

  async seedGifted() {
    const alreadyDone = await this.giftedAssignmentRepo.count();
    if (alreadyDone > 0) return;

    const [teacher1, teacher2, teacher3] = await Promise.all([
      this.teacherRepo.findOne({ where: { email: "teacher@aqyl.kz" } }),
      this.teacherRepo.findOne({ where: { email: "teacher2@aqyl.kz" } }),
      this.teacherRepo.findOne({ where: { email: "teacher3@aqyl.kz" } }),
    ]);
    if (!teacher1 || !teacher2 || !teacher3) return;

    const [students5B, students8V, students9A] = await Promise.all([
      this.studentRepo.find({ where: { classroom: { name: "5Б" } }, relations: ["classroom"], take: 2 }),
      this.studentRepo.find({ where: { classroom: { name: "8В" } }, relations: ["classroom"], take: 2 }),
      this.studentRepo.find({ where: { classroom: { name: "9А" } }, relations: ["classroom"], take: 2 }),
    ]);

    const pairs: [Teacher, Student[]][] = [
      [teacher1, students5B],
      [teacher2, students8V],
      [teacher3, students9A],
    ];

    const levelByIndex = ["district", "regional", "national"];
    for (let pi = 0; pi < pairs.length; pi++) {
      const [teacher, students] = pairs[pi];
      for (let si = 0; si < students.length; si++) {
        const student = students[si];
        await this.giftedStudentRepo.save(this.giftedStudentRepo.create({ student }));
        await this.giftedAssignmentRepo.save(this.giftedAssignmentRepo.create({ teacher, student }));
        await this.giftedAchievementRepo.save(
          this.giftedAchievementRepo.create({
            student,
            title: `Олимпиада по ${teacher.subject ?? "предмету"}`,
            level: levelByIndex[si] ?? "school",
            subject: teacher.subject ?? undefined,
            place: si === 0 ? "1 место" : "2 место",
            date: new Date(Date.now() - (30 + pi * 15) * 86400000),
          }),
        );
      }
      await Promise.all([
        this.giftedMaterialRepo.save(this.giftedMaterialRepo.create({
          teacher, category: "test_tasks",
          title: `Олимпиадные задания по ${teacher.subject ?? "предмету"}`,
        })),
        this.giftedMaterialRepo.save(this.giftedMaterialRepo.create({
          teacher, category: "completed_work",
          title: `Выполненные проекты — ${teacher.subject ?? "предмет"}`,
        })),
        this.giftedMaterialRepo.save(this.giftedMaterialRepo.create({
          teacher, category: "monitoring",
          title: `Мониторинг успеваемости — ${teacher.subject ?? "предмет"}`,
        })),
      ]);
    }
  }
}
