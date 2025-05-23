import dotenv from 'dotenv';
dotenv.config();
import WebSocket from 'ws';
import axios from 'axios';
// import DataDBHandler, { IDataPromt } from "../src/util/db";
import Logs from "../src/logs";
import Ut from "../src/util/util";
import DataDBHandler, { Database } from "../src/db/database";
import { ImageEntity } from '../src/db/entities/image';
import { Server } from '../server-comfy/entity/server';
import { ServerAvailable } from '../server-comfy/entity/server-available';
import { ServerStage } from '../server-comfy/interface/iserver';

interface IComfyConfig {
  serverAddress: string;
  STEP: number;
  db: Database;
  logs?: Logs;
  serverAddressList?: string[];
}

interface IWS {
  ServerAvailableID: number;
  ws?: WebSocket;
  url: string;
  cloudflare_url?: string;
  client_id: string;
  isAvailable: boolean;
  promtID: number;
  hashImageID: string;
  reconnectAttempts: number;
  inactivityTimeout: NodeJS.Timeout | null;
  ImageEntity: ImageEntity;
  ServerEntity?: ServerAvailable;
}
interface IWSMap {
  [url: string]: IWS;
}

interface IServerUrl {
  [string: string]: string;
}
class ComfyUIPromptProcessor {
  private serverAddress: string;
  private STEP: number;
  private db: Database;
  private wsList: IWS[] = [];
  private wsMAP: IWSMap = {};
  private logs: Logs;
  private isWait: boolean = false;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectDelay = 1000;
  private TOKENNN = `cdc62edb699c6d903d18f0e832a64c63a9f0ec07c8aa63a81084f4ac745c193f`;
  private TOKEN = `?token=${this.TOKENNN}`;
  // private serverURL: IServerUrl;

  constructor (config: IComfyConfig) {
    this.validateConfig(config);
    this.serverAddress = config.serverAddress;
    this.STEP = config.STEP;
    this.db = config.db;
    this.logs = config.logs as Logs;
    this.registerShutdownHandlers();

  }

  private validateConfig(config: IComfyConfig): void {
    if (!config.serverAddress) throw new Error("Server address is required");
    if (!config.logs) throw new Error("Logs is required");
  }

  private initializeWebSocketListwithDB(serverAddressList: ServerAvailable[]): void {
    // 1. กรองเฉพาะ server ที่ยังอยู่ใน serverAddressList
    this.wsList = this.wsList.filter(server => {
      return serverAddressList.some(serverAddress => serverAddress.server_url === server.cloudflare_url);
    });

    // 2. เพิ่ม server ใหม่ที่ยังไม่มีใน wsList
    serverAddressList.forEach(serverAddress => {
      const exists = this.wsList.some(server => server.cloudflare_url === serverAddress.server_url);

      if (!exists) {
        this.wsList.push({
          ServerAvailableID: serverAddress.id,
          url: Ut.RemoveHttpsPrefix(serverAddress.server_url),
          cloudflare_url: serverAddress.server_url,
          client_id: serverAddress.client_id,
          isAvailable: true,
          promtID: 0,
          hashImageID: "",
          reconnectAttempts: 0,
          inactivityTimeout: null,
          ImageEntity: new ImageEntity(),
          ServerEntity: serverAddress
        });
      }
    });
  }

  private initialWebSockerMap(serverAddressList: ServerAvailable[]): void {
    serverAddressList.forEach(serverAddress => {
      const exists = this.wsMAP[serverAddress.server_url];
      if (!exists) {
        this.logs.info("New Server", serverAddress.server_url)
        this.wsMAP[serverAddress.server_url] = {
          ServerAvailableID: serverAddress.id,
          url: Ut.RemoveHttpsPrefix(serverAddress.server_url),
          cloudflare_url: serverAddress.server_url,
          client_id: serverAddress.client_id,
          isAvailable: true,
          promtID: 0,
          hashImageID: "",
          reconnectAttempts: 0,
          inactivityTimeout: null,
          ImageEntity: new ImageEntity(),
          ServerEntity: serverAddress
        };
      } else {
        // console.log('มีแล้ว')
        // delete this.wsMAP[serverAddress.server_url]
      }
    });
  }

  private generateClientId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private async queuePrompt(serverAddress: string, prompt: object): Promise<any> {
    try {
      const response = await axios.post(`http://${serverAddress}/prompt${this.TOKEN}`, prompt);
      return response.data;
    } catch (error) {
      this.logs.error(`Error queuing prompt`, { prompt, error });
      throw error;
    }
  }

