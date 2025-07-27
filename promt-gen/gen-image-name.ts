require("dotenv").config();
import { IAiAdaterConfig, IOutputKeyWord, Models } from "../src/interface/promt";
import Logs from "../src/logs";
import GenName from "../src/promt/gen-name";
import ReadFile, { IFileData } from "../src/util/readfile";
import Ut from "../src/util/util";

interface Config {
  apiKeys: string[];
  folderPath: string;
  outputCsvPath: string;
  log: Logs;
}

interface IBotConfig {
  isAvailable: boolean;
  no: number;
  promtGen: GenName;
}

interface IBotResult {
  filename: string;
  title: string;
  keyword: string;
  category: string;
  release: string;
}

class GenImageName {
  private apiKeys: string[];
  private log: Logs;
  private bots: IBotConfig[] = [];
  private outputCsvPath: string;
  private readfile: ReadFile;

  constructor(config: Config) {
    this.apiKeys = config.apiKeys;
    this.log = config.log;
    this.outputCsvPath = config.outputCsvPath;
    this.readfile = new ReadFile(config.folderPath);
    this.initBots();
  }

  private initBots() {
    this.apiKeys.forEach((key, index) => {
      if (!key) {
        this.log.error("APIKEYS is empty");
        process.exit(1);
      }

      this.bots.push({
        isAvailable: true,
        no: index,
        promtGen: new GenName({ api_key: key, model: Models.gemini_2_0_flash })
      });
    });
  }

  public async run() {
    this.log.info("Start running");
    const files = this.readfile.readFilesFromFolder();
    const existingFiles = new Set((await this.readfile.readCSV(this.outputCsvPath)).map(row => row[0]));
    const filesToProcess = files.filter(file => !existingFiles.has(file.filename));

    if (!filesToProcess.length) {
      this.log.info("No new files to process");
      return;
    }

    let fileIndex = 0;
    const getNextIndex = () => fileIndex++;

    const workerTasks = this.bots.map((bot) => this.runBotWorker(bot, filesToProcess, getNextIndex));

    await Promise.all(workerTasks);

    this.log.info("All files processed.");
  }

  private async runBotWorker(bot: IBotConfig, files: IFileData[], getNextIndex: () => number): Promise<void> {
    while (true) {
      const index = getNextIndex();
      if (index >= files.length) break;

      const file = files[index];
      this.log.info(`Bot ${bot.no} processing file ${index + 1}/${files.length}: ${file.filepath}`);

      try {
        const result = await this.processFile(bot, file);
        if (result) await this.writeCompletedKeyword(result);
      } catch (err) {
        this.log.error(`Bot ${bot.no} error: ${err}`);
      }

      await Ut.Delay(2000); // delay เพื่อหลีกเลี่ยง rate limit
    }
  }

  private async processFile(bot: IBotConfig, file: IFileData): Promise<IBotResult | null> {
    this.log.info(`Bot ${bot.no} processing file: ${file.filepath}`);
    bot.isAvailable = false;

    try {
      const resultChat = await bot.promtGen.process(file.filepath) as IOutputKeyWord;
      return {
        filename: file.filename,
        title: resultChat.title,
        keyword: resultChat.keywords.join(", "),
        category: resultChat.category,
        release: new Date().toISOString().split("T")[0]
      };
    } catch (error) {
      this.log.error("Error processing file: " + error);
      return null;
    } finally {
      bot.isAvailable = true;
    }
  }

  private async writeCompletedKeyword(detail: IBotResult): Promise<void> {
    await this.readfile.saveToCsv(this.outputCsvPath, detail);
  }
}

// Load API keys from environment variables
const apiKeys = [
  process.env.GEMINI_KEY,
  process.env.GEMINI_KEY_2,
  process.env.GEMINI_KEY_3,
  process.env.GEMINI_KEY_4,
  process.env.GEMINI_KEY_5,
  process.env.GEMINI_KEY_6,
].filter(Boolean) as string[];

if (!apiKeys.length) {
  console.error("No API keys provided in environment variables.");
  process.exit(1);
}

new GenImageName({
  apiKeys,
  folderPath: "/home/tonkung/work/upscayl/auto-bot-midjourney-discord/image_classifier_project/newcod/output/for_use_1",
  outputCsvPath: "./2025-05-18-comfy-08-001.csv",
  log: new Logs()
}).run();
