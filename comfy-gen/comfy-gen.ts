import dotenv from 'dotenv';
dotenv.config();
import WebSocket from 'ws';
import axios from 'axios';
// import DataDBHandler, { IDataPromt } from "../src/util/db";
import Logs from "../src/logs";
import Ut from "../src/util/util";
import DataDBHandler, { Database } from "../src/db/database";
import { ImageEntity } from '../src/db/entities/image';

interface IComfyConfig {
  serverAddress: string;
  STEP: number;
  db: Database;
  logs?: Logs;
  serverAddressList?: string[];
}

interface IWS {
  ws?: WebSocket;
  url: string;
  isAvailable: boolean;
  promtID: number;
  hashImageID: string;
  reconnectAttempts: number;
  inactivityTimeout: NodeJS.Timeout | null;
  ImageEntity: ImageEntity;
}

class ComfyUIPromptProcessor {
  private serverAddress: string;
  private STEP: number;
  private db: Database;
  private wsList: IWS[] = [];
  private logs: Logs;
  private isWait: boolean = false;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectDelay = 1000;
  private TOKENNN = `cdc62edb699c6d903d18f0e832a64c63a9f0ec07c8aa63a81084f4ac745c193f`;
  private TOKEN = `?token=${this.TOKENNN}`;
  constructor (config: IComfyConfig) {
    this.validateConfig(config);
    this.serverAddress = config.serverAddress;
    this.STEP = config.STEP;
    this.db = config.db;
    this.logs = config.logs as Logs;
    this.initializeWebSocketList(config.serverAddressList);
    this.registerShutdownHandlers();
  }

  private validateConfig(config: IComfyConfig): void {
    if (!config.serverAddress) throw new Error("Server address is required");
    if (!config.logs) throw new Error("Logs is required");
  }

