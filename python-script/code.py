import os
import cv2
import mediapipe as mp
import pytesseract
import numpy as np
import shutil

class MultiDetector:
    def __init__(self, min_face_confidence=0.5, min_hand_confidence=0.5, text_confidence_threshold=60):
        """
        Initialize detection models with configurable confidence thresholds
        
        Args:
            min_face_confidence (float): Minimum confidence for face detection
            min_hand_confidence (float): Minimum confidence for hand detection
            text_confidence_threshold (int): Minimum confidence for text detection
        """
        # Face detection setup using MediaPipe
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_face = mp.solutions.face_detection.FaceDetection(
            min_detection_confidence=min_face_confidence
        )

        # Hand detection setup using MediaPipe
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=True,
            max_num_hands=2,
            min_detection_confidence=min_hand_confidence
        )

        # Drawing utility
        self.mp_drawing = mp.solutions.drawing_utils

        # Confidence thresholds
        self.text_confidence_threshold = text_confidence_threshold

    def detect_elements(self, image):
        """
        Detect faces, hands, and text in an image
        
        Args:
            image (numpy.ndarray): Input image
        
        Returns:
            dict: Detected elements with their bounding boxes
        """
        # Convert image to RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        h, w, _ = image.shape

        # Detected elements dictionary
        detected_elements = {
            'faces': [],
            'hands': [],
            'text': []
        }

        # Face detection
        face_results = self.mp_face.process(image_rgb)
        if face_results.detections:
            for detection in face_results.detections:
                bbox = detection.location_data.relative_bounding_box
                x = int(bbox.xmin * w)
                y = int(bbox.ymin * h)
                width = int(bbox.width * w)
                height = int(bbox.height * h)
                detected_elements['faces'].append({
                    'bbox': (x, y, width, height),
                    'confidence': detection.score[0]
                })

        # Hand detection
        hand_results = self.hands.process(image_rgb)
        if hand_results.multi_hand_landmarks:
            for hand_landmarks in hand_results.multi_hand_landmarks:
                # Get bounding box for the entire hand
                x_coords = [lm.x * w for lm in hand_landmarks.landmark]
                y_coords = [lm.y * h for lm in hand_landmarks.landmark]
                x_min, x_max = min(x_coords), max(x_coords)
                y_min, y_max = min(y_coords), max(y_coords)
                
                detected_elements['hands'].append({
                    'bbox': (
                        int(x_min), int(y_min), 
                        int(x_max - x_min), int(y_max - y_min)
                    )
                })

        # Text detection using Tesseract OCR
        text_results = pytesseract.image_to_data(
            image, output_type=pytesseract.Output.DICT
        )
        for i in range(len(text_results['text'])):
            if int(text_results['conf'][i]) > self.text_confidence_threshold:
                x = text_results['left'][i]
                y = text_results['top'][i]
                width = text_results['width'][i]
                height = text_results['height'][i]
                text = text_results['text'][i]
                
                if text.strip():  # Ignore empty strings
                    detected_elements['text'].append({
                        'bbox': (x, y, width, height),
                        'text': text,
                        'confidence': text_results['conf'][i]
                    })

        return detected_elements

    def process_folder(self, input_folder, output_folder):
        """
        Process all images in input folder and save results in output folder
        
        Args:
            input_folder (str): Path to input image folder
            output_folder (str): Path to output image folder
        """
        # Create output folder if it doesn't exist
        os.makedirs(output_folder, exist_ok=True)

        # Supported image extensions
        image_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']

        # Process each file in the input folder
        for filename in os.listdir(input_folder):
            # Check if file is an image
            if os.path.splitext(filename)[1].lower() in image_extensions:
                input_path = os.path.join(input_folder, filename)
                output_path = os.path.join(output_folder, filename)

                # Read the image
                image = cv2.imread(input_path)

                # Detect elements
                detections = self.detect_elements(image)

                # Check if any elements are detected
                has_detections = (
                    detections['faces'] or 
                    detections['hands'] or 
                    detections['text']
                )

                if has_detections:
                    # Draw bounding boxes for faces (blue)
                    for face in detections['faces']:
                        x, y, w, h = face['bbox']
                        cv2.rectangle(image, (x, y), (x+w, y+h), (255, 0, 0), 2)
                    
                    # Draw bounding boxes for hands (green)
                    for hand in detections['hands']:
                        x, y, w, h = hand['bbox']
                        cv2.rectangle(image, (x, y), (x+w, y+h), (0, 255, 0), 2)
                    
                    # Draw bounding boxes for text (red)
                    for text_item in detections['text']:
                        x, y, w, h = text_item['bbox']
                        cv2.rectangle(image, (x, y), (x+w, y+h), (0, 0, 255), 2)
                    
                    # Save the output image with detections
                    cv2.imwrite(output_path, image)
                    print(f"Processed and saved: {filename}")
                else:
                    # Copy the original image if no detections
                    shutil.copy2(input_path, output_path)
                    print(f"No detections, copied: {filename}")

# Example usage
if __name__ == "__main__":
    # Initialize detector with custom confidence thresholds
    detector = MultiDetector(
        min_face_confidence=0.5,
        min_hand_confidence=0.5,
        text_confidence_threshold=60
    )

    # Process images from input folder to output folder
    input_folder = 'python-script/image-mas'
    output_folder = 'python-script/image-output'
    detector.process_folder(input_folder, output_folder)