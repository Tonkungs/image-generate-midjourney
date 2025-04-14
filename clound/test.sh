#!/bin/bash

LOG_FILE="/var/log/portal/comfyui.log"
READY_MESSAGE="All startup tasks have been completed."

echo "Waiting for ComfyUI to finish startup..."

while true; do
    if [ -f "$LOG_FILE" ]; then
        last_line=$(tail -n 1 "$LOG_FILE")
        if [[ "$last_line" == *"$READY_MESSAGE"* ]]; then
            echo "ComfyUI is ready!"
            break
        fi
    fi
    sleep 5
done

# คำสั่งถัดไปหลังจาก comfyUI พร้อมแล้ว
echo "Run next step here"
# ./../opt/supervisor-scripts/start-searver.sh &
