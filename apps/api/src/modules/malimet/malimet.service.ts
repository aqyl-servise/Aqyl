import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MalimetDocument } from './entities/malimet-document.entity';
import { MalimetGenerateDto, MalimetFormDataDto } from './dto/malimet-generate.dto';
import { MalimetSaveDto } from './dto/malimet-save.dto';

function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 9) return `${year}-${year + 1}`;
  return `${year - 1}-${year}`;
}

interface TemplateData extends MalimetFormDataDto {
  excellent: MalimetFormDataDto['excellent'] & { count: number };
  good: MalimetFormDataDto['good'] & { count: number };
  failing: MalimetFormDataDto['failing'] & { count: number };
}

@Injectable()
export class MalimetService {
  constructor(
    @InjectRepository(MalimetDocument)
    private readonly repo: Repository<MalimetDocument>,
  ) {}

  async prefill(classroomId: string, _teacherId: string, _schoolId: string) {
    return {
      classroomId,
      academicYear: getCurrentAcademicYear(),
    };
  }

  async generate(dto: MalimetGenerateDto, teacherId: string, schoolId: string): Promise<Buffer> {
    const { formData, lang, format } = dto;

    const data: TemplateData = {
      ...formData,
      endCount: formData.endCount ?? (formData.startCount + formData.arrivedCount - formData.leftCount),
      excellent: { ...formData.excellent, count: formData.excellent.students.length },
      good: { ...formData.good, count: formData.good.students.length },
      failing: { ...formData.failing, count: formData.failing.students.length },
    };

    if (format === 'pdf') {
      return this.generatePdf(data, lang);
    }
    return this.generateWord(data, lang);
  }

  private generatePdf(data: TemplateData, lang: 'kz' | 'ru'): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const PDFDocument = require('pdfkit') as typeof import('pdfkit');
      const doc = new PDFDocument({ margin: 57, size: 'A4' }); // ~2cm margins

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const isKz = lang === 'kz';
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      const L = {
        title: isKz ? 'Мәлімет' : 'Сведения',
        startLabel: isKz ? 'Тоқсан басындағы оқушылар саны:' : 'Количество учащихся на начало четверти:',
        arrivedLabel: isKz ? 'Келген оқушылар:' : 'Прибыло учащихся:',
        leftLabel: isKz ? 'Кеткен оқушылар:' : 'Выбыло учащихся:',
        endLabel: isKz ? 'Тоқсан соңындағы оқушылар саны:' : 'Количество учащихся на конец четверти:',
        excellentLabel: isKz ? 'Өте жақсы оқитын оқушылар:' : 'Отличники:',
        goodLabel: isKz ? 'Жақсы оқитын оқушылар:' : 'Ударники:',
        failingLabel: isKz ? 'Үлгермейтін оқушылар:' : 'Неуспевающие:',
        girlsOf: isKz ? 'оның ішінде қыздар' : 'из них девочек',
        girlsStart: isKz ? 'оның ішіндегі қыздар' : 'из них девочек',
        fromWhere: isKz ? 'қайдан:' : 'откуда:',
        toWhere: isKz ? 'қайда:' : 'куда:',
        teacherLabel: isKz ? 'Сынып жетекшісі:' : 'Классный руководитель:',
        signLabel: isKz ? '(қолы)' : '(подпись)',
        nameLabel: isKz ? '(аты-жөні)' : '(ФИО)',
        quarterWord: isKz ? 'тоқсан' : 'четверть',
        yearWord: isKz ? 'оқу жылы' : 'учебный год',
        classWord: isKz ? 'сынып' : 'класс',
      };

      // Title
      doc.fontSize(14).font('Helvetica-Bold').text(L.title, { align: 'center' });
      doc.fontSize(11).font('Helvetica').text(
        `${data.classroomName} ${L.classWord}   ${data.quarter} ${L.quarterWord}   ${data.academicYear} ${L.yearWord}`,
        { align: 'center' }
      );
      doc.moveDown(0.5);

