# Jenkins Docker CI/CD Setup

---
**Production Onboarding & Operations**

- See the central onboarding guide (`onboarding/README.md`) and use the Linux bootstrap script (`onboarding/bootstrap.sh`) for one-shot setup.
- All secrets, environment variables, and configuration should be managed via Vault (see Vault onboarding docs).
- For SSO and RBAC, integrate with the central Keycloak server as described in the main project README.
- For backup, restore, and scaling procedures, see the operational section in the onboarding guide.

---

This folder contains a Dockerfile for running Jenkins with Docker and Trivy for CI/CD pipelines.

## Features
- Jenkins LTS
- Docker CLI (for building and running containers)
- Trivy (for vulnerability scanning)
- Jenkins plugins: Docker Pipeline, Workflow Aggregator

## Usage

### 1. Build the Jenkins Docker Image
```sh
cd jenkins-docker
docker build -t custom-jenkins:latest .
```

### 2. Run Jenkins
```sh
docker run -d \
  -p 8080:8080 -p 50000:50000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v jenkins_home:/var/jenkins_home \
  -v /path/to/your/repo:/workspace \
  custom-jenkins:latest
```
- Access Jenkins at http://localhost:8080
- Initial admin password: `/var/jenkins_home/secrets/initialAdminPassword`

### 3. Configure Your Pipeline
- Place your `Jenkinsfile` in the root of your repository (or `/workspace` if mounting).
- Create a new Pipeline job in Jenkins and point it to your repo.
- The pipeline will build Docker images, scan with Trivy, run tests, and deploy.

### 4. Customization
- Edit the Jenkinsfile to add more stages (lint, integration tests, notifications, etc).
- Add more plugins as needed using `jenkins-plugin-cli` in the Dockerfile.

---

For more details, see the Jenkinsfile and comments in this folder.
