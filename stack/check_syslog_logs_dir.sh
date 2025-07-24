#!/bin/sh
# Check and create syslog-ng logs directory for Promtail if needed
LOGDIR="$(dirname "$0")/syslog-ng/logs"
if [ ! -d "$LOGDIR" ]; then
  echo "Creating $LOGDIR..."
  mkdir -p "$LOGDIR"
else
  echo "$LOGDIR already exists."
fi
