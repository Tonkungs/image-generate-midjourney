import { Worker } from "worker_threads";

// ฟังก์ชันสำหรับสร้าง Worker
function runWorker(workerData: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const worker = new Worker("./src/worker.js", { workerData });
        console.log("Worker is running...");
        worker.on("message", (message) => {
            if (message.status === "success") {
                resolve(message.result); // รับผลลัพธ์จาก Worker
                worker.terminate(); // ปิด worker หลังงานเสร็จ
            } else if (message.status === "error") {
                reject(new Error(message.error)); // รับ Error จาก Worker
                worker.terminate(); // ปิด worker หลังงานเสร็จ
            }
            
        });
        worker.on("error", (err) => {
            reject(err);
            worker.terminate(); // ปิด worker กรณีเกิด error
        });

        worker.on("exit", (code) => {
            if (code !== 0) {
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });
    });
}

(async () => {
    const seedIDS: string[] = [
        "156d2a50-50f6-4797-936a-5b93baeafe9e",
        "7897d4c2-e53a-427f-a45f-357b20c58d9b",
        "7fcd4821-b0fe-4c27-b45d-fd84412f3420",
        "0bb00b95-4698-4774-bd73-4977848be683",
        "1905ed47-1509-448c-8dbf-9b10eafce1dd",
    ];

    const maxConcurrency = 3; // จำกัดให้ทำงานพร้อมกันสูงสุด 3 worker
    const queue: Promise<any>[] = [];
    const results: any[] = [];
    try {

        for (const task of seedIDS) {
            // เรียกใช้ worker และเพิ่มเข้าไปใน queue
            const workerPromise = runWorker(task).then((result) => {
                results.push(result); // เก็บผลลัพธ์เมื่อ worker เสร็จงาน
            });

            queue.push(workerPromise);

            // ถ้า queue เกินจำนวนที่กำหนด ต้องรอให้ worker เสร็จงานก่อนเพิ่มงานใหม่
            if (queue.length >= maxConcurrency) {
                //   await Promise.race(queue);
                // ลบงานที่เสร็จออกจาก queue
                const resolvedPromise = await Promise.race(queue);
                queue.splice(queue.indexOf(resolvedPromise), 1);
            }
        }

        // รอให้ worker ที่เหลือทำงานเสร็จทั้งหมด
        await Promise.all(queue);

        console.log("All tasks completed:", results);
    } catch (error) {
        console.error("Error:", error);
    }


    // const promises = seedIDS.map((num) => runWorker(num)); // สร้าง Worker ตามจำนวนตัวเลข
    // try {
    //     console.log("Main thread is running...");
    //     const results = await Promise.all(promises); // รอผลลัพธ์จากทุก Worker
    //     console.log("Results from workers:", results);
    // } catch (error) {
    //     console.error("Error:", error);
    // }
})();
