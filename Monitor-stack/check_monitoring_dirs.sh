#!/bin/bash
# Check and fix all required directories and permissions for Loki, Promtail, and syslog-ng

set -e

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

# Directories to check
LOKI_DATA_DIRS=("$BASE_DIR/data/chunks" "$BASE_DIR/data/index" "$BASE_DIR/data/compactor")
PROMTAIL_LOG_DIR="$BASE_DIR/syslog-ng/logs"

# Create and fix Loki data directories
for dir in "${LOKI_DATA_DIRS[@]}"; do
  if [ ! -d "$dir" ]; then
    echo "Creating $dir..."
    mkdir -p "$dir"
  else
    echo "$dir already exists."
  fi
  chmod 755 "$dir"
  chown $(id -u):$(id -g) "$dir"
  ls -ld "$dir"
done

# Create and fix Promtail/syslog-ng log directory
if [ ! -d "$PROMTAIL_LOG_DIR" ]; then
  echo "Creating $PROMTAIL_LOG_DIR..."
  mkdir -p "$PROMTAIL_LOG_DIR"
else
  echo "$PROMTAIL_LOG_DIR already exists."
fi
chmod 755 "$PROMTAIL_LOG_DIR"
chown $(id -u):$(id -g) "$PROMTAIL_LOG_DIR"
ls -ld "$PROMTAIL_LOG_DIR"

echo "All monitoring directories are present and permissions are set."
