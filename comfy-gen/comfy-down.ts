require("dotenv").config();
import DataDBHandler, { IDataPromt } from "../src/util/db";
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import Ut, { Utils } from "../src/util/util";
import Logs from "../src/logs";
const DIR_COMFYUI = 'comfy02'

interface IImageDownloader {
  db: DataDBHandler;
  logs?: Logs;
  serverAddress: string;
}

class ImageDownloader {
  private db: DataDBHandler;
  private serverAddress: string;
  private logs: Logs;

  constructor (config: IImageDownloader) {
    if (!config.db) {
      throw new Error("db is required");
    }

    this.db = config.db;

    if (!config.logs) {
      throw new Error("logs is required");
    }

    this.logs = config.logs;

    if (!config.serverAddress) {
      throw new Error("serverAddress is required");
    }

    this.serverAddress = config.serverAddress;
  }

  public async start(): Promise<void> {
    while (true) {
      const promttext = await this.db.findAllWait();
      if (promttext === null) {
        this.logs.info(`"promptId is empty Next time in 5 seconds :", ${new Date().toISOString()}`);
        await Ut.Delay(5000);
      }
      const promptId = promttext?.PromtId as string;
      
      if (promptId !== null && promptId !== '' && promptId !== undefined) {
        try {
          this.logs?.info("เริ่มดาวโหลด");
          const directoryPath = path.join(__dirname, DIR_COMFYUI);

          // Ensure the directory exists before attempting to save the file.
          await this.ensureDirectoryExistence(directoryPath, this.logs);


          const outputPath = path.join(directoryPath, `${promttext?.ID}_${promttext?.PromtId}.jpg`);
          const outputImages: { [nodeId: string]: Buffer[] } = {};
          
          // ดึงประวัติการสร้างภาพ
          const history = await this.getHistory(promptId);
          for (const nodeId in history[promptId].outputs) {
            const nodeOutput = history[promptId].outputs[nodeId];
            if (nodeOutput.images) {
              const imagesOutput: Buffer[] = [];
              for (const image of nodeOutput.images) {
                const imageData = await this.getImage(image.filename, image.subfolder, image.type);
                imagesOutput.push(imageData);
              }
              outputImages[nodeId] = imagesOutput;
            }
          }

          // เลือกใช้ Buffer ตัวแรกจาก outputImages['10']
          if (outputImages['10'] && outputImages['10'].length > 0) {
            await this.bufferToJpgImage(outputImages['10'][0], outputPath);
          } else {
            this.logs.error("ไม่มีข้อมูลรูปภาพใน node 10");
            throw new Error("ไม่มีข้อมูลรูปภาพใน node 10");
          }
          
          await this.db.updateStageByID(promttext?.ID as string, "DONE", "", promptId);
        } catch (error) {          
          this.logs.error("Error downloading image", { error });
          throw new Error("Error downloading image");
        }
      } 
    }
  }

  private async bufferToJpgImage(buffer: Buffer, outputPath: string): Promise<void> {
    try {
      await fs.writeFile(outputPath, buffer);
      this.logs.info(`บันทึกรูปภาพเรียบร้อยแล้วที่: ${outputPath}`);
    } catch (error) {
      this.logs.error(`เกิดข้อผิดพลาดในการบันทึกรูปภาพ: ${error}`, error);
      throw error;
    }
  }

  private async getImage(filename: string, subfolder: string, folderType: string): Promise<Buffer> {
    try {
      const response = await axios.get(`http://${this.serverAddress}/view`, {
        params: { filename, subfolder, type: folderType },
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      this.logs.error(`เกิดข้อผิดพลาดในการดาวน์โหลดรูปภาพ: ${error}`, error);
      throw error;
    }
  }

  private async getHistory(promptId: string): Promise<any> {
    try {
      const response = await axios.get(`http://${this.serverAddress}/history/${promptId}`);
      return response.data;
    } catch (error) {
      this.logs.error(`เกิดข้อผิดพลาดในการดึงประวัติการสร้างภาพ: ${error}`, error);
      throw error;
    }
  }


  private async ensureDirectoryExistence(directoryPath: string, logs: Logs): Promise<void> {
    try {
      // Check if the directory exists
      await fs.access(directoryPath);
    } catch (error: any) {
      // If the directory doesn't exist (ENOENT error), create it
      if (error.code === 'ENOENT') {
        this.logs.info(`Directory does not exist, creating: ${directoryPath}`);
        try {
          await fs.mkdir(directoryPath, { recursive: true }); // recursive: true creates parent directories if needed
          this.logs.info(`Directory created successfully: ${directoryPath}`);
        } catch (mkdirError) {
          this.logs.error(`Error creating directory: ${directoryPath}`, {
            error: mkdirError
          });
          throw mkdirError
        }
      } else {
        // If another error occurs, log it and rethrow
        this.logs.error(`Error accessing directory: ${directoryPath}`, {
          error
        });
        throw error;
      }
    }
  }

}

(async () => {
  const downloader = new ImageDownloader({
    db: new DataDBHandler(),
    serverAddress: process.env.COMFY_SERVER_ADDRESS as string,
    logs: new Logs()
  });
  await downloader.start();
})();
