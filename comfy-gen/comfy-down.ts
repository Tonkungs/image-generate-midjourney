require("dotenv").config();
// import DataDBHandler, { IDataPromt } from "../src/util/db";
import DataDBHandler, { Database } from "../src/db/database";
import { ImageEntity } from "../src/db/entities/image";

import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import Ut from "../src/util/util";
import Logs from "../src/logs";

const DIR_COMFYUI = 'comfy09';

interface IServer {
  serverAddress: string;
  isAvailable: boolean;
  reconnectAttempts: number;
}

interface IImageDownloader {
  db: Database;
  logs: Logs;
  // serverAddressList: string[];
}

class ImageDownloader {
  private db: Database;
  // private serverList: IServer[];
  private logs: Logs;
  private NODE_IMAGE_PATH: string = "9";
  private MAX_RETRIES = 3; // จำกัดจำนวนครั้งที่ลองโหลดภาพใหม่
  private TOKEN = `?token=`;

  constructor (config: IImageDownloader) {
    if (!config.db) throw new Error("db is required");
    if (!config.logs) throw new Error("logs is required");

    this.db = config.db;
    this.logs = config.logs;

    // this.serverList = config.serverAddressList.map(server => ({
    //   serverAddress: server,
    //   isAvailable: true,
    //   reconnectAttempts: 0
    // }));
  }

  public async starts(): Promise<void> {
    while (true) {
      try {
        const promptData: ImageEntity | null = await this.db.findFirstWait();
      await this.db.initialize()
        // const promptDatas:IDataPromt[] | null = await this.db.findTopWait();

        // console.log("promptDatas =>",promptDatas);

        // await Ut.Delay(5000);
        if (!promptData) {
          this.logs.info("No pending prompts. Retrying in 5 seconds...");
          await Ut.Delay(5000);
          continue;
        }

        const promptId = promptData?.promt_id as string;
        if (!promptId) continue;

        try {
          const imageBuffers = await this.downloadImages(promptId);
          if (!imageBuffers || !imageBuffers[this.NODE_IMAGE_PATH]) {
            this.logs.info(`No valid images found in node ${this.NODE_IMAGE_PATH}`);
            await this.updateStageByID(promptData, "START", promptId);
            // await this.db.updateStageByID(promptData?.id as string, "START", "", promptId);
            continue;
          }

          const directoryPath = path.join(__dirname, DIR_COMFYUI);
          await this.ensureDirectoryExistence(directoryPath);
          const fileName = `${promptData?.id}_${promptId}.jpg`;
          const outputPath = path.join(directoryPath, fileName);
          await this.saveImage(imageBuffers[this.NODE_IMAGE_PATH][0], outputPath, fileName);
          await this.updateStageByID(promptData, "DONE", promptId);
          // await this.db.updateStageByID(promptData?.ID as string, "DONE", "", promptId);
        } catch (error) {
          this.logs.error(`Error downloading image: ${error}`);
          await this.updateStageByID(promptData, "START", promptId);
          // await this.db.updateStageByID(promptData?.ID as string, "START", "", promptId);
        }
      } catch (error) {
        console.log("error =>", error);

        this.logs.error(`Unexpected error in starts(): ${error}`);
        await Ut.Delay(5000);
      }
    }
  }

  /**
   * name
   */
  public async startss(): Promise<void> {
    await this.db.initialize()
    
    while (true) {
      try {

        const promptDatas: ImageEntity[] | null = await this.db.findTopWait('WAITING_DOWNLOAD',10);
        if (!promptDatas || promptDatas.length === 0) {
          this.logs.info("No pending prompts. Retrying in 5 seconds...");
          await Ut.Delay(5000);
          continue;
        }

        let imagesPromts: Promise<void>[] = [];
        for (const promptData of promptDatas) {
          imagesPromts.push(this.processPrompt(promptData));
        }

        await Promise.all(imagesPromts);

      } catch (error) {
        this.logs.error(`Unexpected error in starts(): ${error}`);
        await Ut.Delay(5000);
      }
    }
  }

