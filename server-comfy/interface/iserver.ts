
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

export enum ServerGPU {
    RTX_4090 = "RTX_4090",
    RTX_3090 = "RTX_3090",
}

export enum CanGenerate {
    YES = "YES",
    YES_WITH_CONDITION = "YES_WITH_CONDITION",
    NO = "NO",
}

export const listGPU = [ServerGPU.RTX_4090, ServerGPU.RTX_3090]

// For getting all servers response
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
    created_at: Date;
    updated_at: Date;
    deleted_at: Date;
}