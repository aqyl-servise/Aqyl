import { Entity, PrimaryColumn, Column } from 'typeorm';

// Seed reference: month → value (Adal Azamat / Bіrtutas tárbie).
@Entity('lesson_value_links')
export class ValueLinkReference {
  @PrimaryColumn({ length: 2 })
  month!: string; // "09".."05" (school months)

  @Column()
  valueKz!: string;

  @Column()
  valueRu!: string;

  @Column()
  valueEn!: string;
}