  private async processPrompt(promptData: ImageEntity): Promise<void> {
    const promptId = promptData?.promt_id as string;
    if (!promptId) return;

    try {
      const imageBuffers = await this.downloadImages(promptId);
      if (!imageBuffers || !imageBuffers[this.NODE_IMAGE_PATH]) {
        this.logs.info(`No valid images found in node ${this.NODE_IMAGE_PATH}`);
        await this.updateStageByID(promptData, "START", promptId);
        // await this.db.updateStageByID(promptData?.ID as string, "START", "", promptId);
        return;
      }

      const directoryPath = path.join(__dirname, DIR_COMFYUI);
      await this.ensureDirectoryExistence(directoryPath);
      const fileName = `${promptData.id}_${promptId}.jpg`;
      const outputPath = path.join(directoryPath, fileName);
      await this.saveImage(imageBuffers[this.NODE_IMAGE_PATH][0], outputPath, fileName);
      await this.updateStageByID(promptData, "DONE", promptId);
      // await this.db.updateStageByID(promptData?.ID as string, "DONE", "", promptId);
    } catch (error) {
      this.logs.error(`Error downloading image: ${error}`);
      this.updateStageByID(promptData, "START", promptId);
      // await this.db.updateStageByID(promptData?.ID as string, "START", "", promptId);
    }

    return;
  }

  private async downloadImages(promptId: string): Promise<{ [nodeId: string]: Buffer[] }> {
    const outputImages: { [nodeId: string]: Buffer[] } = {};
    const serverList = await this.db.getAllServers();
    for (const server of serverList) {
      // if (!server.isAvailable) continue;s
      try {
        const history = await this.getHistory(server.server_url, promptId);
        if (!history || !history[promptId]) continue;

        this.logs.info(`Downloading images from ${server.server_url}`);

        for (const nodeId in history[promptId].outputs) {
          const nodeOutput = history[promptId].outputs[nodeId];
          if (!nodeOutput.images) continue;

          outputImages[nodeId] = await Promise.all(
            nodeOutput.images.map(async (image: { filename: string; subfolder: string; type: string; }) => {
              return this.getImageWithRetry(server.server_url, image.filename, image.subfolder, image.type);
            })
          );
        }
      } catch (error) {
        // server.isAvailable = false;
        this.logs.info(`Server ${server.server_url} is unavailable`);
      }
    }

    return outputImages;
  }

  private async getImageWithRetry(server: string, filename: string, subfolder: string, type: string): Promise<Buffer> {
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await this.getImage(server, filename, subfolder, type);
      } catch (error) {
        this.logs.warn(`Retry ${attempt}/${this.MAX_RETRIES} for image ${filename} failed.`);
        await Ut.Delay(2000);
      }
    }
    throw new Error(`Failed to download image ${filename} after ${this.MAX_RETRIES} retries.`);
  }

  private async saveImage(buffer: Buffer, outputPath: string, fileName: string): Promise<void> {
    try {
      await fs.writeFile(outputPath, buffer);
      this.logs.info(`Image saved: ${fileName}`);
    } catch (error) {
      this.logs.error(`Error saving image: ${error}`);
      throw error;
    }
  }

  private async getImage(server: string, filename: string, subfolder: string, type: string): Promise<Buffer> {
    try {
      const response = await axios.get(`http://${server}/view${this.TOKEN}`, {
        params: { filename, subfolder, type },
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      this.logs.error(`Error downloading image from ${server}: ${error}`);
      throw error;
    }
  }

  private async getHistory(server: string, promptId: string): Promise<any> {
    try {
      const response = await axios.get(`http://${server}/history/${promptId}${this.TOKEN}`);
      return response.data;
    } catch (error) {
      this.logs.error(`Error fetching history from ${server}: ${error}`);
      throw error;
    }
  }

  private async ensureDirectoryExistence(directoryPath: string): Promise<void> {
    try {
      await fs.access(directoryPath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        this.logs.info(`Creating directory: ${directoryPath}`);
        await fs.mkdir(directoryPath, { recursive: true });
      } else {
        this.logs.error(`Error accessing directory: ${directoryPath}`, { error });
        throw error;
      }
    }
  }

  private async updateStageByID( data: ImageEntity, stage: string, promptId: string): Promise<void> {
    await this.db.update(data.id, {
      ...data,
      promt_id: promptId,
      stage: stage
    });
  }
}

(async () => {
  try {
    const downloader = new ImageDownloader({
      db: new Database(),
      logs: new Logs(),
      // serverAddressList: [
      //   process.env.COMFY_SERVER_ADDRESS as string,
      //   process.env.COMFY_SERVER_ADDRESS_2 as string,
      //   process.env.COMFY_SERVER_ADDRESS_3 as string,
      //   // process.env.COMFY_SERVER_ADDRESS_4 as string,
      //   // process.env.COMFY_SERVER_ADDRESS_5 as string,
      //   // process.env.COMFY_SERVER_ADDRESS_6 as string
      // ],
    });

    await downloader.startss();
  } catch (error) {
    console.error("Fatal Error:", error);
  }
})();
