import path from "path";
import MidjourneyDiscord from "./src/mid_discord";
import Units from "./src/util/image_downloader";
import { ConfigManager } from "./src/util/config_manager";
import FetchPuppeteer from "./src/util/fetch_image";
import Logs from "./src/logs";
import { promises as fs } from 'fs';
require("dotenv").config();
interface FetchDataResult {
  seedID: string;
  messageID: string;
}

class MidjourneyController {
  private static readonly REGEX_FINAL = /<@\d+>/g;
  private static readonly REGEX_PERCENT = /\(\d{2}%\) \((fast|turbo|relax)(, stealth)?\)/g;
  private static readonly CHECK_INTERVAL = 45000; // 45 seconds
  private static readonly GENERATE_WAIT_TIME = 20000; // 20 seconds

  private midjourneyDis: MidjourneyDiscord;
  private configManager: ConfigManager;
  private browser: FetchPuppeteer;
  private log: Logs;
  private prompts: string[];
  private currentRound: number;
  private dirImage: string;

  constructor () {
    this.currentRound = 0;
    this.midjourneyDis = new MidjourneyDiscord(process?.env?.discord_token as string);
    this.configManager = new ConfigManager('./config/config.txt', "./promt", __dirname);
    this.browser = new FetchPuppeteer();
    this.log = new Logs();
    this.prompts = [];
    this.dirImage = ""
  }

  async initialize(): Promise<void> {
    try {
      await this.browser.start();
      this.prompts = Units.readFileSync("./promt/" + this.configManager.getConfig().file);
      this.currentRound = this.configManager.getConfig().line;
      this.dirImage = this.configManager.getImagePath();
    } catch (error) {
      throw new Error(`Initialization failed: ${error}`);
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchGeneratedData(): Promise<FetchDataResult> {
    return new Promise(async (resolve, reject) => {
      while (true) {
        this.log.info("Checking messages...");
        try {
          const messages = await this.midjourneyDis.GetPromts(1);
          if (!messages.length) {
            throw new Error("No messages found");
          }

          const message = messages[0];
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
          await this.delay(MidjourneyController.CHECK_INTERVAL);

        } catch (error) {
          reject(error);
          this.log.error(`Error fetching data: ${error}`, { round: this.currentRound + 1 });
          throw error;
        }
      }
    });
  }

  private async downloadImages(seedID: string): Promise<void> {
    const urls = Array.from({ length: 4 }, (_, i) =>
      `https://cdn.midjourney.com/${seedID}/0_${i}.jpeg`
    );

    const filePaths = urls.map((_, i) =>
      path.join(this.dirImage, `${this.currentRound + 1}_${seedID}_0_${i}.jpg`)
    );

    this.log.info("Waiting for full photo generation", {
      urls,
      dirImage: this.dirImage,
      seedID
    });

    await this.delay(MidjourneyController.GENERATE_WAIT_TIME);

    try {
      // const images = await Promise.all(
      //   urls.map(url => this.browser.lunchPuppeteer(url))
      // );
      const img1 = await this.browser.lunchPuppeteer(urls[0]);
      const img2 = await this.browser.lunchPuppeteer(urls[1]);
      const img3 = await this.browser.lunchPuppeteer(urls[2]);
      const img4 = await this.browser.lunchPuppeteer(urls[3]);

      await Promise.all([
        fs.writeFile(filePaths[0], img1),
        fs.writeFile(filePaths[1], img2),
        fs.writeFile(filePaths[2], img3),
        fs.writeFile(filePaths[3], img4)
      ]);
      // await Promise.all(
      //   images.map((img, i) => fs.writeFile(filePaths[i], img))
      // );

      this.log.info("Images downloaded successfully!");
    } catch (error) {
      console.log("error", error);

      this.log.error("Download failed:", error);
      throw error;
    }
  }

  private async checkIsGenerating(): Promise<boolean> {
    try {
      const messages = await this.midjourneyDis.GetPromts(1);
      if (!messages.length) {
        throw new Error("No messages found");
      }
      return !!messages[0].content.match(MidjourneyController.REGEX_FINAL);
    } catch (error) {
      this.log.error(`Generation check failed: ${error}`, { round: this.currentRound + 1 });
      throw error;
    }
  }

  private async handleNextPrompt(): Promise<void> {
    if (!this.prompts[this.currentRound]) {
      this.log.info("End of current file reached");
      this.configManager.nextFile();
      this.configManager.saveConfig();
      this.prompts = Units.readFileSync("./promt/" + this.configManager.getConfig().file);
      this.currentRound = this.configManager.getConfig().line;
      this.dirImage = this.configManager.getImagePath();
      return;
    }

    const isGenerating = await this.checkIsGenerating();
    if (!isGenerating) {
      this.log.info("Sending prompt", { round: this.currentRound + 1 });
      await this.midjourneyDis.SendPromt(this.prompts[this.currentRound]);
    }
  }

  async processRound(): Promise<void> {
    try {
      this.log.info(`Starting round: ${this.currentRound + 1}`);
      this.log.debug("Current config", this.configManager.getConfig());
      this.log.debug("Current prompt", { prompt: this.prompts[this.currentRound] });

      await this.handleNextPrompt();

      const { seedID, messageID } = await this.fetchGeneratedData();
      await this.downloadImages(seedID);
      await this.midjourneyDis.DeletePromt(messageID);

      this.currentRound++;
      this.configManager.nextLile(this.currentRound);
      this.configManager.saveConfig();

      this.log.info("Round completed", { round: this.currentRound });
      await this.processRound();

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