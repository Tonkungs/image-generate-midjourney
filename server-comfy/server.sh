#!/bin/bash

# ติดตั้ง cloudflared
echo "Downloading cloudflared if not already downloaded..."
wget -nc -P ~ https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

echo "Installing cloudflared..."
dpkg -i ~/cloudflared-linux-amd64.deb

# ฟังก์ชันเช็คการรัน ComfyUI และเปิด cloudflared
echo "Waiting for ComfyUI to start..."
while ! curl --silent --head http://127.0.0.1:3000; do
  echo "Waiting for ComfyUI to start... "
  sleep 0.5
done

echo -e "\nComfyUI finished loading, trying to launch cloudflared...\n"

# รัน cloudflared แบบ background (&)
cloudflared tunnel --url http://127.0.0.1:3000 > cloudflared.log 2>&1 &

# แจ้งให้ผู้ใช้รู้ว่ากำลังรอ URL
echo "Waiting for Cloudflared to generate URL..."

# รอให้ cloudflared สร้าง URL
while true; do
  CLOUDFLARE_URL=$(grep -o 'https://.*\.trycloudflare\.com' cloudflared.log | head -n 1)
  if [[ -n "$CLOUDFLARE_URL" ]]; then
    break
  fi
  sleep 0.5
done

# แสดง URL ทันที
echo "Cloudflared generated URL: $CLOUDFLARE_URL"
# Test if the Cloudflare URL is accessible
echo "Testing Cloudflare URL connectivity..."
echo "Waiting 5 seconds for the tunnel to be ready..."
sleep 5
RESPONSE=$(curl -s -w "%{http_code}" "$CLOUDFLARE_URL")
HTTP_CODE=${RESPONSE: -3}
BODY=${RESPONSE%???}

if [ "$HTTP_CODE" = "200" ] && [[ "$BODY" == *"Hello, world!"* ]]; then
  echo "✅ Cloudflare URL is accessible and contains expected content"
else
  echo "❌ Cloudflare URL is not accessible or returns unexpected content"
  exit 1
fi

echo "Sending data to http://localhost:3000/config/cloudflared"

curl -X PUT "http://localhost:3000/config/cloudflared" \
         -H "Content-Type: application/json" \
         -d "{\"cloudflared_url\":\"$CLOUDFLARE_URL\"}"

echo "✅ ข้อมูลถูกส่งแล้ว"
