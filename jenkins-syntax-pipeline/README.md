# Jenkins Syntax & Lint Pipeline

---
**Production Onboarding & Operations**

- See the central onboarding guide (`onboarding/README.md`) and use the Linux bootstrap script (`onboarding/bootstrap.sh`) for one-shot setup.
- All secrets, environment variables, and configuration should be managed via Vault (see Vault onboarding docs).
- For SSO and RBAC, integrate with the central Keycloak server as described in the main project README.
- For backup, restore, and scaling procedures, see the operational section in the onboarding guide.

---

This Jenkins container is designed for syntax recognition, lint testing, and automated GitHub integration for network automation workflows.

## Features
- Syntax and lint checks (YAML, shell, Dockerfile)
- GitHub branch creation and PR automation
- NetBox change number integration
- Automated config push to controller/ONOS on merge

## Usage
1. Build the Jenkins image:
   ```sh
   docker build -t jenkins-syntax-pipeline .
   ```
2. Run Jenkins:
   ```sh
   docker run -d -p 8081:8080 -v /var/run/docker.sock:/var/run/docker.sock -v jenkins_home:/var/jenkins_home jenkins-syntax-pipeline
   ```
3. Configure your pipeline job with the provided Jenkinsfile.

---

- All syntax/lint failures block the pipeline.
- On PR merge to main, config is pushed to the correct controller/ONOS.
