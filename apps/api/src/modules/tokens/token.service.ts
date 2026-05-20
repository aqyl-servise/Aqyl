import { Injectable, ForbiddenException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { SchoolTokenPackage } from "./entities/school-token-package.entity";
import { TokenTransaction } from "./entities/token-transaction.entity";

const NULL_PACKAGE_ID = "00000000-0000-0000-0000-000000000000";

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectRepository(SchoolTokenPackage)
    private readonly packageRepo: Repository<SchoolTokenPackage>,
    @InjectRepository(TokenTransaction)
    private readonly txRepo: Repository<TokenTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  async checkLimit(schoolId: string): Promise<{
    hasTokens: boolean;
    remaining: number;
    total: number;
    usedPercent: number;
  }> {
    if (!schoolId) return { hasTokens: true, remaining: 999999, total: 999999, usedPercent: 0 };

    const pkg = await this.packageRepo.findOne({ where: { schoolId, isActive: true } });

    if (!pkg) {
      return { hasTokens: true, remaining: 999999, total: 999999, usedPercent: 0 };
    }

    const remaining = Number(pkg.totalTokens) - Number(pkg.usedTokens);
    const usedPercent = Math.round((Number(pkg.usedTokens) / Number(pkg.totalTokens)) * 100);

    return {
      hasTokens: remaining > 0 && new Date(pkg.periodEnd) >= new Date(),
      remaining,
      total: Number(pkg.totalTokens),
      usedPercent,
    };
  }

  async deductTokens(params: {
    schoolId?: string | null;
    userId?: string | null;
    inputTokens: number;
    outputTokens: number;
    actionType: string;
    model: string;
    fromCache?: boolean;
    costUsd?: number;
  }): Promise<void> {
    if (!params.schoolId || !params.userId) return;

    const schoolId = params.schoolId;
    const userId = params.userId;
    const total = params.inputTokens + params.outputTokens;

    if (params.fromCache) {
      const pkg = await this.packageRepo.findOne({ where: { schoolId, isActive: true } });
      if (pkg) {
        await this.txRepo.save({
          packageId: pkg.id,
          schoolId,
          userId,
          tokensInput: 0,
          tokensOutput: 0,
          actionType: params.actionType,
          model: params.model,
          fromCache: true,
        });
      }
      return;
    }

    const pkg = await this.packageRepo.findOne({ where: { schoolId, isActive: true } });

    if (!pkg) {
      await this.txRepo.save({
        packageId: NULL_PACKAGE_ID,
        schoolId,
        userId,
        tokensInput: params.inputTokens,
        tokensOutput: params.outputTokens,
        actionType: params.actionType,
        model: params.model,
        costUsd: params.costUsd ?? undefined,
        fromCache: false,
      }).catch(() => {});
      return;
    }

    const result = await this.dataSource.query(`
      UPDATE school_token_packages
      SET "usedTokens" = "usedTokens" + $1,
          "updatedAt" = NOW()
      WHERE id = $2
        AND "isActive" = TRUE
        AND "periodEnd" >= CURRENT_DATE
        AND ("totalTokens" - "usedTokens") >= $1
      RETURNING id, "usedTokens", "totalTokens"
    `, [total, pkg.id]);

    if (result.length === 0) {
      throw new ForbiddenException(
        `Токены школы исчерпаны (${pkg.usedTokens}/${pkg.totalTokens}). Обратитесь к администратору.`,
      );
    }

    await this.txRepo.save({
      packageId: pkg.id,
      schoolId,
      userId,
      tokensInput: params.inputTokens,
      tokensOutput: params.outputTokens,
      actionType: params.actionType,
      model: params.model,
      costUsd: params.costUsd ?? undefined,
      fromCache: false,
    });
  }

  async getUsageStats(schoolId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [byAction, byDay, pkg] = await Promise.all([
      this.txRepo
        .createQueryBuilder("tx")
        .select(["tx.actionType", "SUM(tx.tokensInput + tx.tokensOutput) as total", "COUNT(*) as requests"])
        .where("tx.schoolId = :schoolId", { schoolId })
        .andWhere("tx.createdAt >= :since", { since })
        .groupBy("tx.actionType")
        .orderBy("total", "DESC")
        .getRawMany(),

      this.txRepo
        .createQueryBuilder("tx")
        .select(["DATE_TRUNC('day', tx.\"createdAt\") as day", "SUM(tx.tokensInput + tx.tokensOutput) as total"])
        .where("tx.schoolId = :schoolId", { schoolId })
        .andWhere("tx.createdAt >= :since", { since })
        .groupBy("DATE_TRUNC('day', tx.\"createdAt\")")
        .orderBy("day", "ASC")
        .getRawMany(),

      this.packageRepo.findOne({ where: { schoolId, isActive: true } }),
    ]);

    return { byAction, byDay, package: pkg };
  }

  async createPackage(params: {
    schoolId: string;
    totalTokens: number;
    periodDays: number;
    planType: string;
    notes?: string;
  }) {
    await this.packageRepo.update({ schoolId: params.schoolId, isActive: true }, { isActive: false });

    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + params.periodDays);

    return this.packageRepo.save({
      schoolId: params.schoolId,
      totalTokens: params.totalTokens,
      usedTokens: 0,
      periodStart: new Date().toISOString().split("T")[0],
      periodEnd: periodEnd.toISOString().split("T")[0],
      planType: params.planType,
      notes: params.notes,
      isActive: true,
    });
  }

  calculateCost(usage: { input_tokens: number; output_tokens: number }, model: string): number {
    if (model.includes("sonnet")) {
      return (usage.input_tokens * 3 + usage.output_tokens * 15) / 1_000_000;
    }
    return (usage.input_tokens * 0.25 + usage.output_tokens * 1.25) / 1_000_000;
  }
}
