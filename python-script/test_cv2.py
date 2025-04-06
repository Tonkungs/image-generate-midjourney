# test_cv2.py
import sys
import os

print("Python executable:", sys.executable)
print("Python version:", sys.version)
print("Python path:", sys.path)

# Attempt to import OpenCV
try:
    import cv2
    print("\nOpenCV successfully imported!")
    print("OpenCV version:", cv2.__version__)
    print("OpenCV path:", cv2.__file__)
except Exception as e:
    print("\nImport Error:", e)
    
    # Additional diagnostics
    try:
        import importlib.util
        spec = importlib.util.find_spec('cv2')
        print("\nOpenCV spec:", spec)
    except Exception as spec_error:
        print("Could not find OpenCV spec:", spec_error)