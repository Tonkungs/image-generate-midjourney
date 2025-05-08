import { Entity, PrimaryGeneratedColumn, Column, DeleteDateColumn, UpdateDateColumn, CreateDateColumn, Unique } from "typeorm";
import { CanGenerate, listGPU, ServerGPU } from "../interface/iserver";
@Entity()
@Unique(['gpu_id', 'machine_id','server_ip']) // กำหนดคีย์รวมให้ไม่ซ้ำกัน
export class Server {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Column()
    gpu_id!: string;

    @Column()
    machine_id!: string;

    @Column()
    server_ip!: string;

    // CanGenerate
    @Column({ type: 'enum', enum: [CanGenerate.YES, CanGenerate.YES_WITH_CONDITION, CanGenerate.NO], enumName: 'CanGenerate', default: CanGenerate.NO})
    can_generate!: string;

    // เวลาพร้อมใช้งาน
    @Column('int')
    availability_seconds!: number;

    // เวลาในการเจนภาพ
    @Column('int')
    generation_seconds!: number;

    @Column('decimal', { precision: 14, scale: 4 })
    tf_lops!: number;

     // DLPerf
    @Column('decimal', { precision: 14, scale: 4 })
    dl_perf!: number;

    @Column('decimal', { precision: 14, scale: 4 })
    price!: number;

    @Column('decimal', { precision: 14, scale: 4 })
    price_gpu!: number;

    // 52.710 gb
    @Column('decimal', { precision: 14, scale: 4 })
    price_hdd!: number;

    @Column({ nullable: true })
    instant_id?: string;

    @Column({ type: 'enum', enum: listGPU, enumName: 'ServerType', default: ServerGPU.RTX_4090 })
    gpu_type!: string;

    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at!: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated_at!: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deleted_at!: Date;

}

