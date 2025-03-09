require("dotenv").config();
import DataDBHandler, { IDataPromt } from "../src/util/db";
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import Ut, { Utils } from "../src/util/util";
import Logs from "../src/logs";
const DIR_COMFYUI = 'comfy02'


interface IServer {
  serverAddress: string;
  isAvailable: boolean;
}
interface IImageDownloader {
  db: DataDBHandler;
  logs?: Logs;
  serverAddressList: string[];
}

class ImageDownloader {
  private db: DataDBHandler;
  private serverAddressList: IServer[];
  private logs: Logs;
  private NODE_IMAGE_PATH: string = "10";


  constructor (config: IImageDownloader) {
    if (!config.db) {
      throw new Error("db is required");
    }

    this.db = config.db;

    if (!config.logs) {
      throw new Error("logs is required");
    }

    this.logs = config.logs;

    if (config.serverAddressList) {
      this.serverAddressList = config.serverAddressList.map(item => {
        return { serverAddress: item, isAvailable: true } as unknown as IServer
      });
    } else {
      this.serverAddressList = [];
    }
  }

  public async starts(): Promise<void> {
    while (true) {
      const promttext = await this.db.findAllWait();
      if (promttext === null) {
        this.logs.info(`promptId is empty Next time in 5 seconds`);
        await Ut.Delay(5000);
        continue;
      }
      const promptId = promttext?.PromtId as string;

      if (promptId !== null && promptId !== '' && promptId !== undefined) {
        try {
         
          const directoryPath = path.join(__dirname, DIR_COMFYUI);

          // Ensure the directory exists before attempting to save the file.
          await this.ensureDirectoryExistence(directoryPath, this.logs);
          const outputPath = path.join(directoryPath, `${promttext?.ID}_${promttext?.PromtId}.jpg`);
          const outputImages: { [nodeId: string]: Buffer[] } = {};
          // console.log("before loop");

          for (let index = 0; index < this.serverAddressList.length; index++) {
            const serverUrl = this.serverAddressList[index];
            
            if (!serverUrl.isAvailable) {
              continue;
            }
            let history: { [key: string]: any } = {};
            try {
              history = await this.getHistory(serverUrl.serverAddress, promptId);
            } catch (error) {
              this.serverAddressList[index].isAvailable = false;
              this.logs.info(`Server Address: ${serverUrl.serverAddress} is error`)
              continue;
            }
            
            if (history === undefined || history[promptId] === undefined) {
              continue;
            }
            this.logs?.info("เริ่มดาวโหลดรูปภาพจาก server no " + index);
            for (const nodeId in history[promptId].outputs) {
              const nodeOutput = history[promptId].outputs[nodeId];
              if (nodeOutput.images) {
                const imagesOutput: Buffer[] = [];
                for (const image of nodeOutput.images) {
                  // console.log("Before img");
                  let imageData
                  try {
                    imageData = await this.getImage(serverUrl.serverAddress, image.filename, image.subfolder, image.type);
                    // console.log("after",imageData);
                  } catch (error) {
                    this.serverAddressList[index].isAvailable = false;
                    this.logs.info(`Server Address: ${serverUrl.serverAddress} is error`)
                    continue;
                  }
                  imagesOutput.push(imageData);
                }
                outputImages[nodeId] = imagesOutput;
              }
            }
          }
          // console.log("outputImages",outputImages);
          if (outputImages === undefined || outputImages[this.NODE_IMAGE_PATH] === undefined || !outputImages[this.NODE_IMAGE_PATH]) {
            this.logs.info(`ไม่มีข้อมูลรูปภาพใน node ${this.NODE_IMAGE_PATH}`)
            continue
          }
          // เลือกใช้ Buffer ตัวแรกจาก outputImages[this.NODE_IMAGE_PATH]
          if (outputImages[this.NODE_IMAGE_PATH] && outputImages[this.NODE_IMAGE_PATH].length > 0 && outputImages[this.NODE_IMAGE_PATH][0]) {
            await this.bufferToJpgImage(outputImages[this.NODE_IMAGE_PATH][0], outputPath);
          } else {
            this.logs.error(`ไม่มีข้อมูลรูปภาพใน node ${this.NODE_IMAGE_PATH}`);
            throw new Error(`ไม่มีข้อมูลรูปภาพใน node ${this.NODE_IMAGE_PATH}`);
          }

          await this.db.updateStageByID(promttext?.ID as string, "DONE", "", promptId);

        } catch (error) {
          console.log("error", error);
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

  private async getImage(serverAddress: string, filename: string, subfolder: string, folderType: string): Promise<Buffer> {
    try {
      const response = await axios.get(`http://${serverAddress}/view`, {
        params: { filename, subfolder, type: folderType },
        responseType: 'arraybuffer',
      });
      console.log("สำเร็จจ");

      return Buffer.from(response.data);
    } catch (error) {
      console.log("เกิดข้อผิดพลาดในการดาวน์โหลดรูปภาพ", error);

      this.logs.error(`เกิดข้อผิดพลาดในการดาวน์โหลดรูปภาพ: ${error}`, error);
      throw error;
    }
  }

  private async getHistory(serverAddress: string, promptId: string): Promise<any> {
    try {
      const response = await axios.get(`http://${serverAddress}/history/${promptId}`);
      return response.data;
    } catch (error) {
      this.logs.error(`Server Address: ${serverAddress} is error`)
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
  try {
    const downloader = new ImageDownloader({
      db: new DataDBHandler(),
      // serverAddress: process.env.COMFY_SERVER_ADDRESS as string,
      serverAddressList: [
        process.env.COMFY_SERVER_ADDRESS as string,
        process.env.COMFY_SERVER_ADDRESS_2 as string
      ],
      logs: new Logs()
    });
    await downloader.starts();
  } catch (error) {
    console.log(error);
    throw error

  }

})();
