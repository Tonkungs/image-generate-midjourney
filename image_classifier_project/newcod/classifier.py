import os
import shutil
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from paddleocr import PaddleOCR
import torch
from tqdm import tqdm
import warnings
import logging
import argparse

warnings.filterwarnings("ignore", category=FutureWarning)
logging.getLogger("ppocr").setLevel(logging.WARNING)


class ImageClassifier:
    def __init__(self, input_folder, output_folder, limit_per_folder=1500, draw_boxes=False):
        self.input_folder = input_folder
        self.output_folder = output_folder
        self.limit = limit_per_folder
        self.draw_boxes = draw_boxes
        os.makedirs(output_folder, exist_ok=True)

        # โหลด YOLOv5s model
        self.model = torch.hub.load('ultralytics/yolov5', 'yolov5s', trust_repo=True)
        self.model.eval()
        self.class_names = self.model.names

        # COCO: index ของสัตว์
        self.animal_labels = {15, 16, 17, 18, 19, 20, 21, 22, 23}

        # PaddleOCR
        self.ocr = PaddleOCR(use_angle_cls=True, lang='en')

    def is_blurry(self, image_path, threshold=50):
        image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if image is None:
            return True
        lap_var = cv2.Laplacian(image, cv2.CV_64F).var()
        return lap_var < threshold

    def detect_text(self, image_path):
        try:
            image = Image.open(image_path).convert("RGB")
            image_np = np.array(image)
            result = self.ocr.ocr(image_np, cls=True)

            if not result or not result[0]:
                return False, image

            if self.draw_boxes:
                draw = ImageDraw.Draw(image)
                try:
                    font = ImageFont.truetype("arial.ttf", 16)
                except:
                    font = ImageFont.load_default()

            found_texts = []
            for line in result[0]:
                box, (text, conf) = line
                if conf > 0.5:
                    found_texts.append(text)
                    if self.draw_boxes:
                        x1, y1 = map(int, box[0])
                        draw.text((x1, y1), text, fill="green", font=font)

            return bool(found_texts), image

        except Exception as e:
            print(f"OCR error on {image_path}: {e}")
            return False, Image.open(image_path)

    def detect_person_or_animal(self, image_path):
        image = Image.open(image_path).convert("RGB")
        results = self.model(image)
        person_found = False
        animal_found = False

        if self.draw_boxes:
            draw = ImageDraw.Draw(image)
            try:
                font = ImageFont.truetype("arial.ttf", 16)
            except:
                font = ImageFont.load_default()

        for *box, conf, cls in results.xyxy[0]:
            label_idx = int(cls.item())
            label_name = self.class_names[label_idx]
            confidence = float(conf.item())

            if label_idx == 0:
                person_found = True
            elif label_idx in self.animal_labels:
                animal_found = True

            if self.draw_boxes:
                x1, y1, x2, y2 = map(int, box)
                color = "red" if label_idx == 0 else "blue"
                draw.rectangle([x1, y1, x2, y2], outline=color, width=2)
                draw.text((x1 + 2, y1 + 2), f"{label_name} {confidence:.2f}", fill=color, font=font)

        return person_found, animal_found, image

    def get_or_create_folder(self, base_name):
        i = 1
        while True:
            folder_name = f"{base_name}_{i}"
            full_path = os.path.join(self.output_folder, folder_name)
            if not os.path.exists(full_path):
                os.makedirs(full_path)
                return full_path
            if len(os.listdir(full_path)) < self.limit:
                return full_path
            i += 1

    def copy_to_folder(self, image_path, category, image):
        folder_path = self.get_or_create_folder(category)
        filename = os.path.basename(image_path)
        save_path = os.path.join(folder_path, filename)
        image.save(save_path)

    def classify_images(self):
        image_files = [f for f in os.listdir(self.input_folder)
                       if f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp'))]

        for filename in tqdm(image_files, desc="Classifying images"):
            image_path = os.path.join(self.input_folder, filename)
            try:
                if self.is_blurry(image_path):
                    self.copy_to_folder(image_path, "blur", Image.open(image_path))
                    continue

                has_text, text_image = self.detect_text(image_path)
                if has_text:
                    self.copy_to_folder(image_path, "text", text_image)
                    continue

                has_person, has_animal, obj_image = self.detect_person_or_animal(image_path)
                if has_person:
                    self.copy_to_folder(image_path, "people", obj_image)
                elif has_animal:
                    self.copy_to_folder(image_path, "animal", obj_image)
                else:
                    self.copy_to_folder(image_path, "other", obj_image)
            except Exception as e:
                print(f"Error processing {filename}: {e}")


# def main():
#     parser = argparse.ArgumentParser(description="Classify and sort images using OCR and YOLOv5.")
#     parser.add_argument('--input', required=True, help="Path to input image folder")


# # Example usage:
# input_folder = './input'
# output_folder = './output'

# os.makedirs(input_folder, exist_ok=True)
# os.makedirs(output_folder, exist_ok=True)

# classifier = ImageClassifier(input_folder=input_folder, output_folder=output_folder)
# classifier.classify_images()