FROM image-classifier

RUN pip install seaborn
    
# คัดลอกโปรเจกต์เข้า container
WORKDIR /app
COPY . /app

# รัน script หลัก
ENTRYPOINT ["python", "run_classifier.py"]

# sudo chown -R $(whoami):$(whoami) ./output
# docker build top.dockerfile -t image-classifier-top .
# docker build -f top.dockerfile -t image-classifier-top .
# docker run --gpus all --rm -v /home/tonkung/work/upscayl/auto-bot-midjourney-discord/comfy-gen/comfy10:/input -v ./output:/output image-classifier-top --input /input --output /output