#!/bin/bash

# ติดตั้ง cloudflared
echo "Installing cloudflared..."
wget -P ~ https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i ~/cloudflared-linux-amd64.deb

# # กำหนด WORKSPACE
# WORKSPACE=$(pwd)/ComfyUI
# COMFYUI_DIR=${WORKSPACE}
# # รัน ComfyUI
# echo "Starting ComfyUI..."
# /usr/bin/python3 ${COMFYUI_DIR}/main.py --dont-print-server &

# ฟังก์ชันเช็คการรัน ComfyUI และเปิด cloudflared
echo "Waiting for ComfyUI to start..."
# เช็คการเชื่อมต่อพอร์ต 8188 โดยใช้ curl
while ! curl --silent --head http://127.0.0.1:18188; do
  sleep 0.5
done

echo "\nComfyUI finished loading, trying to launch cloudflared (if it gets stuck here cloudflared is having issues)\n"
cloudflared tunnel --url http://127.0.0.1:18188 &


#  aidockorg/linux-desktop-cuda:latest  docker base