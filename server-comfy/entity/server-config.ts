import { Column, Entity } from "typeorm";
@Entity()
export class ConfigServer {
    @Column({ primary: true })
    id!:string
    
    @Column()
    vast_ai_api!: string;

    @Column()
    cloudflared_url!: string;

    @Column()
    hf_token!: string
}