#!/bin/sh
# Ensure all required Loki directories exist and are writable
mkdir -p ./loki/chunks ./loki/index ./loki/cache ./loki/wal ./loki/compactor
chmod -R 777 ./loki
