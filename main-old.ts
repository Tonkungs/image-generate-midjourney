import path from "path";
import MidjourneyDiscord from "./src/mid_discord";
import Units from "./src/util/image_downloader";
import { ConfigManager } from "./src/util/config_manager";
import FetchPuppeteer from "./src/util/fetch_image";
import Logs from "./src/logs";

const fs = require('fs').promises;
const regexFinal = /<@\d+>/g;
const regexPercent = /\(\d{2}%\) \((fast|turbo|relax)(, stealth)?\)/g;
let round = 0;
let midjourneyDis: MidjourneyDiscord;
let promts: string[];
let configManager: ConfigManager;
let brower: FetchPuppeteer;
let log: Logs;
let MaxAgain = 5
let Again = 0;
let dirImage: string;



interface FetchDataResult {
  seedID: string;
  messageID: string;
}

async function fetchData(): Promise<FetchDataResult> {
  return new Promise(async (resolve, reject) => {
    let isReady = false;

    while (!isReady) {
      log.info("กำลังเช็คข้อความ...");
      try {
        let listMessages = await midjourneyDis.GetPromts(1); // ดึงข้อมูลจาก midjourneyDis

        if (listMessages.length === 0) {
          log.error("listMessages length = 0", listMessages);
          throw new Error("listMessages length = 0");
        }

        let item = listMessages[0];
        const text = item.content;
        const messageID = item.id;
        const matches = text.match(regexFinal);
        const matchesPercent = text.match(regexPercent);

        if (matches && !matchesPercent && item.attachments.length > 0) {
          const id = Units.processString(item.attachments[0].filename);
          log.debug("ID " + id, { id: id, attachment: item.attachments[0] });
          if (id && id != "0.webp") {
            isReady = true;
            const fetchDataResult: FetchDataResult = {
              seedID: id,
              messageID: messageID
            };
            resolve(fetchDataResult); // ข้อมูลพร้อม ทำการ resolve Promise
          } else {
            // console.log("ไม่พบ ID ที่ถูกต้อง");
            log.error("ไม่พบ ID ที่ถูกต้อง" + id, { id: id, round: round + 1 });
            log.info("ข้อมูลยังไม่พร้อม จะเช็คใหม่อีกครั้งใน 45 วินาที...", { round: round + 1 });
            isReady = false;
          }

        } else {
          log.info("ข้อมูลยังไม่พร้อม จะเช็คใหม่อีกครั้งใน 45 วินาที...", { round: round + 1 });
        }

      } catch (error) {
        reject(error);
        log.error("เกิดข้อผิดพลาด: " + error, { round: round + 1 });
        throw new Error("เกิดข้อผิดพลาด: " + error);
      }

      // รอ 45 วินาทีก่อนที่จะเช็คข้อมูลใหม่
      await new Promise((resolve) => setTimeout(resolve, 45000));
    }
  });
}

async function checkIsGenerateing(): Promise<boolean> {
  try {
    let listMessages = await midjourneyDis.GetPromts(1); // ดึงข้อมูลจาก midjourneyDis

    if (listMessages.length === 0) {
      log.error("listMessages length = 0", listMessages);
      throw new Error("listMessages length = 0");
    }

    let item = listMessages[0];
    const text = item.content;
    return !!text.match(regexFinal);
  } catch (error) {
    log.error("checkIsGenerateing: " + error, { round: round + 1 });
    throw new Error("checkIsGenerateing: " + error);

  }
}

