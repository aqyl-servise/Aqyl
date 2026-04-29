import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OpenLesson } from "../schools/entities/open-lesson.entity";
import { LessonAnalysis } from "../schools/entities/lesson-analysis.entity";
import PDFDocument = require("pdfkit");

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(OpenLesson)
    private readonly repo: Repository<OpenLesson>,
    @InjectRepository(LessonAnalysis)
    private readonly analysisRepo: Repository<LessonAnalysis>,
  ) {}

  getForTeacher(teacherId: string) {
    return this.repo.find({
      where: { teacher: { id: teacherId } },
      order: { date: "DESC" },
    });
  }

  getAll(schoolId?: string | null) {
    const where = schoolId ? { schoolId } : {};
    return this.repo.find({
      where,
      relations: { teacher: true },
      order: { date: "DESC" },
    });
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id }, relations: { teacher: true } });
  }

  create(data: Partial<OpenLesson>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.repo.update(id, data as never);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.repo.delete(id);
  }

  async getAnalysis(lessonId: string) {
    return this.analysisRepo.findOne({
      where: { lessonId },
      relations: { analyzer: true },
    });
  }

  async saveAnalysis(lessonId: string, analyzerId: string, data: Partial<LessonAnalysis>) {
    const existing = await this.analysisRepo.findOne({ where: { lessonId } });
    if (existing) {
      await this.analysisRepo.update(existing.id, { ...data, lessonId, analyzerId } as never);
      return this.analysisRepo.findOne({ where: { id: existing.id }, relations: { analyzer: true } });
    }
    const created = this.analysisRepo.create({ ...data, lessonId, analyzerId, lesson: { id: lessonId } as never });
    return this.analysisRepo.save(created);
  }

  async generateAnalysisPdf(lessonId: string): Promise<Buffer> {
    const lesson = await this.findOne(lessonId);
    const analysis = await this.getAnalysis(lessonId);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    return new Promise<Buffer>((resolve, reject) => {
      doc.on("data", (c) => chunks.push(Buffer.from(c)));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width - 80;

      // Title
      doc.fontSize(14).font("Helvetica-Bold").text("САБАҚТЫ ТАЛДАУ СЫЗБАСЫ", { align: "center" });
      doc.moveDown(0.5);

      // Header section
      const date = lesson?.date ? new Date(lesson.date).toLocaleDateString("ru-RU") : "___________";
      doc.fontSize(11).font("Helvetica");
      doc.text(`Күні: ${date}   Сынып: ${lesson?.classroomId ?? "___"}   Кабинет: ${lesson?.cabinet ?? "___"}`);
      doc.text(`Мұғалімнің аты-жөні: ${lesson?.teacher?.fullName ?? "___________"}`);
      doc.text(`Сабаққа қатынасу мақсаты: ${analysis?.visitPurpose ?? lesson?.visitPurpose ?? "___________"}`);
      doc.moveDown(0.5);

      // Main fields
      doc.font("Helvetica-Bold").text("Сабақ тақырыбы:");
      doc.font("Helvetica").text(analysis?.lessonTopic ?? lesson?.lessonTopic ?? "___________");
      doc.moveDown(0.3);

      doc.font("Helvetica-Bold").text("Сабақтың мақсаты:");
      doc.font("Helvetica").text(analysis?.lessonPurpose ?? lesson?.lessonPurpose ?? "___________");
      doc.moveDown(0.3);

      doc.font("Helvetica-Bold").text("Сабақтың жабдықталуы:");
      doc.font("Helvetica").text(analysis?.equipment ?? lesson?.equipment ?? "___________");
      doc.moveDown(0.5);

      // Table 1: student survey
      doc.font("Helvetica-Bold").text("Оқушыларды сұраудың схемалық кестесі:");
      doc.moveDown(0.2);
      this.drawTable(doc, ["1 топ", "2 топ", "3 топ", "4 топ"],
        (analysis?.studentSurveyTable ?? []) as string[][], pageWidth);
      doc.moveDown(0.5);

      // Table 2: lesson progress
      doc.font("Helvetica-Bold").text("Сабақтың барысы:");
      doc.moveDown(0.2);
      this.drawTable(doc,
        ["Сабақ кезеңдері", "Оқытудың түрлері мен әдістері", "Мұғалім іс-әрекеті", "Оқушы іс-әрекеті", "Ұсыныстар"],
        (analysis?.lessonProgressTable ?? []) as string[][], pageWidth);
      doc.moveDown(0.5);

      // Conclusion
      doc.font("Helvetica-Bold").text("Қорытынды:");
      doc.font("Helvetica").text(analysis?.conclusion ?? "___________");
      doc.moveDown(0.3);

      doc.font("Helvetica-Bold").text("Сабақты жақсарту мақсатындағы ұсыныстар:");
      doc.font("Helvetica").text(analysis?.recommendations ?? "___________");
      doc.moveDown(0.8);

      // Signatures
      doc.font("Helvetica").fontSize(10);
      const teacherDate = analysis?.teacherSignDate
        ? new Date(analysis.teacherSignDate).toLocaleDateString("ru-RU") : "___________";
      const analyzerDate = analysis?.analyzerSignDate
        ? new Date(analysis.analyzerSignDate).toLocaleDateString("ru-RU") : "___________";
      doc.text(`Қорытынды және ұсыныспен танысқан мұғалім: ${analysis?.teacherSignature ?? "___________"}   Күні: ${teacherDate}`);
      doc.moveDown(0.3);
      doc.text(`Сабаққа қатысушы: ${analysis?.analyzerSignature ?? "___________"}   Күні: ${analyzerDate}`);

      doc.end();
    });
  }

  private drawTable(doc: PDFKit.PDFDocument, headers: string[], rows: string[][], tableWidth: number) {
    const colWidth = tableWidth / headers.length;
    const rowHeight = 20;
    const x0 = doc.page.margins.left;
    let y = doc.y;

    // Header row
    doc.font("Helvetica-Bold").fontSize(9);
    headers.forEach((h, i) => {
      doc.rect(x0 + i * colWidth, y, colWidth, rowHeight).stroke();
      doc.text(h, x0 + i * colWidth + 2, y + 4, { width: colWidth - 4, lineBreak: false });
    });
    y += rowHeight;

    // Data rows
    doc.font("Helvetica").fontSize(9);
    if (!rows || rows.length === 0) {
      headers.forEach((_, i) => {
        doc.rect(x0 + i * colWidth, y, colWidth, rowHeight).stroke();
      });
      y += rowHeight;
    } else {
      rows.forEach((row) => {
        headers.forEach((_, i) => {
          const cell = row[i] ?? "";
          doc.rect(x0 + i * colWidth, y, colWidth, rowHeight).stroke();
          doc.text(String(cell), x0 + i * colWidth + 2, y + 4, { width: colWidth - 4, lineBreak: false });
        });
        y += rowHeight;
      });
    }

    doc.y = y;
  }
}
