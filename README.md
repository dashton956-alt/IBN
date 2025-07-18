# Intent Based Networking (IBN) Platform

This repository provides a complete setup for an Intent Based Networking (IBN) service, including orchestration, monitoring, automation, and supporting infrastructure. The platform is modular and designed for extensibility, rapid prototyping, and production deployment.

## Repository Structure

- **CI-CD-pipeline-Devops-docker/**
  - Contains Docker and CI/CD pipeline resources for automating builds, tests, and deployments.
  - Includes a `docker-compose.yml` for DevOps automation and a `workspace/` for pipeline scripts.

- **example-orchestrator 1/**
  - The main IBN orchestrator service, including:
    - Python source code for orchestration logic, intent processing, and API endpoints.
    - `docker/` subfolders for containerized microservices (federation, lso, netbox, nginx, orchestrator, orchestrator-ui, etc.).
    - `migrations/` for database schema management.
    - `products/`, `services/`, `workflows/` for intent models, business logic, and workflow automation.
    - `templates/` and `translations/` for intent templates and localization.

- **intent_engine/**
  - Django-based intent engine for managing, validating, and processing network intents.
  - Contains Django apps, models, migrations, and static files for the intent engine.
  - `sample_intents/` provides example intent YAMLs.

- **intent-nexus/**
  - Frontend and supporting backend for the IBN platform.
  - Contains a modern web UI (likely Vue/React) and supporting configuration for frontend development.
  - `django_backend/` for backend API integration.

- **Monitor-stack/**
  - An alternative or legacy monitoring stack (see also `monitoring-stack/`).
  - Contains scripts and configuration for monitoring services, including Grafana, Prometheus, Loki, and syslog-ng.

- **monitoring-stack/**
  - The main monitoring stack for the IBN platform.
  - Includes Docker Compose setup for Grafana, Prometheus, Loki, Promtail, and syslog-ng.
  - Contains configuration, persistent data, and logs for monitoring services.

- **onap/**
  - Contains ONAP (Open Network Automation Platform) resources, such as OOM (ONAP Operations Manager) for integration or reference.

- **temporal-python-demo/**
  - Example/demo code for integrating Temporal workflows with Python.

## Getting Started

1. **Clone the repository:**
   ```sh
   git clone <this-repo-url>
   cd IBN
   ```

2. **Review and configure environment variables** as needed in each stack (see `Monitor-stack/` and `monitoring-stack/`).

3. **Start the monitoring stack:**
   ```sh
   cd monitoring-stack
   docker-compose up -d
   ```

4. **Start the orchestrator and intent engine:**
   - See `example-orchestrator 1/README.md` and `intent_engine/README.md` for details.

5. **Access the UI:**
   - The frontend is in `intent-nexus/`.

## Folder Summary

| Folder                   | Purpose                                                                 |
|------------------------- |------------------------------------------------------------------------|
| CI-CD-pipeline-Devops-docker/ | DevOps automation, CI/CD, and Docker resources                        |
| example-orchestrator 1/  | Main IBN orchestrator, microservices, and orchestration logic            |
| intent_engine/           | Django-based intent engine and API                                       |
| intent-nexus/            | Web frontend and supporting backend                                      |
| Monitor-stack/           | Monitoring stack (legacy/alternative)                                    |
| monitoring-stack/        | Main monitoring stack (Grafana, Prometheus, Loki, etc.)                  |
| onap/                    | ONAP integration resources                                               |
| temporal-python-demo/    | Temporal workflow Python demo                                            |

## Notes
- Each subproject may have its own README with more detailed instructions.
- This repository is designed for modularity—services can be run independently or together.
- For production, review and secure all credentials, secrets, and exposed ports.

---

For questions or contributions, please open an issue or pull request.
