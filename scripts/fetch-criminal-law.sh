#!/usr/bin/env bash
# 下载《中华人民共和国刑法》正文(markdown),来源:github ImCa0/just-laws。
# 注意:raw.githubusercontent.com 国内通常需 HTTP 代理;请在配了
# http_proxy/https_proxy 的环境运行(curl 会自动读取代理变量)。
set -euo pipefail

BASE="https://raw.githubusercontent.com/ImCa0/just-laws/master/docs/criminal-law/criminal-law"
DIR="$(cd "$(dirname "$0")/.." && pwd)/data/criminal-law"
mkdir -p "$DIR"

curl -fsSL "$BASE/01-general-provisions.md" -o "$DIR/general-provisions.md"
curl -fsSL "$BASE/02-specific-provisions.md" -o "$DIR/specific-provisions.md"
curl -fsSL "$BASE/00-supplementary.md"      -o "$DIR/supplementary.md"

echo "下载完成 → $DIR"
wc -c "$DIR"/*.md
