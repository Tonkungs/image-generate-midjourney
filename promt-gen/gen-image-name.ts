require("dotenv").config();
import { IAiAdaterConfig, IOutputKeyWord, Models } from "../src/interface/promt";
import Logs from "../src/logs";
import GenName from "../src/promt/gen-name";
import ReadFile, { IFileData } from "../src/util/readfile";
import Ut from "../src/util/util";
interface config {
  apiKeys: string[],
  folderPath: string,
  outputCsvPath: string
  log: Logs
}
interface IBotConfig {
  isAvailable: boolean
  no: number
  promtGen: GenName
}
interface IBotResult {
  filename: string
  title: string
  keyword: string
  category: string
  release: string
}
class GenImageName {
  private APIKEYS: string[] = [];
  private log: Logs;
  private bots: IBotConfig[] = [];
  private outputCsvPath: string;
  private readfile: ReadFile;
  constructor (config: config) {
    this.APIKEYS = config.apiKeys;
    this.initBots();
    this.log = config.log;
    this.outputCsvPath = config.outputCsvPath;
    this.readfile = new ReadFile(config.folderPath);
  }

  private initBots() {
    for (let index = 0; index < this.APIKEYS.length; index++) {
      const api_key = this.APIKEYS[index];
      if (api_key != "" || api_key != null || api_key != undefined) {

        const config: IAiAdaterConfig = {
          api_key: api_key as string,
          model: Models.gemini_2_0_flash,
        };

        this.bots.push({
          isAvailable: true,
          no: index,
          promtGen: new GenName(config)
        })
      } else {
        this.log.error("APIKEYS is empty");
        process.exit(1);
      }
    }
  }
  public async Run() {
    this.log.info("Start running");
    const listFiles: IFileData[] = this.readfile.readFilesFromFolder();
    const listExistingFiles = await this.readfile.readCSV(this.outputCsvPath);
    const filesToProcess = listFiles.filter(file =>
      !listExistingFiles.some(item => item[0] === file.filename)
    );
    if (filesToProcess.length === 0) {
      this.log.info("No new files to process");
      return;
      
    }
    let round = 0
    // let keywordRunning: string[] = []
    let runningTasks: Promise<IBotResult | null>[] = [];
    // มีบัคไม่ บันทึกข้อมูลรอบสุดท้าย
    let isWaitBot = true
    
    while (round <= filesToProcess.length) {
      console.log("round", round);

      isWaitBot = true
      this.log.info(`รอบที่ ${round + 1} / ${filesToProcess.length}`)
      const image = filesToProcess[round]
      // for last round for save
      if (image === undefined) {
        continue
      }
      while (isWaitBot) {
        const findBotAvailable = this.bots.find(bot => bot.isAvailable)
        if (findBotAvailable === undefined) {
          this.log.info('รอ  Bot ว่าง');
        } else {
          runningTasks.push(this.processData(findBotAvailable, image))
          isWaitBot = false
          break
        }

        if (isWaitBot) {
          this.log.silly("Promise Task =>", {
            runningTasks,
            // keywordRunning

          });
          console.log("Wait 1 sec");
          // console.log("runningTasks",runningTasks);
          let result: any[] = []
          try {
            result = await Promise.all(runningTasks)
          } catch (error) {
            console.log("error", error);

          }

          // ต้องใส่ ไม่งันระบบไม่รอ
          await Ut.Delay(1);
          console.log("result", result);

          for (let index = 0; index < result.length; index++) {
            // console.log("index", index);
            // console.log("result[index]", result[index]);


            const element = result[index];
            // console.log("element", element);

            if (element) {
              // console.log("element", element);

              await this.writeCompletedKeyword(element);
              await Ut.Delay(1);
            }
          }
          // ต้องใส่ ไม่งันระบบไม่รอ

          await Ut.Delay(1);
          // throw new Error("Method not implemented.");
          runningTasks = []
          isWaitBot = true
        }
      }
      round++
    }
  }


  private async processData(bot: IBotConfig, file: IFileData): Promise<IBotResult | null> {
    this.log.info(`Bot ${bot.no} processing keyword "${file.filepath}"`);
    bot.isAvailable = false;

    try {
      const resultChat = await bot.promtGen.process(file.filepath) as IOutputKeyWord
      bot.isAvailable = true;
      // console.log("resultChat", resultChat.title);

      return {
        filename: file.filename,
        title: resultChat.title,//+" PNG transparent background, Isolated background",
        keyword: resultChat.keywords.join(", "),
        category: resultChat.category,
        release: new Date().toISOString().split("T")[0] // วันช้ากว่าเดิน 7 ชัวโมง
      }
    } catch (error) {
      // console.log("error", error);

      this.log.error("Error processing keyword", error);
    }

    return null
  }

  private async writeCompletedKeyword(detail: IBotResult): Promise<void> {
    return await this.readfile.saveToCsv(this.outputCsvPath, detail);
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

const folderPath = "/home/tonkung/work/upscayl/auto-bot-midjourney-discord/comfy-gen/output_comfy07/folder_002";
const outputCsvPath = "./2025-03-26-comfy-07-002.csv";

if (apiKeys.length === 0) {
  console.error("No API keys provided in environment variables.");
  process.exit(1);
}

const processor = new GenImageName({
  apiKeys,
  folderPath,
  outputCsvPath,
  log: new Logs()
});
processor.Run();
