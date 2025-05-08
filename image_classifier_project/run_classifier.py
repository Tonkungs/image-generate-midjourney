import argparse
from classifier import ImageClassifier  # classifier.py คือไฟล์ที่มี ImageClassifier class
import os

def main():
    parser = argparse.ArgumentParser(description="Image Classifier")
    parser.add_argument('--input', type=str, required=True, help='Path to input image folder')
    parser.add_argument('--output', type=str, required=True, help='Path to output image folder')
    args = parser.parse_args()

    os.makedirs(args.input, exist_ok=True)
    os.makedirs(args.output, exist_ok=True)

    classifier = ImageClassifier(input_folder=args.input, output_folder=args.output)
    classifier.classify_images()

if __name__ == "__main__":
    main()