  private generateRandomNoise(): string {
    return Array.from({ length: 15 }, (_, i) => i === 0 ? Math.floor(Math.random() * 9) + 1 : Math.floor(Math.random() * 10)).join('');
  }

  private getPromptcolab(params: string, noise: string): any {
    return {
      "prompt": {
        "1": { "inputs": { "unet_name": "flux1-dev-Q4_K_S.gguf" }, "class_type": "UnetLoaderGGUF", "_meta": { "title": "Unet Loader (GGUF)" } },
        "2": { "inputs": { "model": ["1", 0], "conditioning": ["11", 0] }, "class_type": "BasicGuider", "_meta": { "title": "BasicGuider" } },
        "3": { "inputs": { "noise": ["4", 0], "guider": ["2", 0], "sampler": ["5", 0], "sigmas": ["6", 0], "latent_image": ["7", 0] }, "class_type": "SamplerCustomAdvanced", "_meta": { "title": "SamplerCustomAdvanced" } },
        "4": { "inputs": { "noise_seed": noise }, "class_type": "RandomNoise", "_meta": { "title": "RandomNoise" } },
        "5": { "inputs": { "sampler_name": "euler" }, "class_type": "KSamplerSelect", "_meta": { "title": "KSamplerSelect" } },
        "6": { "inputs": { "scheduler": "simple", "steps": this.STEP, "denoise": 1, "model": ["1", 0] }, "class_type": "BasicScheduler", "_meta": { "title": "BasicScheduler" } },
        "7": { "inputs": { "width": 1280, "height": 720, "batch_size": 1 }, "class_type": "EmptyLatentImage", "_meta": { "title": "Empty Latent Image" } },
        "8": { "inputs": { "samples": ["3", 0], "vae": ["9", 0] }, "class_type": "VAEDecode", "_meta": { "title": "VAE Decode" } },
        "9": { "inputs": { "vae_name": "ae.safetensors" }, "class_type": "VAELoader", "_meta": { "title": "Load VAE" } },
        "10": { "inputs": { "filename_prefix": "api_v2_", "images": ["8", 0] }, "class_type": "SaveImage", "_meta": { "title": "Save Image" } },
        "11": { "inputs": { "guidance": 3.5, "conditioning": ["12", 0] }, "class_type": "FluxGuidance", "_meta": { "title": "FluxGuidance" } },
        "12": { "inputs": { "text": params, "clip": ["13", 0] }, "class_type": "CLIPTextEncode", "_meta": { "title": "CLIP Text Encode (Prompt)" } },
        "13": { "inputs": { "clip_name1": "t5-v1_1-xxl-encoder-Q4_K_S.gguf", "clip_name2": "clip_l.safetensors", "type": "flux" }, "class_type": "DualCLIPLoaderGGUF", "_meta": { "title": "DualCLIPLoader (GGUF)" } }
      }
    };
  }

