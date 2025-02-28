import MidjourneyDiscord from "./src/mid_discord";
// import Units from "./src/util/image_downloader";
// import FetchPuppeteer from "./src/util/fetch_image";
import Logs from "./src/logs";
// import DataJSONHandler from "./src/util/json";
import Ut, { Utils } from "./src/util/util";
import dayjs = require('dayjs');
import DataDBHandler, { IDataPromt } from "./src/util/db";
dayjs().format();
require("dotenv").config();


class MidjourneyController {
  private static readonly REGEX_WAIT_GEN = /\((Waiting to start)\)/g;
  private static readonly REGEX_DOWNLOAD = /\((fast|turbo|relax|relaxed)(, stealth)?\)/g;
  private static readonly CHECK_INTERVAL = 30000; // 30 seconds
  private static readonly imagePerRound = 1; // 30 seconds
  // private static readonly REGEX_FINAL = /<@\d+> \((fast|turbo|relax)(, stealth)?\)/g;
  // private static readonly REGEX_PERCENT = /\(\d{2}%\) \((fast|turbo|relax)(, stealth)?\)/g;
  private midjourneyDis: MidjourneyDiscord;
  private log: Logs;
  private nextPromtPerRound: number;
  private currentPromtPerRound: number;
  private promtSendIng: number;
  // private dataHandler: DataJSONHandler
  private dataHandler: DataDBHandler
  private stopHour: number
  private stopWhen: dayjs.Dayjs
  private attemptCounter = 0; // Keep track of attempts

  // private retireRound: number
  // private imagePerRound: number
  constructor () {
    // this.nextPromtPerRound = Ut.RandomNumber(2, 5);
    // this.currentPromtPerRound = Ut.RandomNumber(2, 5);
    this.nextPromtPerRound = 3
    this.currentPromtPerRound = 3
    this.promtSendIng = 0
    this.midjourneyDis = new MidjourneyDiscord(process?.env?.discord_token as string);
    this.dataHandler = new DataDBHandler();
    this.log = new Logs();

    let currentDate = dayjs()
    this.stopWhen = currentDate.add(Ut.RandomNumber(3, 4), 'h')
    this.stopHour = Ut.RandomNumber(1, 2)
  }


  // random promt per round 
  private randomPromtPerRound(): void {
    this.nextPromtPerRound = 3
    // this.currentPromtPerRound = this.nextPromtPerRound
    // const nextPromtPerRound = Ut.RandomNumber(2, 5);
    // if (this.currentPromtPerRound === nextPromtPerRound) {
    //   this.randomPromtPerRound()
    // } else {
    //   this.nextPromtPerRound = nextPromtPerRound
    // }
  }

  private randomStopTime() {
    let currentDate = dayjs()
    this.stopWhen = currentDate.add(Ut.RandomNumber(4, 6), 'h')
    this.stopHour = Ut.RandomNumber(2, 4)
  }

  private async isClose(): Promise<void> {
    let currentDate = dayjs()
    if (currentDate.isAfter(this.stopWhen)) {
      this.log.info("Stop Time :" + this.stopHour + " Hour");
      await Ut.Delay(Ut.ToHour(this.stopHour))
      this.randomStopTime()
    }
  }

  /**
   * Checks if the generation process is currently in progress. in First time 
   *
   * @return {Promise<boolean>} true if the generation process is in progress, false otherwise
   */
  private async checkIsSlotGenerating(imageRound: number = MidjourneyController.imagePerRound): Promise<boolean> {

    try {
      const messages = await this.midjourneyDis.GetPromts(imageRound);
      if (!messages.length) {
        throw new Error("No messages found");
      }
      const isExistingGenerating = messages.map((message) =>
        !!message.content.match(MidjourneyController.REGEX_WAIT_GEN)
        ||
        !!message.content.match(MidjourneyController.REGEX_DOWNLOAD)
      )

      const findFalse = isExistingGenerating.findIndex(item => item === false)
      return findFalse == -1
    } catch (error) {
      this.log.error(`Generation check failed: ${error}`);
      throw error;
    }
  }

  // private async handleNextPrompt(): Promise<number> {

  //   const promt = await this.dataHandler.findFirstStart();
  //   if (!promt) {
  //     this.log.info("End of current file reached");
  //     this.retire = false
  //     throw new Error("End of current file reached");
  //   }

  //   const isSlotGeneratings = await this.checkIsSlotGenerating();
  //   console.log("isGeneratings",isSlotGeneratings);

