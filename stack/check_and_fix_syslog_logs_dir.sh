#!/bin/sh
# Ensure syslog-ng logs directory exists and is accessible for Promtail
LOGDIR="$(dirname "$0")/syslog-ng/logs"

# Create directory if missing
if [ ! -d "$LOGDIR" ]; then
  echo "Creating $LOGDIR..."
  mkdir -p "$LOGDIR"
else
  echo "$LOGDIR already exists."
fi

# Check permissions (should be readable by all, writable by owner)
if [ ! -r "$LOGDIR" ]; then
  echo "Setting read permission on $LOGDIR..."
  chmod a+r "$LOGDIR"
fi
if [ ! -w "$LOGDIR" ]; then
  echo "Setting write permission for owner on $LOGDIR..."
  chmod u+w "$LOGDIR"
fi

# Show final permissions
ls -ld "$LOGDIR"
