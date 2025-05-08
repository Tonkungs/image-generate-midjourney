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

  constructor (config: Config) {
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

    for (let round = 0; round < filesToProcess.length; round++) {
      const file = filesToProcess[round];
      this.log.info(`Processing round ${round + 1} / ${filesToProcess.length}`);

      let bot = this.bots.find(bot => bot.isAvailable);
      let waitingLogged = false;

      while (!bot) {
        if (!waitingLogged) {
          this.log.info("Waiting for an available bot...");
          waitingLogged = true;
        }
        await Ut.Delay(1);
        bot = this.bots.find(bot => bot.isAvailable);
      }

      this.processFile(bot, file).then(result => {
        if (result) this.writeCompletedKeyword(result);
      });
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
      this.log.error("Error processing file", error);
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
  process.env.GEMINI_KEY as string,
  process.env.GEMINI_KEY_2 as string,
  process.env.GEMINI_KEY_3 as string,
  process.env.GEMINI_KEY_4 as string,
  process.env.GEMINI_KEY_5 as string,
  process.env.GEMINI_KEY_6 as string,
]
  .filter(Boolean);

if (!apiKeys.length) {
  console.error("No API keys provided in environment variables.");
  process.exit(1);
}

new GenImageName({
  apiKeys,
  folderPath: "/home/tonkung/work/upscayl/auto-bot-midjourney-discord/comfy-gen/output_comfy08/folder_004",
  outputCsvPath: "./2025-04-16-comfy-08-004.csv",
  log: new Logs()
}).run();
