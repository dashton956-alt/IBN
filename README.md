
# Intent Based Networking (IBN) Platform

This repository provides a modular, production-ready Intent Based Networking (IBN) platform for network automation, orchestration, monitoring, and analytics. It supports rapid prototyping, extensibility, and secure deployment.

## Key Features
- Intent creation, approval, scheduling, deployment, rollback
- GitOps workflow (branch, config, merge request)
- Role-based access control (RBAC)
- SSO (Single Sign-On) support
- Audit logging and error monitoring
- API documentation (Swagger/OpenAPI)
- Rate limiting, CORS, and security headers
- Background task queue (Celery)
- Email/notification system
- Static/media file handling
- Automated DB backups and migrations
- API versioning
- Enhanced admin dashboard
- Monitoring stack integration (Grafana, Prometheus, Loki)

## Repository Structure

- **CI-CD-pipeline-Devops-docker/**: CI/CD and DevOps automation
- **example-orchestrator 1/**: Main orchestrator, microservices, workflows
- **intent_engine/**: Django-based intent engine and API
- **intent-nexus/**: Web frontend and backend, SSO, RBAC, API docs
- **Monitor-stack/**: Legacy monitoring stack
- **monitoring-stack/**: Main monitoring stack (Grafana, Prometheus, Loki, etc.)
- **onap/**: ONAP integration resources
- **temporal-python-demo/**: Temporal workflow demo

## Getting Started

1. **Clone the repository:**
   ```sh
   git clone <this-repo-url>
   cd IBN
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env` in each stack
   - Edit with your secrets, URLs, and credentials

3. **Start the monitoring stack:**
   ```sh
   cd monitoring-stack
   docker compose up -d
   ```

4. **Start the orchestrator and intent engine:**
   ```sh
   cd example-orchestrator 1
   docker compose up -d
   cd ../intent_engine
   python manage.py migrate
   python manage.py runserver
   ```

5. **Start the frontend (intent-nexus):**
   ```sh
   cd intent-nexus
   npm install
   npm run dev
   # Or use Docker
   docker compose up -d
   ```

## Security & SSO
- RBAC and SSO are supported in `intent-nexus` and `django_backend`.
- See `SECURITY.md` and each stack’s README for setup and configuration.

## Monitoring & Logging
- Integrated with `monitoring-stack` for metrics, logs, and alerts.
- Audit logging enabled for all critical actions.

## API Documentation
- Swagger/OpenAPI docs available in `intent-nexus` and `django_backend`.

## Contributing
- Fork the repo, create a feature branch, and submit a pull request.
- See code comments and each stack’s README for extension points.

## License
See main repo LICENSE
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