      const row = (label: string, value: string) => {
        const labelWidth = pageWidth * 0.55;
        const y = doc.y;
        doc.font('Helvetica-Bold').fontSize(11).text(label, { width: labelWidth, continued: false });
        const afterLabel = doc.y;
        doc.font('Helvetica').fontSize(11).text(value, doc.page.margins.left + labelWidth + 8, y, {
          width: pageWidth - labelWidth - 8,
        });
        doc.y = Math.max(afterLabel, doc.y);
        doc.moveDown(0.2);
      };

      row(L.startLabel, `${data.startCount} (${L.girlsStart}: ${data.startGirlCount})`);
      row(L.arrivedLabel, `${data.arrivedCount} ${L.fromWhere} ${data.arrivedFrom || '_____________________'}`);
      row(L.leftLabel, `${data.leftCount} ${L.toWhere} ${data.leftTo || '_____________________'}`);
      row(L.endLabel, `${data.endCount} (${L.girlsOf}: ${data.endGirlCount})`);

      doc.moveDown(0.5);

      const group = (label: string, count: number, girlCount: number, students: { fullName: string }[]) => {
        row(label, `${count} (${L.girlsOf}: ${girlCount})`);
        students.forEach((s, i) => {
          doc.font('Helvetica').fontSize(11).text(`  ${i + 1}. ${s.fullName}`, { indent: 20 });
        });
        doc.moveDown(0.3);
      };

      group(L.excellentLabel, data.excellent.count, data.excellent.girlCount, data.excellent.students);
      group(L.goodLabel, data.good.count, data.good.girlCount, data.good.students);
      group(L.failingLabel, data.failing.count, data.failing.girlCount, data.failing.students);

      doc.moveDown(1.5);
      doc.font('Helvetica-Bold').fontSize(11).text(L.teacherLabel, { continued: true });
      doc.font('Helvetica').text(`  ______________________  ${data.teacherFullName}`);
      doc.fontSize(9).fillColor('#555555').text(
        `                                        ${L.signLabel}               ${L.nameLabel}`,
        { indent: 0 }
      );

