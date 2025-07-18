#!/bin/bash
# Ensure all required Loki directories exist and are writable

LOKI_BASE="$(cd "$(dirname "$0")" && pwd)/data"

for dir in "$LOKI_BASE/chunks" "$LOKI_BASE/index" "$LOKI_BASE/compactor"; do
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

echo "All Loki directories are present and permissions are set."
