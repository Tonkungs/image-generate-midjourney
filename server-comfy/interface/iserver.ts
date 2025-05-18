import { Repository } from "typeorm";
import { ServerAvailable } from "../entity/server-available";
import { ConfigServer } from "../entity/server-config";
import { Server } from "../entity/server";
import { IServerConfig } from "./iconfig";

// For creating server request
export interface CreateServerHisRequest {
    server_url: string;
    server_ip: string;
}

// For server response
export interface ServerHisResponse {
    id: number;
    server_url: string;
    server_ip: string;
    stage: string;
    restart_round: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

// START | READY | ACTIVATE | STOP | DESTROY
// convert to enum
export enum ServerStage {
    START = "START",
    READY = "READY",
    ACTIVATE = "ACTIVATE",
    STOP = "STOP",
    DESTROY = "DESTROY"
}

export const listOnlineServer = [
    ServerStage.START,
    ServerStage.READY,
    ServerStage.ACTIVATE,
]

export const listACtiveServer = [
    ServerStage.ACTIVATE,
]

export enum ServerGPU {
    RTX_4090 = "RTX_4090",
    RTX_3090 = "RTX_3090",
}

export const ServerGPU2Vast = {
    "RTX_4090": "RTX 4090",
    "RTX_3090": "RTX 3090",
}

// export type GpuType = keyof typeof ServerGPU2Vast;

// export const ServerGPU2Vast = {
//   RTX_4090: "RTX 4090",
//   RTX_3090: "RTX 3090",
// } ;

export enum CanGenerate {
    YES = "YES",
    YES_WITH_CONDITION = "YES_WITH_CONDITION",
    NO = "NO",
}

export const RAM_USED = 24 // 24GB

export const listGPU = [ServerGPU.RTX_4090, ServerGPU.RTX_3090]

// For getting all servers response
export interface ServerHisResponse {
    id: number;
    server_url: string;
    server_ip: string;
    instant_id: number;
    stage: string;
    restart_round: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}


export interface IResponseData<T> {
    message: string;
    data: T;
    error?: string | null;
}

export interface IServer {
    id: number;
    gpu_id: string;
    machine_id: string;
    server_ip: string;
    can_generate: string;
    availability_seconds: number;
    generation_seconds: number;
    tf_lops: number;
    dl_perf: number;
    price: number;
    price_gpu: number;
    price_hdd: number;
    gpu_type: string;
    is_rentable?: boolean;
    server_status?: string;
    instant_id?: number;
    ask_contract_id?: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date;
}

export interface IQueComfy {
    queue_pending: [],
    queue_running: [],
}

export interface IRepository {
   serverRepository: Repository<Server>;
   serverAvailableRepository: Repository<ServerAvailable>;
   serverConfigRepository: Repository<ConfigServer>;
}

export interface IServerConReload {
    reloadConfig(): Promise<void> 
    configServer :IServerConfig
}