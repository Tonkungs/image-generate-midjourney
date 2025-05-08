import { Entity, PrimaryGeneratedColumn, Column, DeleteDateColumn, UpdateDateColumn, CreateDateColumn, Unique } from "typeorm";
import { ServerStage } from "../interface/iserver";
@Entity()
@Unique(['server_ip', 'server_url']) // กำหนดคีย์รวมให้ไม่ซ้ำกัน
export class ServerAvailable {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Column()
    server_ip!: string;

    @Column()
    server_url!: string;

    @Column({ default: 0 })
    restart_round!: number;

    @Column({ type: 'enum', enum: [ServerStage.START, ServerStage.READY, ServerStage.ACTIVATE, ServerStage.STOP, ServerStage.DESTROY], enumName: 'ServerStage', default: 'START' })
    stage!: string;
    
    @Column({ default: null })
    client_id!: string;
    
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at!: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated_at!: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deleted_at!: Date;

}

