#!/bin/bash
python3 -m venv /venv/main
source /venv/main/bin/activate

# กำหนด WORKSPACE
# WORKSPACE=$(pwd)/ComfyUI
# COMFYUI_DIR=${WORKSPACE}
# AUTO_UPDATE="${AUTO_UPDATE:-true}"
# MAIN_SERVER="https://jumping-true-newly-malpractice.trycloudflare.com"
CLOUDFLARE_URL=""
CLOUDFLARE_DOWNLOAD_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb"
PUBLIC_IP=""
COMFYUI_URL="http://127.0.0.1:18188"
# JSON_URL="https://raw.githubusercontent.com/Tonkungs/docker-comfy/refs/heads/main/flux_dev_promt.json"
JSON_FILE="flux_payload.json"
PROMPT_ID=""
LOG_FILE="/var/log/portal/comfyui.log"
READY_MESSAGE="All startup tasks have been completed."
shutdown_triggered=false


function provisioning_start() {
    provisioning_check_comfyui_running
    provisioning_url_clound_flare
    provisioning_get_public_ip
    provisioning_save_server

    # provisioning_run_comfyui
    provisioning_ready_activate
    provisioning_check_destroy
}

function provisioning_url_clound_flare() {
    # ติดตั้ง cloudflared
    echo "Downloading cloudflared if not already downloaded..."
    wget -nc -P ~ $CLOUDFLARE_DOWNLOAD_URL

    echo "Installing cloudflared..."
    dpkg -i ~/cloudflared-linux-amd64.deb

    # ฟังก์ชันเช็คการรัน ComfyUI และเปิด cloudflared
    echo "Waiting for ComfyUI to start..."
    while ! curl --silent --head $COMFYUI_URL; do
    echo "Waiting for ComfyUI to start... "
    sleep 0.5
    done

    generate_cloudflare_url
}

function generate_cloudflare_url() {
    # Kill any existing cloudflared process
    pkill cloudflared
    # ฟังก์ชันนี้จะสร้าง URL ของ Cloudflare
    echo -e "\nComfyUI finished loading, trying to launch cloudflared...\n"

    # รัน cloudflared แบบ background (&)
    cloudflared tunnel --url $COMFYUI_URL > cloudflared.log 2>&1 &

    # แจ้งให้ผู้ใช้รู้ว่ากำลังรอ URL
    echo "Waiting for Cloudflared to generate URL..."

    # รอให้ cloudflared สร้าง URL
    while true; do
    CLOUDFLARE_URL=$(grep -o 'https://.*\.trycloudflare\.com' cloudflared.log | head -n 1)
    if [[ -n "$CLOUDFLARE_URL" ]]; then
        # export CLOUDFLARE_URL  # เพิ่มบรรทัดนี้
        break
    fi
    sleep 0.5
    done

    # แสดง URL ทันที
    echo "✅ Cloudflared generated URL: $CLOUDFLARE_URL"
}

