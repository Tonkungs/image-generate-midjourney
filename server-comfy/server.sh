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

# ส่งไปยัง API
# echo "Sending URL to https://asdasd.com/api..."
# curl -X POST "https://asdasd.com/api" \
#   -H "Content-Type: application/json" \
#   -d "{\"url\":\"$CLOUDFLARE_URL\"}"

# echo "URL sent successfully!"