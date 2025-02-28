import { parentPort, workerData } from "worker_threads";
// import fetch from "node-fetch";
// import axios from "axios"; // ใช้ axios แทน node-fetch
import * as fs from "fs";
import * as path from "path";
import { chromium } from "playwright"; // ใช้ playwright chromium
if (!parentPort) {
    throw new Error("Worker must be run as a worker thread");
}

const seedID = workerData;
async function download(n: string) {
    const urls = Array.from({ length: 4 }, (_, i) =>
        `https://cdn.midjourney.com/${n}/0_${i}.jpeg`
    );

    const filePaths = urls.map((_, i) =>
        path.join("01-09", `${1}_${n}_0_${i}.jpg`)
    );


    try {
        // เริ่มต้น browser และเปิดหน้าเพจใหม่
        const browser = await chromium.launch({
            headless: true
        });

        let pages = [];
        for (let i = 0; i < 4; i++) {
            const page = await browser!.newPage();
            await page.setExtraHTTPHeaders({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
            });
            pages.push(page);
        }

        const buffers: Buffer[] = [];

        const openPagePromises = pages.slice(0, 4).map(async (page, i) => {
            // ไปที่ URL และโหลดหน้าเพจ
            const response = await page.goto(urls[i], {
                waitUntil: 'networkidle', // รอให้โหลดหน้าเว็บเสร็จ
            });

            // ตรวจสอบว่าโหลดสำเร็จหรือไม่
            if (!response?.ok()) {
                throw new Error(`Failed to download image from ${urls[i]}: ${response?.statusText()}`);
            }

            // ดาวน์โหลดภาพจาก URL โดยการจับข้อมูลใน response
            // ดึง body ของ response เป็น Buffer
            const buffer = await response.body(); // ใช้ .body() เพื่อดึงข้อมูลจากภาพ
            buffers.push(buffer);
            // บันทึก Buffer ลงไฟล์
            fs.writeFileSync(filePaths[i], buffer);
        });

        await Promise.all(openPagePromises); 
        await browser.close();

        return [...filePaths]; // คืน path ของไฟล์ที่ดาวน์โหลดเสร็จ
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to download image from : ${error.message}`);
        } else {
            throw new Error(`Failed to download image from unknown error : ${error}`);
        }
    }

    // const fileName = path.basename(urls[0]); // ชื่อไฟล์จาก URL
    // const outputPath = filePaths[0]

    // ใช้ fetch เพื่อดาวน์โหลดไฟล์
    // const response = await fetch(urls[0]);
    // if (!response.ok) {
    //   throw new Error(`Failed to download image from ${urls}: ${response.statusText}`);
    // }
    // // แปลงข้อมูลเป็น ArrayBuffer และเขียนลงไฟล์
    // const arrayBuffer = await response.arrayBuffer();
    // const buffer = Buffer.from(arrayBuffer);
    // fs.writeFileSync(outputPath, buffer);

    // return outputPath; // คืน path ของไฟล์ที่ดาวน์โหลดเสร็จ
    // console.log("filePaths", filePaths);
    // console.log("urls", urls);
    // const browser = new FetchPuppeteer();
    // await browser.start();

    // return n
    // return new Promise((resolve, reject) => {
    //     setTimeout(() => {
    //         console.log(`Downloading ${n}...`);
    //         resolve(n);
    //     }, 1000);
    // });
    // return new Promise((resolve, reject) => {
    //     try {
    //         setTimeout(() => {
    //             console.log(`Downloading ${n}...`);
    //             resolve(n);
    //         // }, 3000);
    //         },Math.ceil(Math.random()*10000));
    //     } catch (error) {
    //         reject(error);
    //     }
    // });

}
// const result = download(seedID);
// // ส่งผลลัพธ์กลับไปยัง Main Thread

// parentPort.postMessage(result);
// ใช้ Promise ในการจัดการงาน
download(seedID)
    .then((result) => {
        // ส่งผลลัพธ์กลับไปยัง Main Thread
        parentPort?.postMessage({ status: "success", result });
    })
    .catch((error) => {
        // ส่งข้อผิดพลาดกลับไปยัง Main Thread
        parentPort?.postMessage({ status: "error", error: error.message });
    });
