
import path from "path";
import MidjourneyDiscord from "./src/mid_discord";
import Units from "./src/util/image_downloader";
// import { ConfigManager } from "./src/util/config_manager";
import FetchPuppeteer from "./src/util/fetch_image";
import Logs from "./src/logs";
import { promises as fs } from 'fs';
import DataJSONHandler from "./src/util/json";
import Ut, { Utils } from "./src/util/util";
import DataDBHandler from "./src/util/db";

require("dotenv").config();
interface FetchDataResult {
  seedID: string;
  messageID: string;
}

class MidjourneyController {
  private static readonly REGEX_FINAL = /<@\d+>/g;
  private static readonly REGEX_PERCENT = /\(\d{2}%\) \((fast|turbo|relax)(, stealth)?\)/g;
  private static readonly REGEX_PROMT = /\*\*(.*?)\*\*/g;;
  private static readonly CHECK_INTERVAL = 1000; // 30 seconds
  private static readonly GENERATE_WAIT_TIME = 3000; // 5 seconds

  private midjourneyDis: MidjourneyDiscord;
  private browser: FetchPuppeteer;
  private log: Logs;
  private currentRound: number;
  private dirImage: string;
  // private dataHandler: DataJSONHandler
  private dataHandler: DataDBHandler
  private imagePerRound: number
  constructor () {
    this.currentRound = 0;
    this.midjourneyDis = new MidjourneyDiscord(process?.env?.discord_token as string);
    // this.dataHandler = new DataDBHandler('17.json');
    this.dataHandler = new DataDBHandler();
    this.browser = new FetchPuppeteer();
    this.log = new Logs();
    this.dirImage = "01-11"
    this.imagePerRound = 9
  }

  async initialize(): Promise<void> {
    try {
      await this.browser.start();
    } catch (error) {
      throw new Error(`Initialization failed: ${error}`);
    }
  }

  private async fetchGeneratedData(): Promise<FetchDataResult> {
    return new Promise(async (resolve, reject) => {
      while (true) {
        this.log.info("Checking messages...");
        try {
          const messages = await this.midjourneyDis.GetPromts(this.imagePerRound);
          if (!messages.length) {
            throw new Error("No messages found");
          }

          const message = messages[0];
          // console.log("message", JSON.stringify(messages));

          const { content: text, id: messageID, attachments } = message;

          const hasFinished = text.match(MidjourneyController.REGEX_FINAL);
          const isGenerating = text.match(MidjourneyController.REGEX_PERCENT);

          if (hasFinished && !isGenerating && attachments.length > 0) {
            const id = Units.processString(attachments[0].filename);
            this.log.debug("ID found", { id, attachment: attachments[0] });

            if (id && id !== "0.webp") {
              return resolve({ seedID: id, messageID });
            }
            this.log.error("Invalid ID found", { id, round: this.currentRound + 1 });
          }

          this.log.info(`Data not ready, checking again in ${MidjourneyController.CHECK_INTERVAL / 1000} seconds...`,
            { round: this.currentRound + 1 });
          await Ut.Delay(MidjourneyController.CHECK_INTERVAL);

        } catch (error) {
          reject(error);
          this.log.error(`Error fetching data: ${error}`, { round: this.currentRound + 1 });
          throw error;
        }
      }
    });
  }

  private async downloadImages(seedID: string,round :number | string): Promise<void> {
    const urls = Array.from({ length: 4 }, (_, i) =>
      `https://cdn.midjourney.com/${seedID}/0_${i}.jpeg`
    );

    const filePaths = urls.map((_, i) =>
      path.join(this.dirImage, `${round}_${seedID}_0_${i}.jpg`)
    );

    this.log.info("Waiting for full photo generation", {
      urls,
      dirImage: this.dirImage,
      seedID
    });

    try {
      const buffers = await this.browser.lunchPuppeteerv2(urls);

      await Promise.all(
        buffers.map((imgBuffer, i) => fs.writeFile(filePaths[i], imgBuffer))
      );

      this.log.info("Images downloaded successfully!");
    } catch (error) {
      console.log("error", error);

      this.log.error("Download failed:", error);
      throw error;
    }
  }


  async processRound(): Promise<void> {
    try {
     
      while (true) {
        this.log.info("Checking messages...");
        try {
          const messages = await this.midjourneyDis.GetPromts(this.imagePerRound);
          if (!messages.length) {
            throw new Error("No messages found");
          }

          for (let index = 0; index < messages.length; index++) {
            const message = messages[index];
            
            const { content: text, id: messageID, attachments } = message;
            const hasFinished = text.match(MidjourneyController.REGEX_FINAL);
            const isGenerating = text.match(MidjourneyController.REGEX_PERCENT);
            // console.log("text =>",text);
            // console.log("hasFinished",hasFinished);
            // console.log("isGenerating",!isGenerating);
            // console.log("attachments.length",attachments.length);
            
            // console.log("dddd",hasFinished && !isGenerating && attachments.length > 0);
            
            if (hasFinished && !isGenerating && attachments.length > 0) {
              const id = Units.processString(attachments[0].filename);
              this.log.debug("ID found", { id, attachment: attachments[0] });
              // console.log("ID found");
              
              if (id && id !== "0.webp") {
                const matches = text.match(MidjourneyController.REGEX_PROMT)?.map(match => match.replace(/\*\*/g, ''));
                if (matches) {
                  console.log("msatches",matches);
                  // 
                  const idImage = matches[0].split("||")[0];
                  console.log("idImage",idImage);
                  
                  // const id = Units.processString(attachments[0].filename);
                  const promt = await this.dataHandler.findByID(idImage);
                  console.log("promt", promt?.Round);
                  
                  if (promt) {
                    await Ut.Delay(MidjourneyController.GENERATE_WAIT_TIME);
                    await this.downloadImages(id,promt.ID as string);
                    await this.dataHandler.updateStageByID(idImage, 'DONE',id);
                    await this.midjourneyDis.DeletePromt(messageID);
                  }
                } else {
                  // console.log("ไม่เจอ matches");
                }

              } else {
                this.log.error("Invalid ID found", { id, round: this.currentRound + 1 });
                // console.log("ไม่เจอ ID found");
              }
            } else {
              // console.log("ไม่เจอ");
              
            }
            // console.log("ไม่เจอ");
            
            this.log.info(`Data not ready, checking again in ${MidjourneyController.CHECK_INTERVAL / 1000} seconds...`);
            await Ut.Delay(MidjourneyController.CHECK_INTERVAL);
          }
        } catch (error) {
          throw new Error("Save failed: " + error);
          
        }
      }

    } catch (error) {
      this.log.error("Error in processing round:", error);
      await this.processRound(); // Retry on error
    }
  }

  async start(): Promise<void> {
    try {
      await this.initialize();
      await this.processRound();
    } catch (error) {
      await this.processRound();
      throw new Error(`Failed to start processing: ${error}`);
    }
  }
}

// Usage
(async () => {
  const controller = new MidjourneyController();
  try {
    await controller.start();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
})();

// pm2 start main.ts --name myDiscord --interpreter ts-node --cron-restart="0 * * * *"
