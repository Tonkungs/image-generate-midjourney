require("dotenv").config();
import PromtGenerater from "../src/promt/promt";
import { IAiAdaterConfig, Models } from "../src/interface/promt";
import DataDBHandler, { IDataPromt } from "../src/util/db";
import Logs from "../src/logs";
const fs = require('fs');
const fileKEYWORD = './keyword.txt'
const fileKEYWORD_complate = './complate-key.txt'

interface IPromtGenConfig {
    api_keys: string[],
    keywords: string[],
    db: DataDBHandler,
    log: Logs
}

// Read keywords from keyword.txt
function readKeywords(): string[] {
    const keywords = fs.readFileSync(fileKEYWORD, 'utf-8').split('\n').map((line: string) => line.trim()).filter((line: string) => line);
    return keywords;
}

function readCompletedKeywords(): Set<string> {
    const completed = new Set<string>(fs.readFileSync(fileKEYWORD_complate, 'utf-8').split('\n').map((line: string) => line.trim()).filter((line: string) => line));
    return completed;
}


interface IBotConfig {
    isAvailable: boolean
    no: number
    promtGen: PromtGenerater
}

class PromtGen {

    private APIKEYS: string[] = [];
    private keywords: string[] = []
    private bots: IBotConfig[] = [];
    private DB: DataDBHandler;
    private MAX_ROUND_PER_KEYWORD = 6;
    private MAX_ROUND_PER_PROMT = 10;
    private log: Logs;
    // private last
    constructor (config: IPromtGenConfig) {
        this.APIKEYS = config.api_keys;
        this.keywords = config.keywords;
        this.DB = config.db;
        this.initBots();
        this.log = config.log;
    }

    private initBots() {
        for (let index = 0; index < this.APIKEYS.length; index++) {
            const api_key = this.APIKEYS[index];
            if (api_key != "" || api_key != null || api_key != undefined) {

                const config: IAiAdaterConfig = {
                    api_key: api_key as string,
                    model: Models.gemini_2_0_flash,
                    promtPerRound: this.MAX_ROUND_PER_PROMT,
                };

                this.bots.push({
                    isAvailable: true,
                    no: index,
                    promtGen: new PromtGenerater(config)
                })
            }
        }        
    }


    /**
     * Run
     */
    public async Run() {
        this.log.info("Start running");
        let roundKeyword = 0
        let keywordRunning: string[] = []
        let runningTasks: Promise<void>[] = [];

        while (roundKeyword < this.keywords.length) {
            const keyword = this.keywords[roundKeyword]
            let isWaitBot = true
            // console.log('รอบที่ ', roundKeyword + 1, '/', this.kesywords.length);
            this.log.info(`รอบที่ ${roundKeyword + 1} / ${this.keywords.length}`,{
                round: roundKeyword + 1,
                total: this.keywords.length
            })
            while (isWaitBot) {
                const findBotAvailable = this.bots.find(bot => bot.isAvailable)
                if (findBotAvailable === undefined) {
                    // console.log('รอ  Bot ว่าง');
                    this.log.info('รอ  Bot ว่าง');
                } else {
                    keywordRunning.push(keyword)
                    runningTasks.push(this.processData(findBotAvailable.no, keyword))
                    // await this.processData(botIndex, keyword)
                    isWaitBot = false
                    break
                }


                if (isWaitBot) {
                    // console.log("Promise Task =>",runningTasks.length);
                    this.log.silly("Promise Task =>",{
                        taskRunning: runningTasks.length
                    });
                    await Promise.all(runningTasks)
                    // ต้องใส่ ไม่งันระบบไม่รอ
                    await this.delay(1);

                    // Write file complate-key.txt
                    for (let index = 0; index < keywordRunning.length; index++) {
                        const element = keywordRunning[index];
                        // console.log('Save keyword', element);
                        this.writeCompletedKeyword(element)
                        this.log.silly('Save keyword', element);

                    }
                    // Reset task
                    runningTasks = [];
                    keywordRunning = [];
                    isWaitBot = true
                }
            }
            roundKeyword++
        }

        this.log.info("End running");
    }

    private async processData(botIndex: number, keyword: string): Promise<void> {
        const bot = this.bots[botIndex]

        bot.isAvailable = false;
        for (let subIndex = 0; subIndex < this.MAX_ROUND_PER_KEYWORD; subIndex++) {
            try {
                this.log.info(`Bot ${botIndex} processing keyword "${keyword}" round ${subIndex + 1}/ ${this.MAX_ROUND_PER_KEYWORD}`,
                    { botIndex, keyword, round: subIndex + 1 }
                );
                // console.log("botIndex = > ", botIndex, ' keyword = "', keyword, '"Round = ', subIndex + 1);
                // ดึงข้อมูล
                const promts: string[] = await bot.promtGen.Generate(keyword);

                // Prepare Insert
                const promtsToInsert: IDataPromt[] = promts.map((promt, index) => ({
                    Title: promt,
                    Stage: 'START', // ค่าเริ่มต้น
                    SeedID: '', // ค่าเริ่มต้น          
                    Round: index + 1, // ค่าเริ่มต้น
                    ImageUrl: '', // ค่าเริ่มต้น
                }));
                await this.DB.bulkInsertWithConflictHandling(promtsToInsert)
                // await this.delay(1000);

            } catch (error) {
                this.log.error("Error in processData", {
                    botIndex,
                    keyword,
                    round: subIndex + 1,
                    error
                });

                throw error
            }
        }
        bot.isAvailable = true;
        return Promise.resolve();
    }

    private writeCompletedKeyword(keyword: string) {
        fs.appendFileSync(fileKEYWORD_complate, `${keyword}\n`);
    }

    /**
     * Delay
     * @param ms 
     * @returns Promise<void>
     */
    public async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

const db = new DataDBHandler();


// Read completed keywords from complate-key.txt

// Initialize keywords
let loveSymbols = readKeywords();

// Filter out completed keywords
const completedKeywords = readCompletedKeywords();
loveSymbols = loveSymbols.filter(keyword => !completedKeywords.has(keyword));

const promt = new PromtGen({
    api_keys: [
        // process.env.GEMINI_KEY as string,
        // process.env.GEMINI_KEY_2 as string,
        process.env.GEMINI_KEY_3 as string
    ],
    keywords: loveSymbols,
    db: db,
    log: new Logs(),
});

(() => {
    promt.Run();
})()
// Waterberg Plateau Park
// 27150