function provisioning_get_public_ip() {
    # ดึง public IP
    PUBLIC_IP=$(curl -s --max-time 5 ifconfig.me)
    if [ -z "$PUBLIC_IP" ]; then
        PUBLIC_IP=$(curl -s --max-time 5 https://ipinfo.io/ip)
    fi

    if [ -z "$PUBLIC_IP" ]; then
        echo "❌ ไม่สามารถดึง Public IP ได้"
    else
        export PUBLIC_IP
        echo "✅ Public IP: $PUBLIC_IP"
    fi
}

function provisioning_save_server(){
    echo "Sending URL to ${MAIN_SERVER}/server-available"
    MAX_RETRIES=5
    ATTEMPT=1
    SUCCESS=false
    if [ -z "$MAIN_SERVER" ]; then
        echo "❌ MAIN_SERVER is not set, exiting..."
        exit 0
    fi

    while [ $ATTEMPT -le $MAX_RETRIES ]; do
    echo "Attempt $ATTEMPT of $MAX_RETRIES..."
    
    RESPONSE=$(curl -X POST "${MAIN_SERVER}/server-available" \
        -H "Content-Type: application/json" \
        -d "{\"server_url\":\"$CLOUDFLARE_URL\",\"server_ip\":\"$PUBLIC_IP\"}")

    if [[ "$RESPONSE" == *"duplicate key value violates unique constraint"* ]]; then
        echo "Duplicate URL detected, regenerating cloudflare URL..."
        generate_cloudflare_url
        continue
    fi

    if [ $? -eq 0 ]; then
        echo "Response: $RESPONSE"
        echo "✅ URL sent successfully!"
        SUCCESS=true
        break
    else
        echo "❌ Failed to send URL. Retrying in 2 seconds..."
        sleep 2
    fi

    ATTEMPT=$((ATTEMPT + 1))
    done

    if [ "$SUCCESS" = false ]; then
    echo "❌ ERROR: Could not send URL after $MAX_RETRIES attempts."
    fi
}

function provisioning_ready_activate() {
    echo "Sending URL to ${MAIN_SERVER}/server-available/${PUBLIC_IP}/activate"
    MAX_RETRIES=5
    ATTEMPT=1
    SUCCESS=false

    while [ $ATTEMPT -le $MAX_RETRIES ]; do
    echo "Attempt $ATTEMPT of $MAX_RETRIES..."
    
    curl -X POST "${MAIN_SERVER}/server-available/${PUBLIC_IP}/activate" \
        -H "Content-Type: application/json" \
        -d "{\"server_url\":\"$CLOUDFLARE_URL\",\"server_ip\":\"$PUBLIC_IP\"}"

    if [ $? -eq 0 ]; then
        echo "✅ URL sent successfully!"
        SUCCESS=true
        break
    else
        echo "❌ Failed to send URL. Retrying in 2 seconds..."
        sleep 2
    fi

    ATTEMPT=$((ATTEMPT + 1))
    done

    if [ "$SUCCESS" = false ]; then
    echo "❌ ERROR: Could not send URL after $MAX_RETRIES attempts."
    fi
}

function provisioning_run_comfyui(){

    if [ -z "$JSON_URL" ]; then
        echo "❌ JSON_URL is not set, exiting..."
        exit 0
    fi
    echo "📥 Downloading JSON payload..."
    curl -s -o "$JSON_FILE" "$JSON_URL"

    if [ ! -s "$JSON_FILE" ]; then
    echo "❌ Failed to download JSON payload or file is empty."
    exit 1
    fi

    # ส่ง JSON ไปยัง ComfyUI (localhost:18188) ด้วย POST
    echo "🚀 Sending request to ComfyUI at $COMFYUI_URL/prompt..."

    # ใช้ curl พร้อม --max-time 420 (7 นาที) และ --retry 0 เพื่อรอผลลัพธ์นาน ๆ
    HTTP_CODE=$(curl -s -w "%{http_code}" -X POST $COMFYUI_URL/prompt \
    -H "Content-Type: application/json" \
    --data-binary "@$JSON_FILE" \
    --max-time 420 \
    -o response.tmp)

    # Check if HTTP status code is 2xx
    if [[ $HTTP_CODE =~ ^2[0-9]{2}$ ]]; then
        echo "✅ ComfyUI responded successfully with status code $HTTP_CODE"
        PROMPT_ID=$(jq -r '.prompt_id' response.tmp)
        echo "Prompt ID: $PROMPT_ID"
        cat response.tmp
    else
        echo "❌ ComfyUI request failed with status code $HTTP_CODE"
        cat response.tmp
    fi
    rm -f response.tmp

     # Wait for the completion status
    echo "Waiting for ComfyUI processing completion..."
    echo "$COMFYUI_URL/history/$PROMPT_ID"
    while true; do
    
        response=$(curl -s "$COMFYUI_URL/history/$PROMPT_ID")
        echo "Response: $response"
        # ตรวจสอบว่า response ว่างไหม
        if [ -z "$response" ]; then
            echo "❌ No response from ComfyUI — check if it's running."
            break
        fi

        # ดึงค่า completed จาก response
        completed=$(echo "$response" | jq -r --arg id "$PROMPT_ID" '.[$id].status.completed')

        if [ "$completed" == "true" ]; then
            echo "✅ Processing completed successfully"
            break
        else
            echo "⏳ Still processing... waiting 10 seconds"
            sleep 10
        fi
    done
}

function provisioning_check_comfyui_running() {
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

    echo "Run next step here"
}

function provisioning_shutdown() {
    echo "⚠️  ได้รับสัญญาณปิดระบบ กำลังส่งข้อมูล..."

    if [ -z "$CLOUDFLARE_URL" ]; then
        CLOUDFLARE_URL=$(grep -o 'https://.*\.trycloudflare\.com' cloudflared.log | head -n 1)
    fi

    if [ -z "$CLOUDFLARE_URL" ]; then
        echo "❌ ไม่พบ CLOUDFLARE_URL"
        CLOUDFLARE_URL="UNKNOWN"
    fi
    echo "Sending data to ${MAIN_SERVER}/server-available/${PUBLIC_IP}/destroy"
    echo "Public IP: $PUBLIC_IP"
    echo "Cloudflare URL: $CLOUDFLARE_URL"

    curl -X POST "${MAIN_SERVER}/server-available/${PUBLIC_IP}/destroy" \
         -H "Content-Type: application/json" \
         -d "{\"server_url\":\"$CLOUDFLARE_URL\",\"server_ip\":\"$PUBLIC_IP\"}"

    echo "✅ ข้อมูลถูกส่งแล้ว"
    exit 0
}

function provisioning_check_destroy() {
    echo "🟢 รอ SIGTERM..."

    while true; do
        if [ "$shutdown_triggered" = true ]; then
            provisioning_shutdown
        fi
        sleep 1
    done
}


trap 'shutdown_triggered=true' SIGTERM SIGINT

provisioning_start



