#!/bin/bash
python3 -m venv /venv/main
source /venv/main/bin/activate

# กำหนด WORKSPACE
WORKSPACE=$(pwd)/ComfyUI
COMFYUI_DIR=${WORKSPACE}
AUTO_UPDATE="${AUTO_UPDATE:-true}"
MAIN_SERVER="https://gary-indonesia-kurt-coming.trycloudflare.com"
CLOUDFLARE_URL=""
CLOUDFLARE_DOWNLOAD_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb"
PUBLIC_IP=""
# COMFYUI_URL="http://127.0.0.1:18188"
COMFYUI_URL="https://cancel-textiles-proof-programs.trycloudflare.com"
JSON_URL="https://raw.githubusercontent.com/Tonkungs/docker-comfy/refs/heads/main/flux_dev_promt.json"
JSON_FILE="flux_payload.json"
PROMPT_ID=""
# Packages are installed after nodes so we can fix them...

APT_PACKAGES=(
    #"package-1"
    #"package-2"
)

PIP_PACKAGES=(
    #"package-1"
    #"package-2"
)

NODES=(
    # "https://github.com/ltdrdata/ComfyUI-Manager"
    #"https://github.com/cubiq/ComfyUI_essentials"
)

WORKFLOWS=(
    "https://raw.githubusercontent.com/Tonkungs/docker-comfy/refs/heads/main/flux_dev_example.json"
)

CLIP_MODELS=(
    "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/clip_l.safetensors"
    "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp16.safetensors"
)

UNET_MODELS=(
)

VAE_MODELS=(
)

### DO NOT EDIT BELOW HERE UNLESS YOU KNOW WHAT YOU ARE DOING ###

function provisioning_start() {
    provisioning_print_header
    # provisioning_get_apt_packages
    # provisioning_get_nodes
    # provisioning_get_pip_packages
    # provisioning_get_comfyui
    # workflows_dir="${COMFYUI_DIR}/user/default/workflows"
    # mkdir -p "${workflows_dir}"
    # provisioning_get_files \
    #     "${workflows_dir}" \
    #     "${WORKFLOWS[@]}"
    # # Get licensed models if HF_TOKEN set & valid
    # if provisioning_has_valid_hf_token; then
    #     UNET_MODELS+=("https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/flux1-dev.safetensors")
    #     VAE_MODELS+=("https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/ae.safetensors")
    # else
    #     UNET_MODELS+=("https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors")
    #     VAE_MODELS+=("https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/ae.safetensors")
    #     sed -i 's/flux1-dev\.safetensors/flux1-schnell.safetensors/g' "${workflows_dir}/flux_dev_example.json"
    # fi
    # provisioning_get_files \
    #     "${COMFYUI_DIR}/models/unet" \
    #     "${UNET_MODELS[@]}"
    # provisioning_get_files \
    #     "${COMFYUI_DIR}/models/vae" \
    #     "${VAE_MODELS[@]}"
    # provisioning_get_files \
    #     "${COMFYUI_DIR}/models/clip" \
    #     "${CLIP_MODELS[@]}"
    # provisioning_print_end

    
    provisioning_url_clound_flare
    provisioning_get_public_ip
    provisioning_save_server

    provisioning_run_comfyui
    provisioning_ready_activate
}

function provisioning_get_apt_packages() {
    if [[ -n $APT_PACKAGES ]]; then
            sudo $APT_INSTALL ${APT_PACKAGES[@]}
    fi
}

function provisioning_get_pip_packages() {
    if [[ -n $PIP_PACKAGES ]]; then
            pip install --no-cache-dir ${PIP_PACKAGES[@]}
    fi
}

function provisioning_get_nodes() {
    for repo in "${NODES[@]}"; do
        dir="${repo##*/}"
        path="${COMFYUI_DIR}custom_nodes/${dir}"
        requirements="${path}/requirements.txt"
        if [[ -d $path ]]; then
            if [[ ${AUTO_UPDATE,,} != "false" ]]; then
                printf "Updating node: %s...\n" "${repo}"
                ( cd "$path" && git pull )
                if [[ -e $requirements ]]; then
                   pip install --no-cache-dir -r "$requirements"
                fi
            fi
        else
            printf "Downloading node: %s...\n" "${repo}"
            git clone "${repo}" "${path}" --recursive
            if [[ -e $requirements ]]; then
                pip install --no-cache-dir -r "${requirements}"
            fi
        fi
    done
}

function provisioning_get_files() {
    if [[ -z $2 ]]; then return 1; fi
    
    dir="$1"
    mkdir -p "$dir"
    shift
    arr=("$@")
    printf "Downloading %s model(s) to %s...\n" "${#arr[@]}" "$dir"
    for url in "${arr[@]}"; do
        printf "Downloading: %s\n" "${url}"
        provisioning_download "${url}" "${dir}"
        printf "\n"
    done
}