  // flux
  private getPrompt(params: string, noise: string): any {
    return {
      "prompt": {
        "6": {
          "inputs": {
            "text": params,
            "clip": [
              "11",
              0
            ]
          },
          "class_type": "CLIPTextEncode",
          "_meta": {
            "title": "CLIP Text Encode (Positive Prompt)"
          }
        },
        "8": {
          "inputs": {
            "samples": [
              "13",
              0
            ],
            "vae": [
              "10",
              0
            ]
          },
          "class_type": "VAEDecode",
          "_meta": {
            "title": "VAE Decode"
          }
        },
        "9": {
          "inputs": {
            "filename_prefix": "ComfyUI",
            "images": [
              "8",
              0
            ]
          },
          "class_type": "SaveImage",
          "_meta": {
            "title": "Save Image"
          }
        },
        "10": {
          "inputs": {
            "vae_name": "ae.safetensors"
          },
          "class_type": "VAELoader",
          "_meta": {
            "title": "Load VAE"
          }
        },
        "11": {
          "inputs": {
            "clip_name1": "t5xxl_fp16.safetensors",
            "clip_name2": "clip_l.safetensors",
            "type": "flux",
            "device": "default"
          },
          "class_type": "DualCLIPLoader",
          "_meta": {
            "title": "DualCLIPLoader"
          }
        },
        "12": {
          "inputs": {
            "unet_name": "flux1-dev.safetensors",
            "weight_dtype": "default"
          },
          "class_type": "UNETLoader",
          "_meta": {
            "title": "Load Diffusion Model"
          }
        },
        "13": {
          "inputs": {
            "noise": [
              "25",
              0
            ],
            "guider": [
              "22",
              0
            ],
            "sampler": [
              "16",
              0
            ],
            "sigmas": [
              "17",
              0
            ],
            "latent_image": [
              "27",
              0
            ]
          },
          "class_type": "SamplerCustomAdvanced",
          "_meta": {
            "title": "SamplerCustomAdvanced"
          }
        },
        "16": {
          "inputs": {
            "sampler_name": "euler"
          },
          "class_type": "KSamplerSelect",
          "_meta": {
            "title": "KSamplerSelect"
          }
        },
        "17": {
          "inputs": {
            "scheduler": "simple",
            "steps": this.STEP,
            "denoise": 1,
            "model": [
              "30",
              0
            ]
          },
          "class_type": "BasicScheduler",
          "_meta": {
            "title": "BasicScheduler"
          }
        },
        "22": {
          "inputs": {
            "model": [
              "30",
              0
            ],
            "conditioning": [
              "26",
              0
            ]
          },
          "class_type": "BasicGuider",
          "_meta": {
            "title": "BasicGuider"
          }
        },
        "25": {
          "inputs": {
            "noise_seed": noise
          },
          "class_type": "RandomNoise",
          "_meta": {
            "title": "RandomNoise"
          }
        },
        "26": {
          "inputs": {
            "guidance": 3.5,
            "conditioning": [
              "6",
              0
            ]
          },
          "class_type": "FluxGuidance",
          "_meta": {
            "title": "FluxGuidance"
          }
        },
        "27": {
          "inputs": {
            "width": 1280,
            "height": 720,
            "batch_size": 1
          },
          "class_type": "EmptySD3LatentImage",
          "_meta": {
            "title": "EmptySD3LatentImage"
          }
        },
        "30": {
          "inputs": {
            "max_shift": 1.15,
            "base_shift": 0.5,
            "width": 1280,
            "height": 720,
            "model": [
              "12",
              0
            ]
          },
          "class_type": "ModelSamplingFlux",
          "_meta": {
            "title": "ModelSamplingFlux"
          }
        }
      }
    };
  }

  public mockDBGetServer():ServerAvailable[] {
    return [
      {
        id: 74,
        server_url: "https://sheet-marriage-principle-lace.trycloudflare.com",
        server_ip: '',
        restart_round: 0,
        stage: '',
        client_id: '',
        instant_id: 0,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: new Date(),
      }]
  }

  public async startDB(): Promise<void> {
    try {
      this.logs.info("Starting Db...");
      await this.db.initialize();

      while (true) {
        const serverList = await this.db.getAllServers(ServerStage.ACTIVATE);
        // const serverList = this.mockDBGetServer()
        if (serverList.length === 0) {
          this.logs.info("No server found, Waiting for 10 second for activate server");
          await Ut.Delay(10000);
          continue;
        }

        // this.initializeWebSocketListwithDB(serverList);
        this.initialWebSockerMap(serverList);
        // console.log("New Loop =============================");
        // await this.db.updateServerAva(74, ServerStage.STOP);
        for (const serverURL in this.wsMAP) {
          // console.log('วนก่อนนนนนน')
          if (Object.prototype.hasOwnProperty.call(this.wsMAP, serverURL)) {
            if (this.wsMAP[serverURL].ws) continue;
            if (!this.wsMAP[serverURL].isAvailable) continue;
            // console.log(this.wsMAP[serverURL].url)
            try {
              const ws = new WebSocket(`wss://${this.wsMAP[serverURL].url}/ws?clientId=${this.wsMAP[serverURL].client_id}&token=${this.TOKENNN}`);
              this.wsMAP[serverURL].ws = ws
            } catch (err) {
              this.wsMAP[serverURL].ws = undefined;
            }

            if (!this.wsMAP[serverURL].ws) continue;
            this.processWS(this.wsMAP[serverURL].ws as WebSocket, serverURL);
          }
        }
        // this.logs.info("Wait for 10 seconds to check server again");
        await Ut.Delay(3000);
      }
    } catch (error) {
      console.log("error =>", error);
      this.logs.error(`Error starting processor ${error}`, { error });
    }

  }

