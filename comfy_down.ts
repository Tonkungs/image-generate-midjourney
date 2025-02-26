import DataDBHandler, { IDataPromt } from "./src/util/db";
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import Ut, { Utils } from "./src/util/util";

class ImageDownloader {
  private db: DataDBHandler;
  private serverAddress: string;

  constructor() {
    this.db = new DataDBHandler();
    this.serverAddress = 'invisible-rural-investors-randy.trycloudflare.com';
  }

  public async start(): Promise<void> {
    while (true) {
      const promttext = await this.db.findAllWait();
      const promptId = promttext?.PromtId as string;

      if (promptId && promptId !== '') {
        try {
          console.log("เริ่มดาวโหลด");
          const outputPath = path.join(__dirname, 'comfy', `${promttext?.ID}_${promttext?.PromtId}.jpg`);
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
            throw new Error("ไม่มีข้อมูลรูปภาพใน node 10");
          }
          
          await this.db.updateStageByID(promttext?.ID as string, "DONE", "", promptId);
        } catch (error) {
          console.error("Error:", error);
          throw new Error("Error downloading image");
        }
      } else {
        console.log("promptId is empty Next time in 5 seconds :", new Date().toISOString());
        await Ut.Delay(5000);
      }
    }
  }

  private async bufferToJpgImage(buffer: Buffer, outputPath: string): Promise<void> {
    try {
      await fs.writeFile(outputPath, buffer);
      console.log(`บันทึกรูปภาพเรียบร้อยแล้วที่: ${outputPath}`);
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการบันทึกรูปภาพ:', error);
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
      console.error('Error fetching image:', error);
      throw error;
    }
  }

  private async getHistory(promptId: string): Promise<any> {
    try {
      const response = await axios.get(`http://${this.serverAddress}/history/${promptId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching history:', error);
      throw error;
    }
  }
}

(async () => {
  const downloader = new ImageDownloader();
  await downloader.start();
})();