      doc.end();
    });
  }

  private async generateWord(data: TemplateData, lang: 'kz' | 'ru'): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {
      Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
      AlignmentType, BorderStyle, WidthType,
    } = require('docx') as typeof import('docx');

    const isKz = lang === 'kz';
    const L = {
      title: isKz ? 'Мәлімет' : 'Сведения',
      subtitle: isKz
        ? `${data.classroomName} сынып     ${data.quarter} тоқсан     ${data.academicYear} оқу жылы`
        : `${data.classroomName} класс     ${data.quarter} четверть     ${data.academicYear} учебный год`,
      startLabel: isKz ? 'Тоқсан басындағы оқушылар саны' : 'Количество учащихся на начало четверти',
      arrivedLabel: isKz ? 'Келген оқушылар' : 'Прибыло учащихся',
      arrivedDetail: isKz
        ? `${data.arrivedCount} қайдан (республикасы, облысы, ауданы, мектебі): ${data.arrivedFrom || '_____'}`
        : `${data.arrivedCount} откуда (республика, область, район, школа): ${data.arrivedFrom || '_____'}`,
      leftLabel: isKz ? 'Кеткен оқушылар' : 'Выбыло учащихся',
      leftDetail: isKz
        ? `${data.leftCount} қайда (республикасы, облысы, ауданы, мектебі): ${data.leftTo || '_____'}`
        : `${data.leftCount} куда (республика, область, район, школа): ${data.leftTo || '_____'}`,
      endLabel: isKz ? 'Тоқсан соңындағы оқушылар саны' : 'Количество учащихся на конец четверти',
      girlsOf: isKz ? 'оның ішінде қыздар' : 'из них девочек',
      girlsStart: isKz ? 'оның ішіндегі қыздар' : 'из них девочек',
      excellentLabel: isKz ? 'Өте жақсы оқитын оқушылар' : 'Отличники',
      goodLabel: isKz ? 'Жақсы оқитын оқушылар' : 'Ударники',
      failingLabel: isKz ? 'Үлгермейтін оқушылар' : 'Неуспевающие',
      teacherLabel: isKz ? 'Сынып жетекшісі' : 'Классный руководитель',
      signLabel: isKz ? '(қолы)' : '(подпись)',
      nameLabel: isKz ? '(аты-жөні)' : '(ФИО)',
    };

    const border = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
    const borders = { top: border, bottom: border, left: border, right: border };

    const makeRow = (label: string, value: string) =>
      new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: 5200, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 22 })] })],
          }),
          new TableCell({
            borders,
            width: { size: 4000, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text: value, size: 22 })] })],
          }),
        ],
      });

    const makeStudentList = (students: { fullName: string }[]) =>
      students.map((s, i) =>
        new Paragraph({
          indent: { left: 400 },
          spacing: { before: 0, after: 0 },
          children: [new TextRun({ text: `${i + 1}. ${s.fullName}`, size: 22 })],
        })
      );

    const makeGroupTable = (label: string, count: number, girlCount: number) =>
      new Table({
        width: { size: 9200, type: WidthType.DXA },
        columnWidths: [5200, 4000],
        rows: [makeRow(label, `${count} (${L.girlsOf}: ${girlCount})`)],
      });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [new TextRun({ text: L.title, bold: true, size: 28 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: L.subtitle, size: 24 })],
          }),

          new Table({
            width: { size: 9200, type: WidthType.DXA },
            columnWidths: [5200, 4000],
            rows: [
              makeRow(L.startLabel, `${data.startCount} (${L.girlsStart}: ${data.startGirlCount})`),
              makeRow(L.arrivedLabel, L.arrivedDetail),
              makeRow(L.leftLabel, L.leftDetail),
              makeRow(L.endLabel, `${data.endCount} (${L.girlsOf}: ${data.endGirlCount})`),
            ],
          }),

          new Paragraph({ spacing: { before: 160, after: 0 }, children: [] }),

          makeGroupTable(L.excellentLabel, data.excellent.count, data.excellent.girlCount),
          ...makeStudentList(data.excellent.students),

          new Paragraph({ spacing: { before: 120, after: 0 }, children: [] }),
          makeGroupTable(L.goodLabel, data.good.count, data.good.girlCount),
          ...makeStudentList(data.good.students),

          new Paragraph({ spacing: { before: 120, after: 0 }, children: [] }),
          makeGroupTable(L.failingLabel, data.failing.count, data.failing.girlCount),
          ...makeStudentList(data.failing.students),

          new Paragraph({ spacing: { before: 400, after: 0 }, children: [] }),

          new Paragraph({
            children: [
              new TextRun({ text: `${L.teacherLabel}:  `, bold: true, size: 22 }),
              new TextRun({ text: '______________________  ', size: 22 }),
              new TextRun({ text: data.teacherFullName, size: 22 }),
            ],
          }),
          new Paragraph({
            indent: { left: 1440 },
            children: [
              new TextRun({ text: `${L.signLabel}               ${L.nameLabel}`, size: 18, color: '555555' }),
            ],
          }),
        ],
      }],
    });

    return Packer.toBuffer(doc);
  }

  async save(dto: MalimetSaveDto, teacherId: string, schoolId: string) {
    const existing = await this.repo.findOne({
      where: {
        classroomId: dto.formData.classroomId,
        quarter: dto.formData.quarter,
        academicYear: dto.formData.academicYear,
        lang: dto.lang,
        schoolId,
      },
    });

    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.repo.update(existing.id, {
        formData: dto.formData as any,
        updatedAt: new Date(),
      });
      return this.repo.findOne({ where: { id: existing.id } });
    }

    return this.repo.save({
      schoolId,
      classroomId: dto.formData.classroomId,
      teacherId,
      quarter: dto.formData.quarter,
      academicYear: dto.formData.academicYear,
      formData: dto.formData as unknown as Record<string, unknown>,
      lang: dto.lang,
    });
  }

  async list(classroomId: string, schoolId: string) {
    return this.repo.find({
      where: { classroomId, schoolId },
      order: { createdAt: 'DESC' },
    });
  }
}
