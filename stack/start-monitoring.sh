#!/bin/bash

set -e  # Exit on error

# Check config files exist and are not directories
check_config_file() {
  local path="$1"
  if [ ! -f "$path" ]; then
    echo "❌ ERROR: '$path' does not exist or is not a file!"
    exit 1
  fi
}

echo "🔍 Checking config files..."

check_config_file "./loki/loki-config.yaml"
check_config_file "./promtail/promtail-config.yaml"

echo "✅ Config files found. Starting monitoring stack..."

docker compose up -d
