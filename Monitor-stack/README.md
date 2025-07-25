# Monitor-stack

---
**Production Onboarding & Operations**

- See the central onboarding guide (`onboarding/README.md`) and use the Linux bootstrap script (`onboarding/bootstrap.sh`) for one-shot setup.
- All secrets, environment variables, and configuration should be managed via Vault (see Vault onboarding docs).
- For SSO and RBAC, integrate with the central Keycloak server as described in the main project README.
- For backup, restore, and scaling procedures, see the operational section in the onboarding guide.

---

## Overview

This stack provides a robust monitoring and observability solution using:

- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **Loki**: Log aggregation
- **Promtail**: Log shipping to Loki
- **LibreNMS**: Network monitoring
- **MariaDB**: Database for LibreNMS
- **Redis**: Caching for LibreNMS
- **Memcached**: Caching for LibreNMS
- **Node Exporter**: Host metrics exporter
- **cAdvisor**: Container metrics exporter

## Usage

### 1. Environment Variables

All sensitive and configuration values are stored in the `.env` file. Edit this file to change passwords, database names, and other settings. Example variables:


Refer to the `.env` file for all required environment variables. Do not commit secrets or sensitive values to version control. Example variable names (values should be set securely in your `.env` file):

```
# MYSQL_ROOT_PASSWORD
# MYSQL_DATABASE
# MYSQL_USER
# MYSQL_PASSWORD
# DB_HOST
# DB_NAME
# DB_USER
# DB_PASSWORD
# APP_KEY
# TZ
# GF_SECURITY_ADMIN_PASSWORD
```

### 2. Starting the Stack

```sh
docker compose --env-file .env up -d
```

### 3. Stopping the Stack

```sh
docker compose down
```

### 4. Persistent Data & Log Directory

Prometheus, Grafana, LibreNMS, and MariaDB use named volumes for data persistence. Data is retained across restarts and upgrades.


#### Syslog-ng & Promtail Log Directory

Syslog-ng writes logs to the host directory `./syslog-ng/logs`, which is also mounted read-only into the Promtail container for log shipping to Loki.

**Before starting the stack, you must ensure this directory exists.**



You can do this automatically by running the provided scripts:

```sh
# Ensure syslog-ng/Promtail log directory exists
sh ./check_and_fix_syslog_logs_dir.sh
# Ensure Loki data directories exist
sh ./check_loki_dirs.sh
```

These scripts check for the required directories, create them if needed, and set permissions to ensure all containers can access them. Run them any time before `docker compose up` to avoid mount errors.

#### Manual Steps (if you prefer):

1. Create the directory if it does not exist:
   ```sh
   mkdir -p ./syslog-ng/logs
   ```
2. Ensure it is readable and writable (especially on Linux):
   ```sh
   chmod a+r ./syslog-ng/logs
   chmod u+w ./syslog-ng/logs
   ```

### 5. Health Checks & Resource Limits

All critical services have health checks and resource limits for reliability and stability. If a service fails its health check, Docker will attempt to restart it automatically.

### 6. Security

- Sensitive values are not hardcoded.
- Only required ports are exposed.
- Read-only mounts are used where possible.
- Images are pinned to specific versions for stability.

### 7. Service Details

- **Prometheus**: Access at [http://localhost:9090](http://localhost:9090)
- **Grafana**: Access at [http://localhost:3000](http://localhost:3000) (default admin password from `.env`)
- **Loki**: [Docs](https://grafana.com/docs/loki/latest/)
- **LibreNMS**: Access at [http://localhost:8000](http://localhost:8000)
- **Node Exporter**: [http://localhost:9100/metrics](http://localhost:9100/metrics)
- **cAdvisor**: [http://localhost:8080](http://localhost:8080)

### 8. Updating Images

Images are pinned to specific versions for stability. Update versions in `docker-compose.yml` as needed. After updating, run:

```sh
docker compose pull
docker compose up -d
```

### 9. Troubleshooting

- Check logs for a service: `docker compose logs <service>`
- Restart a service: `docker compose restart <service>`
- Ensure your `.env` file is present and up to date.
- For persistent data issues, check Docker volumes with `docker volume ls` and `docker volume inspect <volume>`.

### 10. Additional Notes

- For production, review and further restrict resource limits and network exposure as needed.
- See each service's documentation for advanced configuration:
  - [Prometheus Docs](https://prometheus.io/docs/)
  - [Grafana Docs](https://grafana.com/docs/)
  - [Loki Docs](https://grafana.com/docs/loki/latest/)
  - [LibreNMS Docs](https://docs.librenms.org/)
  - [MariaDB Docs](https://mariadb.com/kb/en/documentation/)
  - [Redis Docs](https://redis.io/documentation)
  - [Memcached Docs](https://memcached.org/)
  - [Node Exporter Docs](https://github.com/prometheus/node_exporter)
  - [cAdvisor Docs](https://github.com/google/cadvisor)
