import path from "path";
import MidjourneyDiscord from "./src/mid_discord";
import Units from "./src/util/image_downloader";
import FetchPuppeteer from "./src/util/fetch_image";
import Logs from "./src/logs";
import { promises as fs } from 'fs';
import DataDBHandler from "./src/util/db";
import { Worker } from "worker_threads";
import Ut from "./src/util/util";

require("dotenv").config();

interface FetchDataResult {
  seedID: string;
  messageID: string;
}

class MidjourneyController {
  private static readonly REGEX_FINAL = /<@\d+>/g;
  private static readonly REGEX_PERCENT = /\(\d{2}%\) \((fast|turbo|relax)(, stealth)?\)/g;
  private static readonly REGEX_PROMT = /\*\*(.*?)\*\*/g;
  private static readonly CHECK_INTERVAL = 1000; // 30 seconds
  private static readonly GENERATE_WAIT_TIME = 3000; // 5 seconds

  private midjourneyDis: MidjourneyDiscord;
  private browser: FetchPuppeteer;
  private log: Logs;
  private dirImage: string;
  private dataHandler: DataDBHandler;
  private imagePerRound: number;
  private activeDownloads: Set<string>; // To track active downloads

  constructor() {
    this.midjourneyDis = new MidjourneyDiscord(process?.env?.discord_token as string);
    this.dataHandler = new DataDBHandler();
    this.browser = new FetchPuppeteer();
    this.log = new Logs();
    this.dirImage = "01-08";
    this.imagePerRound = 9;
    this.activeDownloads = new Set();
  }

  async initialize(): Promise<void> {
    try {
      await this.browser.start();
    } catch (error) {
      throw new Error(`Initialization failed: ${error}`);
    }
  }

  private async downloadImages(seedID: string, round: number | string): Promise<void> {
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
      this.log.error("Download failed:", error);
      throw error;
    }
  }

  private handleDownloadThread(seedID: string, round: number | string): void {
    if (this.activeDownloads.has(seedID)) {
      this.log.info(`Skipping download for seedID ${seedID}, already in progress.`);
      return;
    }

    this.activeDownloads.add(seedID);

    const worker = new Worker("./src/util/download_worker.js", {
      workerData: { seedID, round, dirImage: this.dirImage }
    });

    worker.on("message", () => {
      this.log.info(`Download completed for seedID: ${seedID}`);
      this.activeDownloads.delete(seedID);
    });

    worker.on("error", (error) => {
      this.log.error(`Worker error for seedID ${seedID}:`, error);
      this.activeDownloads.delete(seedID);
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        this.log.error(`Worker stopped with exit code ${code} for seedID ${seedID}`);
      }
      this.activeDownloads.delete(seedID);
    });
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

          for (const message of messages) {
            const { content: text, id: messageID, attachments } = message;
            const hasFinished = text.match(MidjourneyController.REGEX_FINAL);
            const isGenerating = text.match(MidjourneyController.REGEX_PERCENT);

            if (hasFinished && !isGenerating && attachments.length > 0) {
              const id = Units.processString(attachments[0].filename);
              if (id && id !== "0.webp") {
                const matches = text.match(MidjourneyController.REGEX_PROMT)?.map(match => match.replace(/\*\*/g, ''));
                if (matches) {
                  const prompt = await this.dataHandler.findByTitle(matches[0]);
                  if (prompt) {
                    this.handleDownloadThread(id, prompt.ID as string);
                    await this.dataHandler.updateStageByTitleEnd(prompt.Title, 'DONE', id);
                    await this.midjourneyDis.DeletePromt(messageID);
                  }
                }
              } else {
                this.log.error("Invalid ID found", { id });
              }
            }
          }

          this.log.info(`Data not ready, checking again in ${MidjourneyController.CHECK_INTERVAL / 1000} seconds...`);
          await Ut.Delay(MidjourneyController.CHECK_INTERVAL);
        } catch (error) {
          this.log.error("Error in processing round:", error);
        }
      }
    } catch (error) {
      this.log.error("Fatal error in processing round:", error);
      await this.processRound(); // Retry on error
    }
  }

  async start(): Promise<void> {
    try {
      await this.initialize();
      await this.processRound();
    } catch (error) {
      this.log.error(`Failed to start processing: ${error}`);
      process.exit(1);
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