  private async processWS(ws: WebSocket, serverNo: string): Promise<void> {
    const resetInactivityTimer = () => {
      if (this.wsMAP[serverNo].inactivityTimeout) clearTimeout(this.wsMAP[serverNo].inactivityTimeout);
      this.wsMAP[serverNo].inactivityTimeout = setTimeout(() => {
        this.logs.info(`No message received from server ${serverNo} for 1 minute. Reconnecting...`);
        this.wsMAP[serverNo].isAvailable = false;
        ws.terminate();
      }, 1 * 60 * 1000);
    };

    ws.removeAllListeners();

    ws.on('open', async () => {
      this.logs.info(`WebSocket connected from server no ${serverNo}`);
      this.wsMAP[serverNo].reconnectAttempts = 0;
      this.wsMAP[serverNo].isAvailable = true;
      resetInactivityTimer();
    });

    ws.on('message', async (data: WebSocket.Data) => {
      resetInactivityTimer();
      const message = JSON.parse(data.toString());
      if (message.type === "progress") {
        this.handleProgressMessage(message, serverNo);
      }

      if (message.type === "status" && message.data.status.exec_info.queue_remaining === 0) {
        await this.handleStatusMessage(serverNo);
      }
    });

    ws.on('error',async (error) => {
      // resetInactivityTimer();
      console.log("error =>", error);
      await this.handleWebSocketClose('error', serverNo);
    });

    ws.on('close', async (event) => {
      // resetInactivityTimer();
      console.log("close =>", event);
      await this.handleWebSocketClose(event, serverNo);
    });
  }

  private async handleProgressMessage(message: any, serverNo: string): Promise<void> {
    this.logs.info(`Progress: ${message.data.value}/${message.data.max} from server no ${serverNo}`);

    if (message.data.value === message.data.max) {
      try {
        if (!this.wsMAP[serverNo].promtID) {
          const result = await this.db.findByPromtId(message.data.prompt_id);
          if (!result) {
            this.logs.error(`Error finding prompt text from server no ${serverNo} promtID is ${message.data.prompt_id} To Next Round`, { result, serverNo });
            return;
          }
          this.wsMAP[serverNo].promtID = result.id;
          this.wsMAP[serverNo].ImageEntity = result;
        }
        if (this.wsMAP[serverNo].ImageEntity) {
          await this.updateStageByID(this.wsMAP[serverNo].ImageEntity as ImageEntity, "WAITING_DOWNLOAD", message.data.prompt_id);
          this.logs.info(`Updating prompt ${this.wsMAP[serverNo].promtID} to WAITING_DOWNLOAD from server no ${serverNo}`);
        }
      } catch (error) {
        console.log("error =>", error);
        // await this.db.updateStageByID(server.promtID, "START", "", server.hashImageID);
        this.logs.error(`Error updating stage from server no ${serverNo}`, { message, error });
        // throw new Error(`Error updating stage from server no ${serverNo}`);
      }
    }
  }

  private async handleStatusMessage(serverNo: string): Promise<void> {
    const maxWaitTime = 300 * 1000; // ตั้ง timeout ไว้ที่ 30 วินาที
    const startTime = Date.now();
    while (this.isWait) {
      this.logs.info(`Waiting from server no ${serverNo} 1 second`);
      await Ut.Delay(1000);

      if (Date.now() - startTime > maxWaitTime) {
        this.logs.error(`Timeout waiting for server no ${serverNo}, continuing process...`);
        this.wsMAP[serverNo].ws?.terminate();
        return;
      }
    }
    this.isWait = true;

    let promtText: ImageEntity | null = null
    try {
      // const promtText = await this.db.findFirstStart('business')
      promtText = await this.db.findFirstStart('Spring 2025')
      // promtText = await this.db.findFirstStart('travel_and_business_2025')
      
      if (!promtText?.id) {
        this.logs.error(`Error finding prompt text from server no ${serverNo}`, { promtText, serverNo });
        return;
      }

      const noise = this.generateRandomNoise();
      const promptText = this.getPrompt(`${promtText.title} high detail 8k not have low quality, not have  worst quality, not have bad anatomy,not have extra limbs,not blurry, not have watermark,not have  cropped`, noise);
      // const promptText = this.getPromptcolab(`${promtText.title} high detail 8k not have low quality, not have  worst quality, not have bad anatomy,not have extra limbs,not blurry, not have watermark,not have  cropped`, noise);
      this.wsMAP[serverNo].promtID = promtText.id;
      this.wsMAP[serverNo].ImageEntity = promtText;
      this.logs.info(`Starting new round ${promtText.id} from server no ${serverNo}`, { promtText });
      const promptResponse = await this.queuePrompt(this.wsMAP[serverNo].url, promptText);
      const hashImageID = promptResponse.prompt_id;
      this.wsMAP[serverNo].hashImageID = hashImageID;
      await this.updateStageByID(promtText, "WAITING", hashImageID);

    } catch (error) {
      if (this.wsMAP[serverNo].hashImageID && promtText && promtText?.id) {
        await this.updateStageByID(promtText, "START", this.wsMAP[serverNo].hashImageID);
        this.logs.error(`Error updating stage from server no ${serverNo}`, { promtText, error });
      }
    } finally {
      this.isWait = false;
    }
  }

