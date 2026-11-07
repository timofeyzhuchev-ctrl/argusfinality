"""Read a bounded image from stdin, emit an SFace descriptor or a rejection."""
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / '.argus-face-models'
sys.path.insert(0, str(ROOT / '.argus-face-deps'))
os.environ.update({
    'OMP_NUM_THREADS': '1',
    'OPENBLAS_NUM_THREADS': '1',
    'OPENCV_IO_MAX_IMAGE_PIXELS': '12000000',
})
import cv2
import numpy as np

MAX_IMAGE_BYTES = 12 * 1024 * 1024
MAX_SIDE = 640


def detector():
    return cv2.FaceDetectorYN.create(
        str(MODELS / 'face_detection_yunet_2023mar.onnx'), '', (320, 320),
        0.9, 0.3, 256, cv2.dnn.DNN_BACKEND_OPENCV, cv2.dnn.DNN_TARGET_CPU,
    )


def recognizer():
    return cv2.FaceRecognizerSF.create(
        str(MODELS / 'face_recognition_sface_2021dec.onnx'), '',
        cv2.dnn.DNN_BACKEND_OPENCV, cv2.dnn.DNN_TARGET_CPU,
    )


def describe(model, aligned):
    feature = model.feature(aligned).astype(np.float64).reshape(-1)
    norm = np.linalg.norm(feature)
    if feature.size != 128 or not np.isfinite(norm) or norm <= 1e-6:
        raise RuntimeError('Invalid SFace feature tensor')
    return (feature / norm).tolist()


def extract(data):
    try:
        image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    except cv2.error:
        return {'status': 'invalid_image'}
    if image is None:
        return {'status': 'invalid_image'}

    height, width = image.shape[:2]
    scale = min(1, MAX_SIDE / max(width, height))
    if scale < 1:
        width, height = max(1, round(width * scale)), max(1, round(height * scale))
        image = cv2.resize(image, (width, height), interpolation=cv2.INTER_AREA)
    if min(width, height) < 64:
        return {'status': 'poor_quality'}

    face_detector = detector()
    face_detector.setInputSize((width, height))
    _, faces = face_detector.detect(image)
    if faces is None or len(faces) == 0:
        return {'status': 'no_face'}
    if len(faces) != 1:
        return {'status': 'multiple_faces'}

    face = faces[0]
    x, y, w, h = face[:4]
    if not np.isfinite(face).all() or min(w, h) < 64:
        return {'status': 'poor_quality'}
    visible_width = min(width, x + w) - max(0, x)
    visible_height = min(height, y + h) - max(0, y)
    if min(visible_width / w, visible_height / h) < 0.85:
        return {'status': 'poor_quality'}
    landmarks = face[4:14].reshape(5, 2)
    if np.any(landmarks < 0) or np.any(landmarks >= [width, height]):
        return {'status': 'poor_quality'}
    if np.linalg.norm(landmarks[0] - landmarks[1]) < 20:
        return {'status': 'poor_quality'}

    model = recognizer()
    aligned = model.alignCrop(image, face)
    return {'status': 'ok', 'embedding': describe(model, aligned)}


def main():
    cv2.setNumThreads(1)
    if sys.argv[1:] == ['--check']:
        detector().detect(np.zeros((320, 320, 3), dtype=np.uint8))
        describe(recognizer(), np.full((112, 112, 3), 128, dtype=np.uint8))
        print('YuNet and SFace loaded and executed on CPU')
        return
    data = sys.stdin.buffer.read(MAX_IMAGE_BYTES + 1)
    result = extract(data) if data and len(data) <= MAX_IMAGE_BYTES else {'status': 'invalid_image'}
    print(json.dumps(result, allow_nan=False, separators=(',', ':')))


if __name__ == '__main__':
    main()
