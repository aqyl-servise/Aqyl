import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { KmzhCache } from "./kmzh-cache.entity";
import { School } from "../../schools/entities/school.entity";

@Entity("kmzh_cache_hits")
export class KmzhCacheHit {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => KmzhCache, { nullable: true, onDelete: "SET NULL" })
  cache!: KmzhCache | null;

  @Column({ type: "varchar" })
  userId!: string;

  @ManyToOne(() => School, { nullable: true, onDelete: "SET NULL" })
  school!: School | null;

  @Column({ type: "varchar", length: 10 })
  hitType!: "hit" | "miss";

  @CreateDateColumn()
  createdAt!: Date;
}
