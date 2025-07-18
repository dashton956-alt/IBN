# syslog-ng Containerized Logging Solution

## Overview
This folder contains a Dockerized syslog-ng setup for centralized log collection, rotation, and forwarding.

## Features
- Receives syslog over UDP (514) and TCP (601)
- Log rotation via logrotate and cron
- Configurable via mounted config directory
- Persistent log storage
- Healthcheck and resource limits
- Security best practices

## Usage

### 1. Build and Run
```sh
docker compose up -d --build
```

### 2. Configuration
- Edit `config/syslog-ng.conf` to change log sources, destinations, or formatting.
- The `config` directory is mounted read-only into the container.

- If you are using Loki integration, run the `check_loki_dirs.sh` script in the Monitor-stack directory before starting the stack to ensure all required directories exist and have correct permissions.
- Logs are written to the `logs/` directory in this folder (mapped to `/var/log/network` in the container).
- This directory must exist on the host for syslog-ng to write logs and for Promtail (in the Monitor-stack) to read them.
- Log rotation is handled by logrotate (see `logrotate-syslog-ng`).

### 4. Healthcheck
- The container will be automatically restarted if syslog-ng fails.

### 5. Resource Limits
- Adjust CPU and memory limits in `docker-compose.yml` as needed.

### 6. Security
- The config directory is mounted read-only.
- Only required ports are exposed.
- No secrets are stored in this repo.

### 7. Troubleshooting
- View logs: `docker compose logs syslog-ng`
- Check container status: `docker ps`
- Inspect logs in the `logs/` directory

### 8. References
- [syslog-ng Documentation](https://www.syslog-ng.com/technical-documents/list/syslog-ng-open-source-edition/)
- [logrotate Documentation](https://linux.die.net/man/8/logrotate)
