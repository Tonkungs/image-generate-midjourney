
// For creating server request
export interface CreateServerRequest {
    server_url: string;
    server_ip: string;
}

// For server response
export interface ServerResponse {
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

// For getting all servers response
interface GetServersResponse {
    server_list: ServerResponse[];
}

