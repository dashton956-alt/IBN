# Monitoring Stack for Intent-Based Networking (IBN)

This stack provides log analysis and observability for IBN systems using Loki, Promtail, Grafana, Prometheus, and syslog-ng.

## Features
- Centralized log collection and analysis
- Syslog ingestion (UDP 514, TCP 601)
- Log shipping to Loki via Promtail
- Visualization with Grafana
- Metrics with Prometheus

## Directory Structure
```
monitoring-stack/
  docker-compose.yml
  loki/
    loki-config.yaml
    data/
  promtail/
    promtail-config.yaml
  prometheus/
    prometheus.yml
  grafana/
  syslog-ng/
    config/
      syslog-ng.conf
  logs/
```

## Quick Start
1. Ensure Docker is installed and running.
2. Create required directories:
   ```sh
   mkdir -p logs loki/data grafana
   ```
3. Start the stack:
   ```sh
   docker compose up -d
   ```
4. Send syslog messages to UDP 514 or TCP 601 on your host.
5. Access Grafana at [http://localhost:3000](http://localhost:3000) (user: admin, pass: admin).

## Troubleshooting
- Check container logs: `docker compose logs <service>`
- Ensure `logs/` directory is writable by syslog-ng and readable by Promtail.
- Loki UI: [http://localhost:3100](http://localhost:3100)
- Prometheus: [http://localhost:9090](http://localhost:9090)

## Customization
- Edit `promtail/promtail-config.yaml` to change log scraping behavior.
- Edit `syslog-ng/config/syslog-ng.conf` for advanced syslog routing.
- Add Grafana dashboards for IBN log analysis.

---
This stack is a clean, best-practice foundation for IBN log analytics. Extend as needed for your use case.
