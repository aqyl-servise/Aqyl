import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ScheduleVersion {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  schoolId!: string;

  @Column()
  name!: string;

  @Column()
  createdBy!: string;

  @Column("jsonb", { nullable: true })
  data: unknown;

  @CreateDateColumn()
  createdAt!: Date;
}
