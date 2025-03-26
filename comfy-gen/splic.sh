#!/bin/bash

# ตั้งค่าโฟลเดอร์ที่มีภาพอยู่
IMAGE_FOLDER="./comfy07"
TARGET_FOLDER="./output_comfy07"
IMAGES_PER_FOLDER=2500

# สร้างโฟลเดอร์ปลายทางถ้ายังไม่มี
mkdir -p "$TARGET_FOLDER"

# อ่านไฟล์รูปภาพทั้งหมด เรียงตามลำดับ แล้วนับจำนวน
mapfile -t images < <(find "$IMAGE_FOLDER" -type f \( -iname "*.jpg" -o -iname "*.png" -o -iname "*.jpeg" \) | sort)
TOTAL_IMAGES=${#images[@]}

# คำนวณจำนวนโฟลเดอร์ย่อยที่ต้องสร้าง
NUM_FOLDERS=$(( (TOTAL_IMAGES + IMAGES_PER_FOLDER - 1) / IMAGES_PER_FOLDER ))

echo "พบทั้งหมด $TOTAL_IMAGES ภาพ ต้องสร้าง $NUM_FOLDERS โฟลเดอร์"

# แบ่งไฟล์ไปยังโฟลเดอร์ย่อย
folder_index=1
image_index=0
for image in "${images[@]}"; do
    subfolder="$TARGET_FOLDER/folder_$(printf "%03d" $folder_index)"
    mkdir -p "$subfolder"
    mv "$image" "$subfolder/"
    ((image_index++))

    # เมื่อถึงจำนวนที่กำหนด เปลี่ยนไปโฟลเดอร์ใหม่
    if (( image_index % IMAGES_PER_FOLDER == 0 )); then
        ((folder_index++))
    fi

done

echo "จัดเรียงภาพเสร็จสิ้น!"
