import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ScheduleVersion {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

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
