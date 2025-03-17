import dotenv from 'dotenv';
dotenv.config();
import WebSocket from 'ws';
import axios from 'axios';
import DataDBHandler from "../src/util/db";
import Logs from "../src/logs";
import Ut from "../src/util/util";

interface IComfyConfig {
  serverAddress: string;
  STEP: number;
  db: DataDBHandler;
  logs?: Logs;
  serverAddressList?: string[];
}

interface IWS {
  ws?: WebSocket;
  url: string;
  isAvailable: boolean;
  promtID: string;
  hashImageID: string;
  reconnectAttempts: number;
  inactivityTimeout: NodeJS.Timeout | null;
}

class ComfyUIPromptProcessor {
  private serverAddress: string;
  private STEP: number;
  private db: DataDBHandler;
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
        promtID: "",
        hashImageID: "",
        reconnectAttempts: 0,
        inactivityTimeout: null
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
      for (let index = 0; index < this.wsList.length; index++) {
        if (this.wsList[index].ws) return;
        const service = this.wsList[index];
        this.wsList[index].ws = new WebSocket(`wss://${service.url}/ws?clientId=${this.generateClientId()}&token=${this.TOKENNN}`);
        // this.wsList[index].ws = new WebSocket(`wss://${service.url}/ws?clientId=4a5e6393fd5e4425ae0ce27c08d8c5ad&token=${this.TOKENNN}`,{
        //   headers: {
        //     'Upgrade': 'websocket',
        //     'Origin': 'https://'+service.url,
        //     'Cache-Control': 'no-cache',
        //     'Accept-Language': 'en-GB,en;q=0.9,th-TH;q=0.8,th;q=0.7,en-US;q=0.6',
        //     'Pragma': 'no-cache',
        //     'Connection': 'Upgrade',
        //     'Sec-WebSocket-Key': 'nSGsukMyvhhNcsTUykIfoA==',
        //     'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        //     'Sec-WebSocket-Version': '13',
        //     'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits',
        //     'Cookie': 'C.18847895_auth_token='+this.TOKENNN,
        //   }
        // });

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
        ws.close();
      }, 0.5 * 60 * 1000);
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
      console.log(":error =>", error);
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
          const result = await this.db.findByPromtID(message.data.prompt_id);
          if (!result) {
            this.logs.error(`Error finding prompt text from server no ${serverNo} promtID is ${message.data.prompt_id} To Next Round`, { result, serverNo });
            return;
          }
          this.wsList[serverNo].promtID = result.ID as string;
        }
        await this.db.updateStageByID(this.wsList[serverNo].promtID, "WAITING_DOWNLOAD", "", message.data.prompt_id);
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
    while (this.isWait) {
      this.logs.info(`Waiting from server no ${serverNo} 1 second`);
      await Ut.Delay(1000);
    }
    this.isWait = true;
    const promtText = await this.db.findFirstStart('business')
    if (!promtText?.ID) {
      this.logs.error(`Error finding prompt text from server no ${serverNo}`, { promtText, serverNo });
      throw new Error(`Error finding prompt text from server no ${serverNo}`);
    }
    const noise = this.generateRandomNoise();
    const promptText = this.getPromptcolab(`${promtText.Title} high detail 8k not have low quality, not have  worst quality, not have bad anatomy,not have extra limbs,not blurry, not have watermark,not have  cropped`, noise);
    this.wsList[serverNo].promtID = promtText.ID;
    this.logs.info(`Starting new round ${promtText.ID} from server no ${serverNo}`, { promtText });
    const promptResponse = await this.queuePrompt(this.wsList[serverNo].url, promptText);
    const hashImageID = promptResponse.prompt_id;
    this.wsList[serverNo].hashImageID = hashImageID;
    await this.db.updateStageByID(promtText.ID, "WAITING", "", hashImageID);
    this.isWait = false;
  }

  private handleWebSocketClose(event: any, serverNo: number): void {
    this.logs.info(`WebSocket closed from server no ${this.wsList[serverNo].url} when event is ${event}`);
    if (this.wsList[serverNo].inactivityTimeout) {
      clearTimeout(this.wsList[serverNo].inactivityTimeout);
    }

    if (this.wsList[serverNo].reconnectAttempts < this.maxReconnectAttempts) {
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
    if (!this.wsList[serverNo].isAvailable) return;

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
          server.ws?.close();
          this.logs.info(`Updating prompt ${server.promtID} to START`);
          await this.db.updateStageByID(server.promtID, "START", "", server.hashImageID);
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
}

const processor = new ComfyUIPromptProcessor({
  serverAddress: process.env.COMFY_SERVER_ADDRESS as string,
  serverAddressList: [
    process.env.COMFY_SERVER_ADDRESS as string,
    process.env.COMFY_SERVER_ADDRESS_2 as string,
    process.env.COMFY_SERVER_ADDRESS_3 as string,
    process.env.COMFY_SERVER_ADDRESS_4 as string,
    process.env.COMFY_SERVER_ADDRESS_5 as string,
    process.env.COMFY_SERVER_ADDRESS_6 as string
  ],
  STEP: 25,
  db: new DataDBHandler(),
  logs: new Logs()
});

processor.starts().catch((error) => {
  console.error('Error in processor:', error);
});
// (async () => {
//   const db = new DataDBHandler();
//   // const result = await db.findFirstStart('business');
//   // console.log("result =>", result);

//   // try {
//   //   const results = await db.findServer();
//   //   console.log("results =>", results);
//   // } catch (error) {
//   //   console.log("error =>", error);
    
//   // }
 
// })()

// 2025-03-11 02:07:06 info [comfy-gen.ts]: Progress: 20/20 from server no 3
// 2025-03-11 02:07:08 info [comfy-gen.ts]: Progress: 14/20 from server no 1
// 2025-03-11 02:07:08 info [comfy-gen.ts]: Progress: 8/20 from server no 0
// 2025-03-11 02:07:08 info [comfy-gen.ts]: Progress: 9/20 from server no 4
// 2025-03-11 02:07:09 info [comfy-gen.ts]: Progress: 18/20 from server no 2
// 2025-03-11 02:07:09 info [comfy-gen.ts]: Updating prompt 126493 to WAITING_DOWNLOAD from server no 3
// 2025-03-11 02:07:10 info [comfy-gen.ts]: Starting new round 126498 from server no 3
// 2025-03-11 02:07:13 info [comfy-gen.ts]: Progress: 15/20 from server no 1
// 2025-03-11 02:07:13 info [comfy-gen.ts]: Progress: 9/20 from server no 0
// 2025-03-11 02:07:13 info [comfy-gen.ts]: Progress: 10/20 from server no 4
// 2025-03-11 02:07:14 info [comfy-gen.ts]: Progress: 19/20 from server no 2
// 2025-03-11 02:07:18 info [comfy-gen.ts]: Progress: 16/20 from server no 1
// 2025-03-11 02:07:18 info [comfy-gen.ts]: Progress: 10/20 from server no 0
// 2025-03-11 02:07:18 info [comfy-gen.ts]: Progress: 11/20 from server no 4
// 2025-03-11 02:07:19 info [comfy-gen.ts]: Progress: 20/20 from server no 2
// 2025-03-11 02:07:20 info [comfy-gen.ts]: Progress: 1/20 from server no 3
// 2025-03-11 02:07:22 info [comfy-gen.ts]: Progress: 2/20 from server no 3
// 2025-03-11 02:07:23 info [comfy-gen.ts]: Updating prompt 126494 to WAITING_DOWNLOAD from server no 2
// 2025-03-11 02:07:23 info [comfy-gen.ts]: Progress: 17/20 from server no 1
// 2025-03-11 02:07:23 info [comfy-gen.ts]: Progress: 11/20 from server no 0
// 2025-03-11 02:07:23 info [comfy-gen.ts]: Progress: 12/20 from server no 4
// 2025-03-11 02:07:27 info [comfy-gen.ts]: Progress: 3/20 from server no 3
// 2025-03-11 02:07:28 info [comfy-gen.ts]: Progress: 12/20 from server no 0
// 2025-03-11 02:07:28 info [comfy-gen.ts]: Progress: 18/20 from server no 1
// 2025-03-11 02:07:28 info [comfy-gen.ts]: Progress: 13/20 from server no 4
// 2025-03-11 02:07:32 info [comfy-gen.ts]: Progress: 4/20 from server no 3
// 2025-03-11 02:07:33 info [comfy-gen.ts]: Shutting down gracefully...
// 2025-03-11 02:07:33 info [comfy-gen.ts]: Updating prompt 126497 to START
// 2025-03-11 02:07:33 info [comfy-gen.ts]: Progress: 13/20 from server no 0
// 2025-03-11 02:07:33 info [comfy-gen.ts]: Progress: 19/20 from server no 1
// 2025-03-11 02:07:33 info [comfy-gen.ts]: WebSocket closed from server no 0 when event is 1000
// Reconnecting in 1 seconds...
// 2025-03-11 02:07:33 info [comfy-gen.ts]: Progress: 14/20 from server no 4
// 2025-03-11 02:07:34 info [comfy-gen.ts]: Reconnecting WebSocket for server no 0...
// 2025-03-11 02:07:35 info [comfy-gen.ts]: Closing connection to server chronic-extraction-cardiac-dj.trycloudflare.com
// 2025-03-11 02:07:35 info [comfy-gen.ts]: Updating prompt 126495 to START
// 2025-03-11 02:07:36 info [comfy-gen.ts]: WebSocket closed from server no 1 when event is 1000
// Reconnecting in 1 seconds...
// 2025-03-11 02:07:36 info [comfy-gen.ts]: WebSocket connected from server no 0
// 2025-03-11 02:07:36 info [comfy-gen.ts]: Progress: 5/20 from server no 3
// 2025-03-11 02:07:37 info [comfy-gen.ts]: Reconnecting WebSocket for server no 1...
// 2025-03-11 02:07:38 info [comfy-gen.ts]: Progress: 14/20 from server no 0
// 2025-03-11 02:07:38 info [comfy-gen.ts]: Closing connection to server plug-wait-plains-japanese.trycloudflare.com
// 2025-03-11 02:07:38 info [comfy-gen.ts]: Updating prompt 126494 to START
// 2025-03-11 02:07:38 info [comfy-gen.ts]: Progress: 15/20 from server no 4
// 2025-03-11 02:07:38 info [comfy-gen.ts]: Closing connection to server butler-antique-generally-reports.trycloudflare.com
// 2025-03-11 02:07:38 info [comfy-gen.ts]: Updating prompt 126498 to START
// 2025-03-11 02:07:39 info [comfy-gen.ts]: Closing connection to server carnival-paintball-duration-yield.trycloudflare.com
// 2025-03-11 02:07:39 info [comfy-gen.ts]: Updating prompt 126496 to START
// 2025-03-11 02:07:39 info [comfy-gen.ts]: WebSocket closed from server no 3 when event is 1000
// Reconnecting in 1 seconds...
// 2025-03-11 02:07:39 info [comfy-gen.ts]: Closing connection to server walls-homework-mentioned-holdings.trycloudflare.com
// 2025-03-11 02:07:39 info [comfy-gen.ts]: Safe shutdown completed.
// 2025-03-11 02:07:39 info [comfy-gen.ts]: Shutting down gracefully...
// 2025-03-11 02:07:39 info [comfy-gen.ts]: Updating prompt 126497 to START
// Done in 9794.26s.