  private async handleWebSocketClose(event: any, serverNo: string): Promise<void> {
    // ไม่พบข้อมูล
    // if (!!this.wsMAP[serverNo]?.url) {
    //   return;
    // }

    this.logs.info(`WebSocket closed from server no ${this.wsMAP[serverNo]?.url} when event is ${event}`);
    if (this.wsMAP[serverNo].inactivityTimeout) {
      clearTimeout(this.wsMAP[serverNo].inactivityTimeout);
    }

    if (this.wsMAP[serverNo].reconnectAttempts <= this.maxReconnectAttempts) {
      const timeout = this.reconnectDelay * Math.pow(2, this.wsMAP[serverNo].reconnectAttempts);
      this.logs.info(`Reconnecting server ${serverNo} in ${timeout / 1000} seconds...`);
      setTimeout(() => this.reconnect(serverNo), timeout);
      this.wsMAP[serverNo].reconnectAttempts++;
    } else {
      this.logs.error(`Max reconnect attempts reached for server no ${this.wsMAP[serverNo].url}. Closing connection permanently.`);
      // this.wsMAP[serverNo].ws?.terminate();
      // this.wsMAP[serverNo].ws = undefined;
      // this.wsMAP[serverNo].isAvailable = false;
      await this.db.updateServerAva(this.wsMAP[serverNo].ServerAvailableID, ServerStage.DESTROY);
      delete this.wsMAP[serverNo];
    }
  }

  private reconnect(serverNo: string): void {
    if (this.wsMAP[serverNo] &&!this.wsMAP[serverNo].isAvailable) return;

    if (!this.wsMAP[serverNo]?.url) return
    this.logs.info(`Reconnecting WebSocket for server no ${this.wsMAP[serverNo].url}...`);
    const service = this.wsMAP[serverNo];

    try {
      this.wsMAP[serverNo].ws = new WebSocket(`wss://${service.url}/ws?clientId=${this.wsMAP[serverNo].client_id}&token=${this.TOKENNN}`);
      this.processWS(this.wsMAP[serverNo].ws as WebSocket, serverNo);
    } catch (error) {
      this.logs.error(`Reconnect failed for server no ${this.wsMAP[serverNo].url}`, { error });
    }
  }


  private registerShutdownHandlers(): void {
    const safeShutdown = async () => {
      this.logs.info("Shutting down gracefully...");
      try {
        for (const key in this.wsMAP) {
          if (Object.prototype.hasOwnProperty.call(this.wsMAP, key)) {
            const element = this.wsMAP[key];
            element.ws?.terminate();
            delete this.wsMAP[key];
            if (element.promtID) {
              this.logs.info(`Updating prompt ${element.promtID} to START`);
              await this.updateStageByID(element.ImageEntity as ImageEntity, "START", element.hashImageID);
            }
            this.logs.info(`Closing connection to server ${element.url}`);
          }
        }
      } catch (error) {
        this.logs.error("Error during safe shutdown", { error });
      } finally {
        this.logs.info("Safe shutdown completed.");
        process.exit(0);
      }
    };

    process.on('SIGINT', safeShutdown);
    process.on('SIGTERM', safeShutdown);
    process.on('exit', safeShutdown);
    process.on('uncaughtException', safeShutdown);
  }

  private async updateStageByID(data: ImageEntity, stage: string, promptId: string): Promise<void> {
    // return ;
    await this.db.update(data.id, {
      ...data,
      promt_id: promptId,
      stage: stage
    });
  }
}

const processor = new ComfyUIPromptProcessor({
  serverAddress: process.env.COMFY_SERVER_ADDRESS as string,
  serverAddressList: [
  ],
  STEP: 25,
  db: new Database(),
  logs: new Logs()
});

processor.startDB().catch((error) => {
  console.error('Error in processor:', error);
});
// 13799 4090
// 13863 4090
// 28715 4090