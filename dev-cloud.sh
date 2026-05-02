#!/usr/bin/env bash
# 云端重启后可直接运行（不必先 export PATH）：./dev-cloud.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
exec bash "${ROOT}/scripts/with-node-path.sh" bash -c 'yarn install && yarn dev'
