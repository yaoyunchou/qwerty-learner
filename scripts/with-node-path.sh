#!/usr/bin/env bash
# Cloud / Cursor：重启后会话 PATH 可能不含 nvm，导致找不到 node。
# 用法：scripts/with-node-path.sh <command> [args...]
# 示例：scripts/with-node-path.sh vite
#       scripts/with-node-path.sh yarn install
set -euo pipefail

if command -v node >/dev/null 2>&1; then
  exec "$@"
fi

prepend_and_exec() {
  local bin_dir="$1"
  shift
  [[ -x "${bin_dir}/node" ]] || return 1
  export PATH="${bin_dir}:${PATH}"
  exec "$@"
}

# 固定路径（当前镜像）
prepend_and_exec "/home/ubuntu/.nvm/versions/node/v22.22.2/bin" "$@" || true

# 任意用户：HOME/.nvm 下最新版本的 bin
if [[ -d "${HOME:-}/.nvm/versions/node" ]]; then
  # shellcheck disable=SC2012
  latest="$(ls -1 "${HOME}/.nvm/versions/node" 2>/dev/null | sort -V | tail -1)"
  if [[ -n "$latest" ]]; then
    prepend_and_exec "${HOME}/.nvm/versions/node/${latest}/bin" "$@" || true
  fi
fi

# ubuntu 用户常见路径（当前 shell 不是 ubuntu 时也试一下）
if [[ -d /home/ubuntu/.nvm/versions/node ]]; then
  latest="$(ls -1 /home/ubuntu/.nvm/versions/node 2>/dev/null | sort -V | tail -1)"
  if [[ -n "$latest" ]]; then
    prepend_and_exec "/home/ubuntu/.nvm/versions/node/${latest}/bin" "$@" || true
  fi
fi

echo "with-node-path.sh: 找不到 node。请联系管理员安装 Node，或手动：" >&2
echo '  export PATH="/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH"' >&2
exit 127
