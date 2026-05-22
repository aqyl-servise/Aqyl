import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity("fl_analytics_cache")
export class FLAnalyticsCache {
  @PrimaryColumn() schoolId!: string;
  @Column({ type: "jsonb" }) data!: object;
  @UpdateDateColumn() updatedAt!: Date;
}
