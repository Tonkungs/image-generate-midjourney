import WebSocket from 'ws';
import axios from 'axios';
import DataDBHandler from "./src/util/db";
// const cliProgress = require('cli-progress');
import cliProgress from "cli-progress"; 

class ComfyUIPromptProcessor {
  private serverAddress = 'invisible-rural-investors-randy.trycloudflare.com';
  private clientId: string;
  private WSS_URL: string;
  private STEP = 20;
  private db: DataDBHandler;
  private ws?: WebSocket;
  private bar: any;
  private currentPromptTextId: string | null = null;
  private currentPromptId: string | null = null;

  constructor() {
    this.clientId = this.generateClientId();
    this.WSS_URL = `ws://${this.serverAddress}/ws?clientId=${this.clientId}`;
    this.db = new DataDBHandler();
    this.bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    this.registerShutdownHandlers();
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
  private async queuePrompt(prompt: object): Promise<any> {
    try {
      const response = await axios.post(`http://${this.serverAddress}/prompt`, prompt);
      return response.data;
    } catch (error) {
      console.error('Error queuing prompt:', error);
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
            "model": [ "1", 0 ],
            "conditioning": [ "11", 0 ]
          },
          "class_type": "BasicGuider",
          "_meta": { "title": "BasicGuider" }
        },
        "3": {
          "inputs": {
            "noise": [ "4", 0 ],
            "guider": [ "2", 0 ],
            "sampler": [ "5", 0 ],
            "sigmas": [ "6", 0 ],
            "latent_image": [ "7", 0 ]
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
            "model": [ "1", 0 ]
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
            "samples": [ "3", 0 ],
            "vae": [ "9", 0 ]
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
            "images": [ "8", 0 ]
          },
          "class_type": "SaveImage",
          "_meta": { "title": "Save Image" }
        },
        "11": {
          "inputs": {
            "guidance": 3.5,
            "conditioning": [ "12", 0 ]
          },
          "class_type": "FluxGuidance",
          "_meta": { "title": "FluxGuidance" }
        },
        "12": {
          "inputs": {
            "text": params,
            "clip": [ "13", 0 ]
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
  public async start() {
    this.ws = new WebSocket(this.WSS_URL);

    this.ws.on('open', async () => {
      // สามารถเพิ่ม logic เมื่อต้องการทำงานตอนเปิด connection ได้
      console.log("WebSocket connected.");
    });

    this.ws.on('message', async (data: WebSocket.Data) => {
      const message = JSON.parse(data.toString());

      if (message.type === "progress") {
        this.bar.update(message.data.value);
        if (message.data.value === message.data.max) {
          try {
            if (!this.currentPromptTextId) {
              throw new Error("currentPromptTextId is empty");
            }
            await this.db.updateStageByID(
              this.currentPromptTextId,
              "WAITING_DOWNLOAD",
              "",
              message.data.prompt_id
            );
            this.bar.stop();
          } catch (error) {
            console.error(error);
            this.ws?.close();
            throw new Error("Error updating stage");
          }
        }
      }

      if (message.type === "status" && message.data.status.exec_info.queue_remaining === 0) {
        const promtText = await this.db.findFirstStart();
        if (!promtText?.ID) {
          throw new Error("Error finding prompt text");
        }
        const noise = this.generateRandomNoise();
        const promptText = this.getPrompt(`${promtText.Title} high detail 8k `, noise);
        this.currentPromptTextId = promtText.ID;
        const promptResponse = await this.queuePrompt(promptText);
        const promptId = promptResponse.prompt_id;
        this.currentPromptId = promptId;
        await this.db.updateStageByID(promtText.ID, "WAITING", "", promptId);
        console.log("เริ่มรอบใหม่", promtText.ID, "PROMPT ID", promptId);
        this.bar.start(this.STEP, 0);
      }
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  // ลงทะเบียน handler สำหรับการ shutdown แบบปลอดภัย
  private registerShutdownHandlers() {
    const safeShutdown = async () => {
      console.log("Shutting down gracefully...");
      try {
        if (this.currentPromptTextId && this.currentPromptId) {
          // อัพเดท prompt stage ให้เป็น "START" ก่อนปิดโปรแกรม
          await this.db.updateStageByID(this.currentPromptTextId, "START", "", this.currentPromptId);
        }
      } catch (error) {
        console.error("Error during safe shutdown:", error);
      } finally {
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
const processor = new ComfyUIPromptProcessor();
processor.start().catch((error) => {
  console.error('Error in processor:', error);
});
