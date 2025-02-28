import PromtGenerater from "./src/promt/promt";
import { IAiAdaterConfig, Models } from "./src/interface/promt";
require("dotenv").config();
import DataDBHandler, { IDataPromt } from "./src/util/db";
const fs = require('fs');
const db = new DataDBHandler();

// Read keywords from keyword.txt
function readKeywords(): string[] {
    const keywords = fs.readFileSync('./keyword.txt', 'utf-8').split('\n').map((line: string) => line.trim()).filter((line: string) => line);
    return keywords;
}

// Write completed keyword to complate-key.txt
function writeCompletedKeyword(keyword: string) {
    fs.appendFileSync('./complate-key.txt', `${keyword}\n`);
}

// Read completed keywords from complate-key.txt
function readCompletedKeywords(): Set<string> {
    const completed = new Set<string>(fs.readFileSync('./complate-key.txt', 'utf-8').split('\n').map((line: string) => line.trim()).filter((line: string) => line));
    return completed;
}


// Initialize keywords
let loveSymbols = readKeywords();

// Filter out completed keywords
const completedKeywords = readCompletedKeywords();
loveSymbols = loveSymbols.filter(keyword => !completedKeywords.has(keyword));

interface IPromtGenerater {
    IsReady : boolean
    PromtGenerater : PromtGenerater
}

(async function () {
    console.log("START");

    const config: IAiAdaterConfig = {
        api_key: process.env.GEMINI_KEY as string,
        model: Models.gemini_2_0_flash,
        promtPerRound: 10,
    };
    const promtGenerater = new PromtGenerater(config);

    for (let index = 0; index < loveSymbols.length; index++) {
        const element = loveSymbols[index];
        for (let subIndex = 0; subIndex < 6; subIndex++) {
            console.log('Keyword', element, ' Round:', index + 1, "/ ", loveSymbols.length, ' SubRound:', subIndex + 1);

            try {
                const promts: string[] = await promtGenerater.Generate(element);
                const promtsToInsert: IDataPromt[] = promts.map((promt, index) => ({
                    Title: promt,
                    Stage: 'START', // ค่าเริ่มต้น
                    SeedID: '', // ค่าเริ่มต้น          
                    Round: index + 1, // ค่าเริ่มต้น
                    ImageUrl: '', // ค่าเริ่มต้น
                }));
                console.log("promtsToInsert", promtsToInsert.length);

                await db.bulkInsertWithConflictHandling(promtsToInsert)
            } catch (error) {
                throw error
            }
            await new Promise(resolve => setTimeout(resolve, 3500));
        }
        writeCompletedKeyword(element);
    }
    console.log("END");
})()
