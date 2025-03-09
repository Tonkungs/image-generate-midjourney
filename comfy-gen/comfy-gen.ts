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
  isAvailable: boolean
  promtID: string
  hashImageID: string
  reconnectAttempts: number;
  inactivityTimeout: NodeJS.Timeout | null;
}

class ComfyUIPromptProcessor {
  private serverAddress: string;
  // private WSS_URL: string;
  private STEP = 20;
  private db: DataDBHandler;
  private ws?: WebSocket;
  private wsList: IWS[] = []
  private bar: any;
  private currentPromptTextId: string | null = null;
  private currentPromptId: string | null = null;
  private logs: Logs;
  private isWait: boolean = false;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1000; // Base delay in ms

  constructor (config: IComfyConfig) {
    if (!config.serverAddress) {
      throw new Error("Server address is required");
    }
    if (!config.logs) {
      throw new Error("Logs is required");
    }

    this.serverAddress = config.serverAddress;
    // this.WSS_URL = `ws://${config.serverAddress}/ws?clientId=${this.generateClientId()}`;
    this.db = config.db;
    // this.bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    this.registerShutdownHandlers();
    this.STEP = config.STEP;
    this.logs = config.logs as Logs;

    if (config.serverAddressList) {
      config.serverAddressList.map(url => {
        this.wsList.push({
          // ws: new WebSocket(`ws://${url}/ws?clientId=${this.generateClientId()}`),
          url: url,
          isAvailable: true,
          promtID: "",
          hashImageID: "",
          reconnectAttempts: 0
          , inactivityTimeout: null
        });
      })
    }
  }

  // สร้าง clientId แบบสุ่ม
  private generateClientId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // ส่ง prompt ไปยัง ComfyUI
  private async queuePrompt(serverAddress: string, prompt: object): Promise<any> {
    try {
      const response = await axios.post(`http://${serverAddress}/prompt`, prompt);
      return response.data;
    } catch (error) {
      this.logs.error(`Error queuing prompt`, {
        prompt,
        error
      });
      throw error;
    }
  }

  // สร้างค่า random noise
  private generateRandomNoise(): string {
    let result = '';
    for (let i = 0; i < 15; i++) {
      result += i === 0 ? Math.floor(Math.random() * 9) + 1 : Math.floor(Math.random() * 10);
    }
    return result;
  }

  // สร้าง prompt object ตาม parameter ที่ส่งมา
  private getPrompt(params: string, noise: string): any {
    return {
      "prompt": {
        "1": {
          "inputs": { "unet_name": "flux1-dev-Q4_K_S.gguf" },
          "class_type": "UnetLoaderGGUF",
          "_meta": { "title": "Unet Loader (GGUF)" }
        },
        "2": {
          "inputs": {
            "model": ["1", 0],
            "conditioning": ["11", 0]
          },
          "class_type": "BasicGuider",
          "_meta": { "title": "BasicGuider" }
        },
        "3": {
          "inputs": {
            "noise": ["4", 0],
            "guider": ["2", 0],
            "sampler": ["5", 0],
            "sigmas": ["6", 0],
            "latent_image": ["7", 0]
          },
          "class_type": "SamplerCustomAdvanced",
          "_meta": { "title": "SamplerCustomAdvanced" }
        },
        "4": {
          "inputs": { "noise_seed": noise },
          "class_type": "RandomNoise",
          "_meta": { "title": "RandomNoise" }
        },
        "5": {
          "inputs": { "sampler_name": "euler" },
          "class_type": "KSamplerSelect",
          "_meta": { "title": "KSamplerSelect" }
        },
        "6": {
          "inputs": {
            "scheduler": "simple",
            "steps": this.STEP,
            "denoise": 1,
            "model": ["1", 0]
          },
          "class_type": "BasicScheduler",
          "_meta": { "title": "BasicScheduler" }
        },
        "7": {
          "inputs": { "width": 1280, "height": 720, "batch_size": 1 },
          "class_type": "EmptyLatentImage",
          "_meta": { "title": "Empty Latent Image" }
        },
        "8": {
          "inputs": {
            "samples": ["3", 0],
            "vae": ["9", 0]
          },
          "class_type": "VAEDecode",
          "_meta": { "title": "VAE Decode" }
        },
        "9": {
          "inputs": { "vae_name": "ae.safetensors" },
          "class_type": "VAELoader",
          "_meta": { "title": "Load VAE" }
        },
        "10": {
          "inputs": {
            "filename_prefix": "api_v2_",
            "images": ["8", 0]
          },
          "class_type": "SaveImage",
          "_meta": { "title": "Save Image" }
        },
        "11": {
          "inputs": {
            "guidance": 3.5,
            "conditioning": ["12", 0]
          },
          "class_type": "FluxGuidance",
          "_meta": { "title": "FluxGuidance" }
        },
        "12": {
          "inputs": {
            "text": params,
            "clip": ["13", 0]
          },
          "class_type": "CLIPTextEncode",
          "_meta": { "title": "CLIP Text Encode (Prompt)" }
        },
        "13": {
          "inputs": {
            "clip_name1": "t5-v1_1-xxl-encoder-Q4_K_S.gguf",
            "clip_name2": "clip_l.safetensors",
            "type": "flux"
          },
          "class_type": "DualCLIPLoaderGGUF",
          "_meta": { "title": "DualCLIPLoader (GGUF)" }
        }
      }
    };
  }

