import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("final_attestation_student")
export class FinalAttestationStudent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "int" })
  grade!: number;

  @Column()
  fullName!: string;

  @Column({ nullable: true })
  subject?: string;

  @Column({ nullable: true })
  iin?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  parentName?: string;

  @Column({ nullable: true })
  schoolId?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