function provisioning_print_header() {
    printf "\n##############################################\n#                                            #\n#          Provisioning container            #\n#                                            #\n#         This will take some time           #\n#                                            #\n# Your container will be ready on completion #\n#                                            #\n##############################################\n\n"
}

function provisioning_print_end() {
    printf "\nProvisioning complete:  Application will start now\n\n"
}

function provisioning_has_valid_hf_token() {
    [[ -n "$HF_TOKEN" ]] || return 1
    url="https://huggingface.co/api/whoami-v2"

    response=$(curl -o /dev/null -s -w "%{http_code}" -X GET "$url" \
        -H "Authorization: Bearer $HF_TOKEN" \
        -H "Content-Type: application/json")

    # Check if the token is valid
    if [ "$response" -eq 200 ]; then
        return 0
    else
        return 1
    fi
}

function provisioning_has_valid_civitai_token() {
    [[ -n "$CIVITAI_TOKEN" ]] || return 1
    url="https://civitai.com/api/v1/models?hidden=1&limit=1"

    response=$(curl -o /dev/null -s -w "%{http_code}" -X GET "$url" \
        -H "Authorization: Bearer $CIVITAI_TOKEN" \
        -H "Content-Type: application/json")

    # Check if the token is valid
    if [ "$response" -eq 200 ]; then
        return 0
    else
        return 1
    fi
}

# Download from $1 URL to $2 file path
function provisioning_download() {
    if [[ -n $HF_TOKEN && $1 =~ ^https://([a-zA-Z0-9_-]+\.)?huggingface\.co(/|$|\?) ]]; then
        auth_token="$HF_TOKEN"
    elif 
        [[ -n $CIVITAI_TOKEN && $1 =~ ^https://([a-zA-Z0-9_-]+\.)?civitai\.com(/|$|\?) ]]; then
        auth_token="$CIVITAI_TOKEN"
    fi
    if [[ -n $auth_token ]];then
        wget --header="Authorization: Bearer $auth_token" -qnc --content-disposition --show-progress -e dotbytes="${3:-4M}" -P "$2" "$1"
    else
        wget -qnc --content-disposition --show-progress -e dotbytes="${3:-4M}" -P "$2" "$1"
    fi
}

function provisioning_get_comfyui() {
    if [[ -d $COMFYUI_DIR ]]; then
        printf "Updating ComfyUI...\n"
        ( cd "$COMFYUI_DIR" && git pull )
    else
        echo "-= Initial setup ComfyUI =-"
        git clone https://github.com/comfyanonymous/ComfyUI.git "$COMFYUI_DIR"
        # ติดตั้ง dependencies เพิ่มเติม
        echo "Current working directory: $(pwd)"
        cd $COMFYUI_DIR
        echo "Current working directory: $(pwd)"
        echo $pwd
        echo "-= Install Dependencies ComfyUI =-"

        pip3 install accelerate
        pip3 install einops transformers>=4.28.1 safetensors>=0.4.2 aiohttp pyyaml Pillow scipy tqdm psutil tokenizers>=0.13.3
        pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
        pip3 install torchsde
        pip3 install kornia>=0.7.1 spandrel soundfile sentencepiece
        # python3 -m venv /venv/main
        # source /venv/main/bin/activate
        # /usr/bin/python3 -m pip install --upgrade pip
        /usr/bin/python3 -m pip install -r requirements.txt
        # /venv/main/bin/python -m pip install -r requirements.txt
    fi
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

    echo -e "\nComfyUI finished loading, trying to launch cloudflared...\n"

    # รัน cloudflared แบบ background (&)
    cloudflared tunnel --url $COMFYUI_URL > cloudflared.log 2>&1 &

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
    echo "Sending URL to ${MAIN_SERVER}/server"
    MAX_RETRIES=5
    ATTEMPT=1
    SUCCESS=false

    while [ $ATTEMPT -le $MAX_RETRIES ]; do
    echo "Attempt $ATTEMPT of $MAX_RETRIES..."
    
    curl -X POST "${MAIN_SERVER}/server" \
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

function provisioning_ready_activate() {
    echo "Sending URL to ${MAIN_SERVER}/server/${PUBLIC_IP}/activate"
    MAX_RETRIES=5
    ATTEMPT=1
    SUCCESS=false

    while [ $ATTEMPT -le $MAX_RETRIES ]; do
    echo "Attempt $ATTEMPT of $MAX_RETRIES..."
    
    curl -X POST "${MAIN_SERVER}/server/${PUBLIC_IP}/activate" \
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
    # ดาวน์โหลด JSON ไฟล์จาก Gist


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

# Allow user to disable provisioning if they started with a script they didn't want
if [[ ! -f /.noprovisioning ]]; then
    provisioning_start
fi
