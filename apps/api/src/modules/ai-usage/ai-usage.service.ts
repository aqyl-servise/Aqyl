import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { AiUsageAlert, AiUsageDaily } from "./ai-usage.entity";
import { Teacher } from "../teachers/entities/teacher.entity";
import { costKzt } from "../../config/ai-pricing";

export const CURRENT_DAILY_LIMIT = 20;
const WARNING_THRESHOLD = 16; // 80% of 20

type Lang = "ru" | "kz" | "en";

const AI_MSGS: Record<Lang, {
  limitExhausted: (limit: number) => string;
  warningLeft: (remaining: number) => string;
}> = {
  ru: {
    limitExhausted: (l) => `Дневной лимит AI-запросов исчерпан (${l}/${l}). Обновится в полночь.`,
    warningLeft: (r) => `Осталось ${r} AI-запроса на сегодня`,
  },
  kz: {
    limitExhausted: (l) => `Күнделікті AI сұраулар лимиті таусылды (${l}/${l}). Түнгі 12-де жаңарады.`,
    warningLeft: (r) => `Бүгін ${r} AI сұрауы қалды`,
  },
  en: {
    limitExhausted: (l) => `Daily AI request limit reached (${l}/${l}). Resets at midnight.`,
    warningLeft: (r) => `${r} AI requests left today`,
  },
};

export interface UserContext {
  userId: string;
  schoolId: string;
  role: string;
}

@Injectable()
export class AiUsageService {
  constructor(
    @InjectRepository(AiUsageDaily) private readonly dailyRepo: Repository<AiUsageDaily>,
    @InjectRepository(AiUsageAlert) private readonly alertRepo: Repository<AiUsageAlert>,
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
  ) {}

  private today(): string {
    return new Date().toISOString().split("T")[0];
  }

  isLimitedRole(role: string): boolean {
    return role === "teacher" || role === "class_teacher";
  }

  async checkAndIncrement(userId: string, schoolId: string, actionType: string, lang: Lang = "ru"): Promise<{
    allowed: boolean;
    warning?: boolean;
    message?: string;
    currentCount?: number;
    limit?: number;
  }> {
    const today = this.today();

    const raw = await this.dailyRepo
      .createQueryBuilder("u")
      .select("COALESCE(SUM(u.count), 0)", "total")
      .where("u.userId = :userId AND u.date = :date", { userId, date: today })
      .getRawOne<{ total: string }>();

    const currentTotal = Number(raw?.total) || 0;

    if (currentTotal >= CURRENT_DAILY_LIMIT) {
      return {
        allowed: false,
        message: AI_MSGS[lang].limitExhausted(CURRENT_DAILY_LIMIT),
      };
    }

    const existing = await this.dailyRepo.findOne({ where: { userId, date: today, actionType } });
    if (existing) {
      await this.dailyRepo.increment({ id: existing.id }, "count", 1);
    } else {
      await this.dailyRepo.save(
        this.dailyRepo.create({ userId, schoolId, actionType, date: today, count: 1 }),
      );
    }

    const newTotal = currentTotal + 1;

    if (newTotal === WARNING_THRESHOLD) {
      return {
        allowed: true,
        warning: true,
        message: AI_MSGS[lang].warningLeft(CURRENT_DAILY_LIMIT - newTotal),
        currentCount: newTotal,
        limit: CURRENT_DAILY_LIMIT,
      };
    }

    return { allowed: true, warning: false, currentCount: newTotal, limit: CURRENT_DAILY_LIMIT };
  }

  async recordTokens(
    userId: string,
    schoolId: string,
    actionType: string,
    tokensInput: number,
    tokensOutput: number,
    model: string,
  ): Promise<void> {
    const today = this.today();
    const cost = costKzt(model, tokensInput, tokensOutput);

    const row = await this.dailyRepo.findOne({ where: { userId, date: today, actionType } });
    if (row) {
      row.tokensInput += tokensInput;
      row.tokensOutput += tokensOutput;
      row.costKzt += cost;
      await this.dailyRepo.save(row);
      return;
    }

    // Строки может не быть: лимитёр (checkAndIncrement) заводит её под своим
    // типом действия, а сюда почти всегда приходит более точный — например,
    // лимит считается по 'ai_generate', а запись идёт как 'kmzh_generate'.
    // Раньше такой вызов просто терялся.
    //
    // count: 0 — намеренно. Вызов уже посчитан лимитёром в своей строке, а
    // дневной лимит проверяется как SUM(count) по всем типам действий, так что
    // единица здесь урезала бы норму пользователя вдвое.
    await this.dailyRepo.save(
      this.dailyRepo.create({
        userId,
        schoolId: schoolId ?? undefined,
        actionType,
        date: today,
        count: 0,
        tokensInput,
        tokensOutput,
        costKzt: cost,
      }),
    );
  }