  //   if (!isSlotGeneratings) {
  //     this.log.info("Sending prompt", { round: promt.Round });
  //     try {
  //       console.log("promt.Title) =>", promt);
  //       try {

  //         await this.midjourneyDis.SendPromtv2(promt.Title);
  //       } catch (error) {
  //         console.log("error",error);

  //       }
  //       const isGeneratingsInside = await this.checkIsSlotGenerating(1);
  //       if (isGeneratingsInside === false) {
  //         throw new Error("Please Verify bot in Discord");
  //       }

  //       await this.dataHandler.updateStageByTitle(promt.Title, 'WAITING');
  //       return promt.Round
  //     } catch (error) {
  //       throw new Error("Error sending prompt: " + error);
  //     }
  //   } else {
  //     return 0
  //   }
  // }
  // Exponential Backoff
  private async retryWithDelay<T>(
    fn: () => Promise<T>,
    retries: number,
    delayMs: number
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        console.warn(`Retrying... Attempts left: ${retries}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.retryWithDelay(fn, retries - 1, delayMs);
      } else {
        console.error('All retries failed');
        throw error; // Reject after all retries fail
      }
    }
  }

  private async SendPromts(round: number = 0): Promise<void> {
    let currentRound = 0
    return new Promise(async (resolve, reject) => {
      let isReady = false;

      while (!isReady) {
        try {
          // const promt = await this.retryWithDelay(this.dataHandler.findFirstStart, 3, 1000); // Retry up to 3 times with 1-second delay

          // const promt =  await this.dataHandler.findFirstStart();
          const promt =  await this.dataHandler.retryWithDelayStart( 3, 1000);
          console.log("Send ", promt);
          // if (!promt) {
          //   this.log.info("End of current file reached");
          //   throw new Error("End of current file reached");

          // }
          if (promt == null || promt.Title == "") {
            continue
          }

          const isSlotGeneratings = await this.checkIsSlotGenerating(round);

          if (!isSlotGeneratings) {
            this.log.info("Sending prompt", { round: promt.Round });
            try {
              currentRound++
              const promtTitle = promt.ID+"||"+promt.Title
              await this.midjourneyDis.SendPromtv2(promtTitle);

              await Ut.Delay(3000);
              const isGeneratingsInside = await this.checkIsSlotGenerating(1);

              if (isGeneratingsInside === false) {
                throw new Error("Please Verify bot in Discord");
              }

              await this.dataHandler.updateStageByTitleStart(promt.Title, 'WAITING', "");
            } catch (error) {
              // throw new Error("Error sending prompt: " + error);
              reject("Error sending prompt: " + error);
              throw new Error("Error sending prompt");
            }
          } else {
            isReady = true;
            resolve();
          }
          this.log.info(`currentRound => ${currentRound}, round => ${round}`);

          if (currentRound === round) {
            isReady = true;
            resolve();
          }
          const randomNumber = 5//Ut.RandomNumber(30, 100);
          // const randomNumber = Ut.RandomNumber(30, 100);
          this.log.info("Wait Send Promt in " + randomNumber + " Secound");
          await Ut.Delay(Ut.ToSecound(randomNumber));

        } catch (error) {
          this.log.error(`Error checking slot generating: ${error}`);
          reject(error);
        }
      }
    })
  }

  async processRoundv2(): Promise<void> {
    try {
      this.log.info(`Starting`);
      console.log("this.currentPromtPerRound", this.currentPromtPerRound);
      await this.SendPromts(this.currentPromtPerRound);
      this.randomPromtPerRound()
      const randomNumber = 0//Ut.RandomNumber(4, 5);
      this.log.info("Next Promt in " + randomNumber + " Minute");
      await Ut.Delay(Ut.ToMinutes(randomNumber));
      // this.retireRound = 0
      await this.isClose()
      await this.processRoundv2();
    } catch (error) {
      this.log.error("Error in processing round:", error);
      throw error
    }
  }


  async start(): Promise<void> {
    try {
      await this.processRoundv2();
    } catch (error) {
      const errorMessage = `Service down processing: ${error} when ` + new Date().toISOString()
      await this.midjourneyDis.SendMessage(errorMessage);
      throw error
    }
  }
}

// Usage
(async () => {

  try {
    const controller = new MidjourneyController();
    await controller.start();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
})();

// pm2 start main.ts --name myDiscord --interpreter ts-node --cron-restart="0 * * * *"
// xset dpms force off

