import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("school_info")
export class SchoolInfo {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ nullable: true })
  schoolId?: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  builtYear?: string;

  @Column({ nullable: true })
  capacity?: string;

  @Column({ nullable: true })
  contingent?: string;

  @Column({ nullable: true })
  completeness?: string;

  @UpdateDateColumn()
  updatedAt!: Date;
}