  async getTodayUsage(userId: string): Promise<{ count: number; limit: number; remaining: number; percentage: number }> {
    const today = this.today();
    const raw = await this.dailyRepo
      .createQueryBuilder("u")
      .select("COALESCE(SUM(u.count), 0)", "total")
      .where("u.userId = :userId AND u.date = :date", { userId, date: today })
      .getRawOne<{ total: string }>();

    const count = Number(raw?.total) || 0;
    return {
      count,
      limit: CURRENT_DAILY_LIMIT,
      remaining: Math.max(0, CURRENT_DAILY_LIMIT - count),
      percentage: Math.round((count / CURRENT_DAILY_LIMIT) * 100),
    };
  }

  async getSchoolSummary(schoolId: string, period: "today" | "week" | "month" = "today") {
    const today = this.today();
    const qb = this.dailyRepo
      .createQueryBuilder("u")
      .select("COALESCE(SUM(u.count), 0)", "totalCount")
      .addSelect("COALESCE(SUM(u.costKzt), 0)", "totalCostKzt")
      .addSelect("COUNT(DISTINCT u.userId)", "activeTeachers")
      .where("u.schoolId = :schoolId", { schoolId });

    if (period === "week") {
      const d = new Date(); d.setDate(d.getDate() - 7);
      qb.andWhere("u.date >= :start", { start: d.toISOString().split("T")[0] });
    } else if (period === "month") {
      const d = new Date(); d.setDate(d.getDate() - 30);
      qb.andWhere("u.date >= :start", { start: d.toISOString().split("T")[0] });
    } else {
      qb.andWhere("u.date = :today", { today });
    }

    const raw = await qb.getRawOne<{ totalCount: string; totalCostKzt: string; activeTeachers: string }>();
    return {
      totalCount: Number(raw?.totalCount) || 0,
      totalCostKzt: Number(raw?.totalCostKzt) || 0,
      activeTeachers: Number(raw?.activeTeachers) || 0,
      period,
    };
  }

  async getTeacherBreakdown(schoolId: string, date?: string) {
    const targetDate = date || this.today();
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
    const weekStart = weekAgo.toISOString().split("T")[0];
    const monthStart = monthAgo.toISOString().split("T")[0];

    const rows = await this.dailyRepo
      .createQueryBuilder("u")
      .select("u.userId", "userId")
      .addSelect(`COALESCE(SUM(CASE WHEN u.date = :targetDate THEN u.count ELSE 0 END), 0)`, "todayCount")
      .addSelect(`COALESCE(SUM(CASE WHEN u.date >= :weekStart THEN u.count ELSE 0 END), 0)`, "weekCount")
      .addSelect("COALESCE(SUM(u.count), 0)", "monthCount")
      .addSelect(`COALESCE(SUM(CASE WHEN u.date >= :monthStart THEN u.costKzt ELSE 0 END), 0)`, "costKzt")
      .where("u.schoolId = :schoolId AND u.date >= :monthStart", { schoolId, monthStart, weekStart, targetDate })
      .groupBy("u.userId")
      .orderBy('"todayCount"', "DESC")
      .getRawMany<{ userId: string; todayCount: string; weekCount: string; monthCount: string; costKzt: string }>();

    if (rows.length === 0) return [];

    const teacherIds = rows.map((r) => r.userId);
    const teachers = await this.teacherRepo.findBy({ id: In(teacherIds) });
    const teacherMap = new Map(teachers.map((t) => [t.id, t]));

    return rows.map((r) => {
      const teacher = teacherMap.get(r.userId);
      return {
        userId: r.userId,
        teacherName: teacher?.fullName ?? r.userId,
        subject: teacher?.subject ?? "—",
        todayCount: Number(r.todayCount),
        weekCount: Number(r.weekCount),
        monthCount: Number(r.monthCount),
        costKzt: Number(r.costKzt),
      };
    });
  }

