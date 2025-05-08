FROM vastai/comfy:v0.3.13-cuda-12.1-pytorch-2.5.1-py311 as MAINFILE

# Maintainer details
LABEL org.opencontainers.image.source="github"
LABEL org.opencontainers.image.description="ComfyUI image suitable for auto completion"
LABEL maintainer="tonkung"


COPY ./ROOT /
# Expose required ports
EXPOSE 1111 8080 8384 8188
# Required or we will not build
ARG COMFYUI_REF
