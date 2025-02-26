import DataDBHandler, { IDataPromt } from "./src/util/db";
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import Ut, { Utils } from "./src/util/util";

export async function bufferToJpgImage(buffer: Buffer, outputPath: string): Promise<void> {
    try {
        // บันทึก buffer ลงในไฟล์ JPG
        await fs.writeFile(outputPath, buffer);
        console.log(`บันทึกรูปภาพเรียบร้อยแล้วที่: ${outputPath}`);
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการบันทึกรูปภาพ:', error);
        throw error;
    }
}


const db = new DataDBHandler();

const serverAddress = 'tower-outcome-perception-liverpool.trycloudflare.com';
// ฟังก์ชันสำหรับดึงข้อมูลภาพ
async function getImage(filename: string, subfolder: string, folderType: string): Promise<Buffer> {
    try {
        const response = await axios.get(`http://${serverAddress}/view`, {
            params: { filename, subfolder, type: folderType },
            responseType: 'arraybuffer',
        });
        return Buffer.from(response.data);
    } catch (error) {
        console.error('Error fetching image:', error);
        throw error;
    }
}

// ฟังก์ชันสำหรับดึงประวัติการสร้างภาพ
async function getHistory(promptId: string): Promise<any> {
    try {
        const response = await axios.get(`http://${serverAddress}/history/${promptId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching history:', error);
        throw error;
    }
}

(async () => {

    while (true) {
        var promttext = await db.findAllWait()
        // console.log("promtText?.Title", promttext?.PromtId);
        var promptId =  promttext?.PromtId as string
        // var promttext = {
        //     ID: "test",
        //     PromtId: "test"
        // }
        if (promptId != '' && promptId != undefined) {
            try {
                console.log("เริ่มดาวโหลด");
                const outputPath = path.join(__dirname, 'comfy', `${promttext?.ID}_${promttext?.PromtId}.jpg`);
                // ดึงประวัติการสร้างภาพ
                const outputImages: any = {};
                const history = await getHistory(promptId);                
                for (const nodeId in history[promptId].outputs) {
                    const nodeOutput = history[promptId].outputs[nodeId];
                    if (nodeOutput.images) {
                        const imagesOutput: any[] = [];
                        for (const image of nodeOutput.images) {
                            const imageData = await getImage(image.filename, image.subfolder, image.type);
                            imagesOutput.push(imageData);
                        }
                        outputImages[nodeId] = imagesOutput;
                    }
                }
    
                await bufferToJpgImage(outputImages['10'], outputPath);
                await db.updateStageByID(promttext?.ID as string, "DONE", "", promptId);
            } catch (error) {
                console.log("Error:", error);
                throw new Error("Error downloading image");
                
            }
    
        } else {
            console.log("promptId is empty Next time in 5 seconds :",new Date().toISOString());
            await Ut.Delay(5000);
        } 
    }
    

})()
