#!/bin/bash
MAIN_SERVER=$1
PUBLIC_IP=$2
CLOUDFLARE_URL=$3

echo "Main Server: $MAIN_SERVER"
echo "Public IP: $PUBLIC_IP"
echo "Cloudflare URL: $CLOUDFLARE_URL"
# ดักสัญญาณ SIGTERM
trap 'echo "กำลังปิดข้อมูล..."; exit 0' SIGTERM

echo "Script เริ่มทำงานแล้ว รอ SIGTERM เพื่อปิด..."

# # จำลองการทำงานยาวๆ เช่น wait/loop
# while true; do
#     sleep 1
# done
echo "Sending URL to ${MAIN_SERVER}/server/${PUBLIC_IP}/stop"
MAX_RETRIES=5
ATTEMPT=1
SUCCESS=false

while [ $ATTEMPT -le $MAX_RETRIES ]; do
    echo "Attempt $ATTEMPT of $MAX_RETRIES..."
    
    curl -X POST "${MAIN_SERVER}/server/${PUBLIC_IP}/stop" \
        -H "Content-Type: application/json" \
        -d "{\"server_url\":\"$CLOUDFLARE_URL\",\"server_ip\":\"$PUBLIC_IP\"}"

    if [ $? -eq 0 ]; then
        echo "✅ Close server sent successfully!"
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
echo "จบการทำงาน..."