  async getChartData(schoolId: string, days = 30) {
    const daysAgo = new Date(); daysAgo.setDate(daysAgo.getDate() - days);
    const startDate = daysAgo.toISOString().split("T")[0];

    const rows = await this.dailyRepo
      .createQueryBuilder("u")
      .select("u.date", "date")
      .addSelect("COALESCE(SUM(u.count), 0)", "totalCount")
      .addSelect("COALESCE(SUM(u.costKzt), 0)", "totalCostKzt")
      .where("u.schoolId = :schoolId AND u.date >= :startDate", { schoolId, startDate })
      .groupBy("u.date")
      .orderBy("u.date", "ASC")
      .getRawMany<{ date: string; totalCount: string; totalCostKzt: string }>();

    return rows.map((r) => ({
      date: r.date,
      totalCount: Number(r.totalCount),
      totalCostKzt: Number(r.totalCostKzt),
    }));
  }

  async getMostActiveToday(schoolId: string): Promise<{ teacherName: string; count: number } | null> {
    const today = this.today();
    const rows = await this.dailyRepo
      .createQueryBuilder("u")
      .select("u.userId", "userId")
      .addSelect("COALESCE(SUM(u.count), 0)", "total")
      .where("u.schoolId = :schoolId AND u.date = :today", { schoolId, today })
      .groupBy("u.userId")
      .orderBy('"total"', "DESC")
      .limit(1)
      .getRawMany<{ userId: string; total: string }>();

    if (rows.length === 0) return null;
    const teacher = await this.teacherRepo.findOne({ where: { id: rows[0].userId } });
    return { teacherName: teacher?.fullName ?? rows[0].userId, count: Number(rows[0].total) };
  }

  /**
   * Себестоимость генерации по операциям и моделям (generation_cost_log).
   *
   * Раньше эта цифра висела строкой на экране раздаток у учителя — внутренняя
   * метрика, которой там не место. Расчёт и запись в лог не тронуты, изменилось
   * только место показа: сводка доступна администратору.
   *
   * Метрика платформенная, а не школьная: у B2C-учителей schoolId нет, и лог
   * ведётся по уроку, поэтому разрез по школе тут неприменим.
   */
  async getGenerationCost(days = 30): Promise<{
    days: number;
    totalKzt: number;
    lessons: number;
    avgPerLessonKzt: number;
    byOperation: { operation: string; model: string; count: number; kzt: number; avgOutTokens: number }[];
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.dailyRepo.manager
      .createQueryBuilder()
      .select('g."operation"', 'operation')
      .addSelect('g."model"', 'model')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(g."costKzt"), 0)', 'kzt')
      .addSelect('COALESCE(AVG(g."outputTokens"), 0)', 'avgOut')
      .from('generation_cost_log', 'g')
      .where('g."createdAt" >= :since', { since })
      .groupBy('g."operation"')
      .addGroupBy('g."model"')
      .orderBy('"kzt"', 'DESC')
      .getRawMany<{ operation: string; model: string; count: string; kzt: string; avgOut: string }>();

    const totals = await this.dailyRepo.manager
      .createQueryBuilder()
      .select('COUNT(DISTINCT g."lessonId")', 'lessons')
      .addSelect('COALESCE(SUM(g."costKzt"), 0)', 'kzt')
      .from('generation_cost_log', 'g')
      .where('g."createdAt" >= :since', { since })
      .getRawOne<{ lessons: string; kzt: string }>();

    const totalKzt = Number(totals?.kzt ?? 0);
    const lessons = Number(totals?.lessons ?? 0);
    return {
      days,
      totalKzt,
      lessons,
      avgPerLessonKzt: lessons ? totalKzt / lessons : 0,
      byOperation: rows.map((r) => ({
        operation: r.operation,
        model: r.model,
        count: Number(r.count),
        kzt: Number(r.kzt),
        avgOutTokens: Math.round(Number(r.avgOut)),
      })),
    };
  }
}
