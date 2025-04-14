FROM vastai/comfy:v0.3.13-cuda-12.1-pytorch-2.5.1-py311 as MAINFILE

# Maintainer details
LABEL org.opencontainers.image.source="github"
LABEL org.opencontainers.image.description="ComfyUI image suitable for auto completion"
LABEL maintainer="tonkung"


# Define build arguments
ARG OPEN_BUTTON_PORT=1111
ARG OPEN_BUTTON_TOKEN=055924cd931577f8ab440a3a713d68c2
ARG JUPYTER_DIR=/
ARG DATA_DIRECTORY=/workspace/
ARG PORTAL_CONFIG="localhost:1111:11111:/:Instance Portal|localhost:8188:18188:/:ComfyUI|localhost:8080:18080:/:Jupyter|localhost:8080:18080:/terminals/1:Jupyter Terminal|localhost:8384:18384:/:Syncthing"
ARG PROVISIONING_SCRIPT=https://raw.githubusercontent.com/Tonkungs/docker-comfy/refs/heads/main/install-clond.sh
ARG COMFYUI_ARGS="--disable-auto-launch --port 18188 --enable-cors-header"
ARG HF_TOKEN=
ARG MAIN_SERVER="https://laundry-lamb-bell-fusion.trycloudflare.com"

# Expose required ports
EXPOSE 1111 8080 8384 8188

# Set environment variables from build arguments
ENV OPEN_BUTTON_PORT=${OPEN_BUTTON_PORT}
ENV OPEN_BUTTON_TOKEN=${OPEN_BUTTON_TOKEN}
ENV JUPYTER_DIR=${JUPYTER_DIR}
ENV DATA_DIRECTORY=${DATA_DIRECTORY}
ENV PORTAL_CONFIG=${PORTAL_CONFIG}
ENV PROVISIONING_SCRIPT=${PROVISIONING_SCRIPT}
ENV COMFYUI_ARGS=${COMFYUI_ARGS}
ENV HF_TOKEN=${HF_TOKEN}
ENV MAIN_SERVER=${MAIN_SERVER}

COPY ./ROOT /
# COPY ROOT/opt/supervisor-scripts/. /opt/supervisor-scripts 
# RUN chmod +x /opt/supervisor-scripts/comfyui.sh
# COPY start-searver.sh /opt/supervisor-scripts 
# RUN chmod +x /opt/supervisor-scripts/start-server.sh

# COPY ROOT/etc/supervisor/conf.d/. /etc/supervisor/conf.d
# RUN chmod +x /etc/supervisor/conf.d/start-server.conf

# COPY monitor-sigterm.sh /opt/supervisor-scripts 
# RUN chmod +x /opt/supervisor-scripts/monitor-sigterm.sh

# Edit close server
# COPY launch.sh /opt/portal-aio/launch.sh
# RUN chmod +x /opt/portal-aio/launch.sh

# ENTRYPOINT ["./start-searver.sh"]
# sudo docker build -t comfy-vast:v1.0 .
# sudo docker run --stop-timeout=30 --name comfy-vast --gpus all -it --rm -p 1111:1111 -p 8080:8080 -p 8188:8188 -p 8384:8384 comfy-vast:v1.0
# sudo docker exec -it comfy-vast /bin/bash
# sudo docker image ls
# sudo docker rmi fbb6865001e3
# sudo docker rmi comfy-vast:v1.0


# ตรวจว่า start-server.conf ถูกโหลดเข้า supervisord แล้ว:
# supervisorctl status
# ดูว่า script ทำงานจริงไหม ด้วย log:
# tail -f /var/log/portal/start-server.log

# ถ้ายังไม่รัน ให้บังคับ reload:
# supervisorctl reread
# supervisorctl update
# supervisorctl start startserver



