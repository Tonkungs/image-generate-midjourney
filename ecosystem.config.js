module.exports = {
    apps: [
      {
        name: "comfy-gen",             // ชื่อโปรเซส
        script: "./comfy-gen/comfy-gen.ts",         // ไฟล์ที่ต้องการรัน
        instances: 1,               // จำนวน instance (ใช้ 'max' เพื่อรันเต็มจำนวน core)
        exec_mode: "cluster",       // โหมด 'cluster' หรือ 'fork'
        // watch: true,                // ให้รีสตาร์ทอัตโนมัติเมื่อไฟล์เปลี่ยนแปลง
        max_restarts: 10000, // จำกัดการ restart สูงสุด 10 ครั้ง
        restart_delay: 5000, // รอ 5 วินาทีก่อน restart ใหม่
        max_memory_restart: "1000M", // รีสตาร์ทเมื่อใช้หน่วยความจำเกินกำหนด
        env: {                      // Environment variables (default)
          NODE_ENV: "development",
        },
        env_production: {           // Environment variables สำหรับ production
          NODE_ENV: "production",
        },
        interpreter: "ts-node", // อ้างอิง ts-node จาก node_modules
        log_date_format: "YYYY-MM-DD HH:mm Z", // ฟอร์แมต log
        error_file: "./logspm2/err.log", // ไฟล์สำหรับเก็บ error log
        out_file: "./logspm2/out.log",   // ไฟล์สำหรับเก็บ log ปกติ
        merge_logs: true,             // รวม log ทั้งหมดในไฟล์เดียว
        cron_restart: "*/30 * * * *",  // รีสตาร์ททุก 30 นาที
      },
      {
        name: "comfy-download",             // ชื่อโปรเซส
        script: "./comfy-gen/comfy-down.ts",         // ไฟล์ที่ต้องการรัน
        instances: 1,               // จำนวน instance (ใช้ 'max' เพื่อรันเต็มจำนวน core)
        exec_mode: "cluster",       // โหมด 'cluster' หรือ 'fork'
        // watch: true,                // ให้รีสตาร์ทอัตโนมัติเมื่อไฟล์เปลี่ยนแปลง
        max_restarts: 10000, // จำกัดการ restart สูงสุด 10 ครั้ง
        restart_delay: 5000, // รอ 5 วินาทีก่อน restart ใหม่
        max_memory_restart: "1000M", // รีสตาร์ทเมื่อใช้หน่วยความจำเกินกำหนด
        env: {                      // Environment variables (default)
          NODE_ENV: "development",
        },
        env_production: {           // Environment variables สำหรับ production
          NODE_ENV: "production",
        },
        interpreter: "ts-node", // อ้างอิง ts-node จาก node_modules
        log_date_format: "YYYY-MM-DD HH:mm Z", // ฟอร์แมต log
        error_file: "./logspm2/err.log", // ไฟล์สำหรับเก็บ error log
        out_file: "./logspm2/out.log",   // ไฟล์สำหรับเก็บ log ปกติ
        merge_logs: true,             // รวม log ทั้งหมดในไฟล์เดียว
        cron_restart: "*/30 * * * *",  // รีสตาร์ททุก 30 นาที
      },
    ],
  };
  