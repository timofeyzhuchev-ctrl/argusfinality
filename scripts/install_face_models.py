"""Fetch pinned OpenCV Zoo weights during the build, never during inference."""
from hashlib import sha256
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
MODELS_DIR = ROOT / '.argus-face-models'
COMMIT = '48b10fa505aeb51fbd127fc60a5c660040e823b7'
ZOO = 'https://media.githubusercontent.com/media/opencv/opencv_zoo/' + COMMIT + '/models/'
ZOO_RAW = 'https://raw.githubusercontent.com/opencv/opencv_zoo/' + COMMIT + '/models/'
MODELS = (
    ('face_detection_yunet', 'face_detection_yunet_2023mar.onnx', 232589,
     '8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4'),
    ('face_recognition_sface', 'face_recognition_sface_2021dec.onnx', 38696353,
     '0ba9fbfa01b5270c96627c4ef784da859931e02f04419c829e83484087c34e79'),
)


def checksum(path):
    with path.open('rb') as existing:
        digest = sha256()
        for chunk in iter(lambda: existing.read(64 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def fetch_verified(url, destination, max_bytes, expected_digest=None):
    temp = None
    try:
        with NamedTemporaryFile(dir=MODELS_DIR, delete=False) as target:
            temp = Path(target.name)
            digest = sha256()
            count = 0
            with urlopen(url, timeout=20) as response:
                for chunk in iter(lambda: response.read(64 * 1024), b''):
                    count += len(chunk)
                    if count > max_bytes:
                        raise ValueError(f'Unexpected size for {destination.name}')
                    digest.update(chunk)
                    target.write(chunk)
            if not count or (expected_digest and
                             (count != max_bytes or digest.hexdigest() != expected_digest)):
                raise ValueError(f'Size or SHA-256 mismatch for {destination.name}')
        temp.replace(destination)
    finally:
        if temp:
            temp.unlink(missing_ok=True)


def main():
    MODELS_DIR.mkdir(exist_ok=True)
    for directory, file_name, size, digest in MODELS:
        path = MODELS_DIR / file_name
        if not path.is_file() or path.stat().st_size != size or checksum(path) != digest:
            fetch_verified(f'{ZOO}{directory}/{file_name}', path, size, digest)
        license_path = MODELS_DIR / f'{directory}.LICENSE.txt'
        if not license_path.is_file():
            fetch_verified(f'{ZOO_RAW}{directory}/LICENSE', license_path, 64 * 1024)
        print(f'Verified {file_name} ({size:,} bytes)')


if __name__ == '__main__':
    main()