async function mainTime(): Promise<void> {
  try {
    // await delay(5000)
    log.info("Start Round :" + (round + 1));
    log.debug("configManager", configManager.getConfig());
    log.debug("promts =>", { promt: promts[round] });
    console.log("round",round);
    
    if (promts[round] === "" || promts[round] === undefined) {
      log.info("END");
      configManager.nextFile();
      configManager.saveConfig();
      promts = Units.readFileSync("./promt/" + configManager.getConfig().file);
      round = configManager.getConfig().line;
      dirImage = configManager.getImagePath()
      log.info("Next File");
      mainTime()
    }
    // await delay(5000)
    const checkIDRun = await checkIsGenerateing()
    if (!checkIDRun) {
      log.info("Send Promt", { round: round + 1 });
      await midjourneyDis.SendPromt(promts[round]);
    }


    // รอ generate file
    let { seedID, messageID } = await fetchData()
    // ดาวโหลดไฟล์
    log.debug("seedID", { "seed_id": seedID, "message_id": messageID, round: round + 1 });
    if (seedID) {
      const url_1 = `https://cdn.midjourney.com/${seedID}/0_0.jpeg`
      const url_2 = `https://cdn.midjourney.com/${seedID}/0_1.jpeg`
      const url_3 = `https://cdn.midjourney.com/${seedID}/0_2.jpeg`
      const url_4 = `https://cdn.midjourney.com/${seedID}/0_3.jpeg`

      const outputFilePath1 = path.join(dirImage, String(round + 1) + `_${seedID}_0_0.jpg`);
      const outputFilePath2 = path.join(dirImage, String(round + 1) + `_${seedID}_0_1.jpg`);
      const outputFilePath3 = path.join(dirImage, String(round + 1) + `_${seedID}_0_2.jpg`);
      const outputFilePath4 = path.join(dirImage, String(round + 1) + `_${seedID}_0_3.jpg`);

      try {
        log.info("Wait 20 Seconds For Generate Full Photo", {
          url_1: url_1, url_2: url_2, url_3: url_3, url_4: url_4, dirImage: dirImage, seedID: seedID
        });
        await delay(20000)
        // ต้องทำที่ละหน้าเท่านั้นเพราะ มี brower เดียว
        const img1 = await brower.lunchPuppeteer(url_1);
        const img2 = await brower.lunchPuppeteer(url_2);
        const img3 = await brower.lunchPuppeteer(url_3);
        const img4 = await brower.lunchPuppeteer(url_4);

        // fs.writeFileSync(outputFilePath1, img1);
        // fs.writeFileSync(outputFilePath2, img2);
        // fs.writeFileSync(outputFilePath3, img3);
        // fs.writeFileSync(outputFilePath4, img4);
        // ใช้ Promise.all เพื่อให้เขียนไฟล์พร้อมกัน
        await Promise.all([
          fs.writeFile(outputFilePath1, img1),
          fs.writeFile(outputFilePath2, img2),
          fs.writeFile(outputFilePath3, img3),
          fs.writeFile(outputFilePath4, img4)
        ]);

        log.info("Image Download Complete!");
      } catch (error) {
        log.error("Download failed:", error);
        throw new Error("Download failed: " + error);
      }

    } else {
      log.error("seedID not found or attachments is empty", { "seed_id": seedID });
      throw new Error("ID not found or attachments is empty");
    }

    // สั่งลบไฟล์
    await midjourneyDis.DeletePromt(messageID);



    round++
    configManager.nextLile(round);
    configManager.saveConfig()
    log.info("END Round", { round: round });
    mainTime()

  } catch (error) {
    // brower.close();
    log.error("Error Midjourney", error);

    // if (Again <= MaxAgain) {
    //   Again++
      // brower.start();
      log.error("Restart Again Round : ", Again);
      mainTime()
    //   return
    // }

    throw new Error("Error Midjourney => " + error);
  }

};


(async function name() {
  try {
    midjourneyDis = new MidjourneyDiscord();
    configManager = new ConfigManager('./config/config.txt', "./promt", __dirname);
    promts = Units.readFileSync("./promt/" + configManager.getConfig().file);
    brower = new FetchPuppeteer();
    log = new Logs()

    brower.start();
    // Get Line Last
    round = configManager.getConfig().line;
    dirImage = configManager.getImagePath()

    mainTime();
  } catch (error) {
    throw new Error("Error reading config file: " + error);
  }
})()


// ลบตัวเลข
// ^\d+\.\s*
// ลบช่องว่าง
// ^\s*\n
// Function to introduce a delay
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));


