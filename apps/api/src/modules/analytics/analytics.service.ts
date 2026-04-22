import { Injectable } from "@nestjs/common";
import * as XLSX from "xlsx";

type AnalyticsRow = {
  student: string;
  classroom: string;
  topic: string;
  score: number;
  maxScore: number;
};

@Injectable()
export class AnalyticsService {
  parseWorkbook(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);

    const rows: AnalyticsRow[] = rawRows
      .map((row) => ({
        student: String(
          row.Student ?? row.student ?? row["Ученик"] ?? row["Оқушы"] ?? "",
        ).trim(),
        classroom: String(
          row.Class ?? row.class ?? row["Класс"] ?? row["Сынып"] ?? "",
        ).trim(),
        topic: String(
          row.Topic ?? row.topic ?? row["Тема"] ?? row["Тақырып"] ?? "",
        ).trim(),
        score: Number(row.Score ?? row.score ?? row["Балл"] ?? 0),
        maxScore: Number(
          row.MaxScore ?? row.maxScore ?? row["Макс балл"] ?? row.Max ?? 100,
        ),
      }))
      .filter((row) => row.student && row.classroom && row.topic && row.maxScore > 0);

    const averageScore =
      rows.reduce((sum, row) => sum + row.score / row.maxScore, 0) /
      Math.max(rows.length, 1);

    const topicMap = new Map<string, { total: number; count: number }>();
    const classMap = new Map<string, { total: number; count: number }>();

    rows.forEach((row) => {
      const topic = topicMap.get(row.topic) ?? { total: 0, count: 0 };
      topic.total += row.score / row.maxScore;
      topic.count += 1;
      topicMap.set(row.topic, topic);

      const classroom = classMap.get(row.classroom) ?? { total: 0, count: 0 };
      classroom.total += row.score / row.maxScore;
      classroom.count += 1;
      classMap.set(row.classroom, classroom);
    });

    return {
      summary: {
        totalRows: rows.length,
        averageScore: Math.round(averageScore * 100),
        uniqueStudents: new Set(rows.map((row) => row.student)).size,
        uniqueClasses: new Set(rows.map((row) => row.classroom)).size,
      },
      rows,
      topicAnalytics: [...topicMap.entries()].map(([topic, value]) => ({
        topic,
        average: Math.round((value.total / value.count) * 100),
      })),
      classAnalytics: [...classMap.entries()].map(([classroom, value]) => ({
        classroom,
        average: Math.round((value.total / value.count) * 100),
      })),
    };
  }
}
