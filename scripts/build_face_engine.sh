#!/usr/bin/env bash
set -eu

if [ "${ARGUS_FACE_MATCH_ENABLED:-}" != "true" ]; then
  echo "Argus face comparison is disabled"
  exit 0
fi

python3 -m pip install --disable-pip-version-check --no-cache-dir --only-binary=:all: --target .argus-face-deps -r scripts/face-engine-requirements.txt
python3 -I -B scripts/install_face_models.py
python3 -I -B scripts/face_worker.py --check