  private initializeWebSocketList(serverAddressList?: string[]): void {
    serverAddressList?.forEach(url => {
      this.wsList.push({
        url,
        isAvailable: true,
        promtID: 0,
        hashImageID: "",
        reconnectAttempts: 0,
        inactivityTimeout: null,
        ImageEntity: new ImageEntity()

      });
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


  public async starts(): Promise<void> {
    try {
      this.logs.info("Starting Db...");
      await this.db.initialize();
      for (let index = 0; index < this.wsList.length; index++) {
        if (this.wsList[index].ws) return;
        const service = this.wsList[index];
        this.wsList[index].ws = new WebSocket(`wss://${service.url}/ws?clientId=${this.generateClientId()}&token=${this.TOKENNN}`);

        if (!this.wsList[index].ws) return;
        this.processWS(this.wsList[index].ws as WebSocket, index);
      }
    } catch (error) {

      this.logs.error(`Error starting processor ${error}`, { error });
    }

  }

  private async processWS(ws: WebSocket, serverNo: number): Promise<void> {
    const resetInactivityTimer = () => {
      if (this.wsList[serverNo].inactivityTimeout) clearTimeout(this.wsList[serverNo].inactivityTimeout);
      this.wsList[serverNo].inactivityTimeout = setTimeout(() => {
        this.logs.info(`No message received from server ${serverNo} for 30 seconds. Reconnecting...`);
        this.wsList[serverNo].isAvailable = false;
        ws.terminate();
      }, 1 * 60 * 1000);
    };

    ws.removeAllListeners();

    ws.on('open', async () => {
      this.logs.info(`WebSocket connected from server no ${serverNo}`);
      this.wsList[serverNo].reconnectAttempts = 0;
      this.wsList[serverNo].isAvailable = true;
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

    ws.on('error', (error) => {
      // resetInactivityTimer();
      this.handleWebSocketClose('error', serverNo);
    });

    ws.on('close', async (event) => {
      // resetInactivityTimer();
      this.handleWebSocketClose(event, serverNo);
    });
  }

  private async handleProgressMessage(message: any, serverNo: number): Promise<void> {
    this.logs.info(`Progress: ${message.data.value}/${message.data.max} from server no ${serverNo}`);

    if (message.data.value === message.data.max) {
      try {
        if (!this.wsList[serverNo].promtID) {
          const result = await this.db.findByPromtId(message.data.prompt_id);
          if (!result) {
            this.logs.error(`Error finding prompt text from server no ${serverNo} promtID is ${message.data.prompt_id} To Next Round`, { result, serverNo });
            return;
          }
          this.wsList[serverNo].promtID = result.id;
        }
        // await this.updateStageByID
        await this.updateStageByID(this.wsList[serverNo].ImageEntity as ImageEntity, "WAITING_DOWNLOAD", message.data.prompt_id);
        // await this.db.updateStageByID(this.wsList[serverNo].promtID, "WAITING_DOWNLOAD", "", message.data.prompt_id);
        this.logs.info(`Updating prompt ${this.wsList[serverNo].promtID} to WAITING_DOWNLOAD from server no ${serverNo}`);
      } catch (error) {
        console.log("error =>", error);
        // await this.db.updateStageByID(server.promtID, "START", "", server.hashImageID);
        this.logs.error(`Error updating stage from server no ${serverNo}`, { message, error });
        throw new Error(`Error updating stage from server no ${serverNo}`);
      }
    }
  }

  private async handleStatusMessage(serverNo: number): Promise<void> {
    const maxWaitTime = 300 * 1000; // ตั้ง timeout ไว้ที่ 30 วินาที
    const startTime = Date.now();

    while (this.isWait) {
      this.logs.info(`Waiting from server no ${serverNo} 1 second`);
      await Ut.Delay(1000);

      if (Date.now() - startTime > maxWaitTime) {
        this.logs.error(`Timeout waiting for server no ${serverNo}, continuing process...`);
        this.wsList[serverNo].ws?.terminate();
        return;
      }
    }
    this.isWait = true;

    let promtText: ImageEntity | null = null
    try {
      // const promtText = await this.db.findFirstStart('business')
      promtText = await this.db.findFirstStart('Spring 2025')

      if (!promtText?.id) {
        this.logs.error(`Error finding prompt text from server no ${serverNo}`, { promtText, serverNo });
        // throw new Error(`Error finding prompt text from server no ${serverNo}`);
        return;
      }

      const noise = this.generateRandomNoise();
      const promptText = this.getPrompt(`${promtText.title} high detail 8k not have low quality, not have  worst quality, not have bad anatomy,not have extra limbs,not blurry, not have watermark,not have  cropped`, noise);
      this.wsList[serverNo].promtID = promtText.id;
      this.wsList[serverNo].ImageEntity = promtText;
      this.logs.info(`Starting new round ${promtText.id} from server no ${serverNo}`, { promtText });
      const promptResponse = await this.queuePrompt(this.wsList[serverNo].url, promptText);
      const hashImageID = promptResponse.prompt_id;
      this.wsList[serverNo].hashImageID = hashImageID;
      await this.updateStageByID(promtText, "WAITING", hashImageID);
      // await this.db.updateStageByID(promtText.ID, "WAITING", "", hashImageID);

    } catch (error) {
      if (this.wsList[serverNo].hashImageID && promtText && promtText?.id) {
        await this.updateStageByID(promtText, "START", this.wsList[serverNo].hashImageID);
        // await this.db.updateStageByID(promtText.ID, "START", "", this.wsList[serverNo].hashImageID);
        this.logs.error(`Error updating stage from server no ${serverNo}`, { promtText, error });
      }
    } finally {
      this.isWait = false;
    }
  }

  private handleWebSocketClose(event: any, serverNo: number): void {
    this.logs.info(`WebSocket closed from server no ${this.wsList[serverNo].url} when event is ${event}`);
    if (this.wsList[serverNo].inactivityTimeout) {
      clearTimeout(this.wsList[serverNo].inactivityTimeout);
    }

    if (this.wsList[serverNo].reconnectAttempts <= this.maxReconnectAttempts) {
      const timeout = this.reconnectDelay * Math.pow(2, this.wsList[serverNo].reconnectAttempts);
      this.logs.info(`Reconnecting server ${serverNo} in ${timeout / 1000} seconds...`);
      setTimeout(() => this.reconnect(serverNo), timeout);
      this.wsList[serverNo].reconnectAttempts++;
    } else {
      this.logs.error(`Max reconnect attempts reached for server no ${this.wsList[serverNo].url}. Closing connection permanently.`);
      this.wsList[serverNo].ws?.terminate();
      this.wsList[serverNo].ws = undefined;
      this.wsList[serverNo].isAvailable = false;
    }
  }

  private reconnect(serverNo: number): void {
    // if (!this.wsList[serverNo].isAvailable) return;

    this.logs.info(`Reconnecting WebSocket for server no ${this.wsList[serverNo].url}...`);
    const service = this.wsList[serverNo];

    try {
      this.wsList[serverNo].ws = new WebSocket(`ws://${service.url}/ws?clientId=${this.generateClientId()}`);
      this.processWS(this.wsList[serverNo].ws as WebSocket, serverNo);
    } catch (error) {
      this.logs.error(`Reconnect failed for server no ${this.wsList[serverNo].url}`, { error });
    }
  }


  private registerShutdownHandlers(): void {
    const safeShutdown = async () => {
      this.logs.info("Shutting down gracefully...");
      try {
        for (let index = 0; index < this.wsList.length; index++) {
          const server = this.wsList[index];
          server.ws?.terminate();
          if (server.promtID) {
            this.logs.info(`Updating prompt ${server.promtID} to START`);
            await this.updateStageByID(server.ImageEntity as ImageEntity, "START", server.hashImageID);
            // await this.db.updateStageByID(server.promtID, "START", "", server.hashImageID);
          }
          this.logs.info(`Closing connection to server ${server.url}`);
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
    process.env.COMFY_SERVER_ADDRESS as string,
    // process.env.COMFY_SERVER_ADDRESS_2 as string,
    // process.env.COMFY_SERVER_ADDRESS_3 as string,
    // process.env.COMFY_SERVER_ADDRESS_4 as string,
    // process.env.COMFY_SERVER_ADDRESS_5 as string,
    // process.env.COMFY_SERVER_ADDRESS_6 as string
  ],
  STEP: 25,
  db: new Database(),
  logs: new Logs()
});

processor.starts().catch((error) => {
  console.error('Error in processor:', error);
});