  // เริ่มการทำงานหลัก โดยสร้าง WebSocket connection และจัดการ event ต่าง ๆ

  public async starts() {

    for (let index = 0; index < this.wsList.length; index++) {
      if (this.wsList[index].ws) {
        return;
      }
      const service = this.wsList[index]
      this.wsList[index].ws = new WebSocket(`ws://${service.url}/ws?clientId=${this.generateClientId()}`) as WebSocket
      if (!this.wsList[index].ws) {
        return;
      }
      const ws = this.wsList[index].ws as WebSocket
      this.processWS(ws, index)
    }
  }


  public async processWS(ws: WebSocket, serverNo: number): Promise<void> {
    const resetInactivityTimer = () => {
      if (this.wsList[serverNo].inactivityTimeout) clearTimeout(this.wsList[serverNo].inactivityTimeout);
      this.wsList[serverNo].inactivityTimeout = setTimeout(() => {
        console.warn(`No message received from server ${serverNo} for 2 minutes. Reconnecting...`);
        ws.close(); // ปิด WebSocket เพื่อให้เกิดการ reconnect
      }, 2 * 60 * 1000); // 2 นาที
    };
    ws.removeAllListeners();

    ws.on('open', async () => {
      // this.isWait = true;
      this.logs.info("WebSocket connected from server no " + serverNo);
      this.wsList[serverNo].reconnectAttempts = 0;
      this.wsList[serverNo].isAvailable = true;
      resetInactivityTimer(); // เริ่มจับเวลาss
    });

    ws.on('message', async (data: WebSocket.Data) => {
      resetInactivityTimer(); // รีเซ็ตตัวจับเวลาเมื่อได้รับ message
      const message = JSON.parse(data.toString());

      if (message.type === "progress") {
        this.logs.info(`Progress: ${message.data.value}/${message.data.max} from server no ${serverNo}`);
        if (message.data.value === message.data.max) {
          try {
            if (!this.wsList[serverNo].promtID) {
              throw new Error(`currentPromptTextId is empty from server no ${serverNo}`);
            }
            await this.db.updateStageByID(
              this.wsList[serverNo].promtID,
              "WAITING_DOWNLOAD",
              "",
              message.data.prompt_id
            );
            this.logs.info(
              `Updating prompt ${this.wsList[serverNo].promtID} to WAITING_DOWNLOAD จาก server no ${serverNo}`
            )
          } catch (error) {
            console.log('error', error);

            this.logs.error(`Error updating stagefrom server no ${serverNo}`, {
              message,
              error
            });
            ws.close();
            throw new Error(`Error updating stage from server no ${serverNo}`);
          }
        }
      }

      if (message.type === "status" && message.data.status.exec_info.queue_remaining === 0) {
        while (this.isWait) {
          this.logs.info(`Waiting from server no ${serverNo} 1 second`);
          await Ut.Delay(1000);
        }
        this.isWait = true;
        const promtText = await this.db.findFirstStart();
        if (!promtText?.ID) {
          this.logs.error(`Error finding prompt text from server no ${serverNo}`, {
            promtText,
            serverNo
          });
          throw new Error(`Error finding prompt text from server no ${serverNo}`);
        }
        const noise = this.generateRandomNoise();
        const promptText = this.getPrompt(`${promtText.Title} high detail 8k `, noise);
        this.wsList[serverNo].promtID = promtText.ID;
        this.logs.info(`เริ่มรอบใหม่ ${promtText.ID} จาก server no ${serverNo}`, {
          promtText
        });
        const promptResponse = await this.queuePrompt(this.wsList[serverNo].url, promptText);
        const promptId = promptResponse.prompt_id;
        this.wsList[serverNo].hashImageID = promptId;
        await this.db.updateStageByID(promtText.ID, "WAITING", "", promptId);
        this.isWait = false;
      }
    });

    ws.on('error', (error) => {
      this.logs.error("WebSocket error " + ws.url, {
        error
      });
    });

    ws.on('close', async (event) => {
      this.logs.info("WebSocket closed from server no " + serverNo);
      if (this.wsList[serverNo].inactivityTimeout) clearTimeout(this.wsList[serverNo].inactivityTimeout); // หยุดจับเวลาหากปิดการเชื่อมต่อ

      console.warn(`WebSocket closed: ${event}`);
      if (this.wsList[serverNo].reconnectAttempts < this.maxReconnectAttempts) {
        const timeout = this.reconnectDelay * Math.pow(2, this.wsList[serverNo].reconnectAttempts); // Exponential backoff
        console.log(`Reconnecting in ${timeout / 1000} seconds...`);
        setTimeout(() => this.reconnect(serverNo), timeout);
        this.wsList[serverNo].reconnectAttempts++;
      } else {
        console.error("Max reconnect attempts reached. Stopping reconnection.");
      }
    });
  }

