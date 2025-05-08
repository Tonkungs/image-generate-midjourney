// Interface for the expected structure of server configuration data
export interface IServerConfig {
    id: string;
    vast_ai_api: string;
    cloudflared_url: string;
}

// Interface for the request payload for update operations
export interface IUpdateServerConfigPayload {
    id: string;
    vast_ai_api?: string;
    cloudflared_url?: string;
}
