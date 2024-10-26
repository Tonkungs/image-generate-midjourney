module.exports = {
    apps: [
      {
        name: "myApp",             // ชื่อโปรเซส
        script: "./main.ts",         // ไฟล์ที่ต้องการรัน
        instances: 1,               // จำนวน instance (ใช้ 'max' เพื่อรันเต็มจำนวน core)
        exec_mode: "cluster",       // โหมด 'cluster' หรือ 'fork'
        watch: true,                // ให้รีสตาร์ทอัตโนมัติเมื่อไฟล์เปลี่ยนแปลง
        max_memory_restart: "1000M", // รีสตาร์ทเมื่อใช้หน่วยความจำเกินกำหนด
        env: {                      // Environment variables (default)
          NODE_ENV: "development",
        },
        env_production: {           // Environment variables สำหรับ production
          NODE_ENV: "production",
        },
        interpreter: "/usr/bin/ts-node", // อ้างอิง ts-node จาก node_modules
        log_date_format: "YYYY-MM-DD HH:mm Z", // ฟอร์แมต log
        error_file: "./logspm2/err.log", // ไฟล์สำหรับเก็บ error log
        out_file: "./logspm2/out.log",   // ไฟล์สำหรับเก็บ log ปกติ
        merge_logs: true,             // รวม log ทั้งหมดในไฟล์เดียว
        cron_restart: "0 * * * *",    // รีสตาร์ททุกๆ ชั่วโมง
      },
    ],
  };
  