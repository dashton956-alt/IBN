# Intent Based Networking (IBN) Platform

---
## Production Onboarding & Operations

- **Start here:** See the central onboarding guide (`onboarding/README.md`) and use the Linux bootstrap script (`onboarding/bootstrap.sh`) for one-shot setup of all core services.
- **Secrets & Config:** All secrets, environment variables, and configuration are managed via Vault. See Vault onboarding docs for setup and usage.
- **SSO & RBAC:** Integrate all services with the central Keycloak server for authentication and role-based access control. See Keycloak onboarding docs and each stack's README for details.
- **Operational Procedures:** For backup, restore, scaling, and troubleshooting, see the operational section in the onboarding guide.
- **Stack-specific onboarding:** Each stack's README contains step-by-step onboarding and production notes. Cross-reference as needed.

---

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


## Getting Started (Development Quickstart)

1. **Clone the repository:**
   ```sh
   git clone <this-repo-url>
   cd IBN
   ```

2. **Configure environment variables:**
   - For production, use Vault to manage all secrets and environment variables. See onboarding/README.md and Vault docs.
   - For local development, copy `.env.example` to `.env` in each stack and edit as needed.

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


## Security, SSO & Secrets Management
- All authentication and RBAC are managed via Keycloak (see `auth-server/README.md` and onboarding guide).
- All secrets/configuration are managed via Vault (see onboarding/README.md and Vault docs).
- See `SECURITY.md` and each stack’s README for additional setup and configuration.


## Monitoring & Logging
- Integrated with `monitoring-stack` for metrics, logs, and alerts.
- All CI/CD and service logs are shipped to the central monitoring stack.
- Audit logging enabled for all critical actions.


## API Documentation
- Swagger/OpenAPI docs available in `intent-nexus` and `django_backend`.
- See onboarding/README.md for API onboarding and usage notes.


## Contributing
- Fork the repo, create a feature branch, and submit a pull request.
- Please follow onboarding and security best practices for all contributions.
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

## CI/CD Pipeline with Jenkins

This project includes a Jenkinsfile for automated Docker build, vulnerability scanning, testing, and deployment.

### Prerequisites
- Jenkins server with Docker installed
- Jenkins user with permission to run Docker commands

### Setup Steps
1. **Add Jenkinsfile to your repository root** (already included).
2. **Install Trivy**
   - The pipeline will auto-install Trivy for vulnerability scanning.
3. **Configure Jenkins Job**
   - Create a new Pipeline job in Jenkins.
   - Set the repository URL to this project.
   - Ensure the Jenkins agent has Docker access.
4. **Run the Pipeline**
   - On each commit or PR, Jenkins will:
     - Checkout code
     - Build Docker images (`docker compose build`)
     - Scan all images for vulnerabilities (Trivy)
     - Run tests (customize in Jenkinsfile)
     - Deploy (customize in Jenkinsfile)

### Customizing the Pipeline
- Edit the `Test` and `Deploy` stages in the Jenkinsfile to fit your environment.
- Add notifications or additional steps as needed.

### Example: Running Locally
You can test the build and scan steps locally:
```sh
docker compose build
trivy image <your-image:tag>
```

For more details, see the Jenkinsfile in the repo root.

---

For questions or contributions, please open an issue or pull request.