  private reconnect(serverNo: number) {
    this.logs.info(`Reconnecting WebSocket for server no ${serverNo}...`);
    const service = this.wsList[serverNo]
    this.wsList[serverNo].ws = new WebSocket(`ws://${service.url}/ws?clientId=${this.generateClientId()}`);
    this.processWS(this.wsList[serverNo].ws, serverNo);
  }


  // ลงทะเบียน handler สำหรับการ shutdown แบบปลอดภัย
  private registerShutdownHandlers() {
    const safeShutdown = async () => {
      this.logs.info("Shutting down gracefully...");
      try {
        // ยังไม่ยอมกลับไปเป็น START หาสาเตุด้วย
        for (let index = 0; index < this.wsList.length; index++) {
          const server = this.wsList[index];
          server.ws?.close();

          this.logs.info(`Updating prompt ${server.promtID} to START`);
          await this.db.updateStageByID(server.promtID, "START", "", server.hashImageID);

          this.logs.info("Closing connection to server " + server.url);

        }

      } catch (error) {
        this.logs.error("Error during safe shutdown", {
          error
        });
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


// สร้าง instance และเริ่มทำงาน
const processor = new ComfyUIPromptProcessor({
  serverAddress: process.env.COMFY_SERVER_ADDRESS as string,
  serverAddressList: [
    process.env.COMFY_SERVER_ADDRESS as string,
    process.env.COMFY_SERVER_ADDRESS_2 as string
  ],
  // clientId: process.env.COMFYUI_CLIENT_ID as string,
  STEP: 20,
  db: new DataDBHandler(),
  logs: new Logs()
});
// processor.start().catch((error) => {
//   console.error('Error in processor:', error);
// });

processor.starts().catch((error) => {
  console.error('Error in processor:', error);
});
