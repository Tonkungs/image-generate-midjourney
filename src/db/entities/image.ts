import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('images')
export class ImageEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'text', nullable: true })
  image_url?: string;

  @Column({ type: 'text', unique: true, nullable: false })
  title?: string;

  @Column({ type: 'text', nullable: false })
  stage?: string;

  @Column({ type: 'text', nullable: true })
  seed_id?: string;

  @Column({ type: 'bigint', nullable: true })
  round?: number;

  @Column({ type: 'text', nullable: true })
  category?: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  image_start?: Date;

  @Column({ type: 'timestamp', nullable: true })
  image_end?: Date;

  @Column({ type: 'text', nullable: true })
  promt_id?: string;
}

export type StageType = 'START' | 'WAITING' | 'WAITING_DOWNLOAD' | 'DONE' | 'FAIL';

export interface IDataPromt {
  ID?: string;
  Title: string;
  Stage: StageType;
  SeedID: string;
  Round: number;
  ImageUrl: string;
  PromtId?: string
  Category?: string

}