# CI/CD Pipeline DevOps Docker

---
**Production Onboarding & Operations**

- See the central onboarding guide (`onboarding/README.md`) and use the Linux bootstrap script (`onboarding/bootstrap.sh`) for one-shot setup.
- All secrets, environment variables, and configuration should be managed via Vault (see Vault onboarding docs).
- For SSO and RBAC, integrate with the central Keycloak server as described in the main project README.
- For backup, restore, and scaling procedures, see the operational section in the onboarding guide.

---

This container is designed for event-driven use in CI/CD pipelines, providing a secure, minimal environment for running Ansible and Puppet automation tasks.

## Features
- Lightweight Alpine base
- Installs Ansible (Python venv) and Puppet (Ruby gem)
- Runs as a non-root user for security
- No TTY or interactive shell by default (pipeline-friendly)
- Workspace volume for pipeline artifacts
- Entrypoint allows pipeline to override the command

## Usage Example (docker-compose)
```yaml
version: '3.8'
services:
  devops-pipeline:
    build: .
    container_name: devops-pipeline-tools
    environment:
      - ANSIBLE_CONFIG=/app/ansible.cfg
    volumes:
      - ./workspace:/workspace
    working_dir: /workspace
```



## Authentication Integration

All CI/CD jobs and monitoring are integrated with the central authentication server (Keycloak). Only authenticated users and jobs can trigger pipeline actions and view monitoring dashboards.

- Configure your pipeline and monitoring tools to use OIDC/OAuth2 with the Keycloak server at `http://auth-server:8080/` (realm: `IBN`).
- All job logs and monitoring data are access-controlled and visible only to authorized users.

## Logging to Syslog and Monitoring

This container is configured to send job logs to a central syslog-ng instance for monitoring and dashboarding.

### Example: Log CI/CD Job Status to Syslog
```sh
docker compose run --rm devops-pipeline sh -c 'ansible-playbook playbook.yml 2>&1 | tee job.log | logger -n <SYSLOG_HOST> -P 514 -t ci-cd-job'
```
Replace `<SYSLOG_HOST>` with the hostname or IP of your syslog-ng container/service (e.g., `syslog-ng` if on the same Docker network).

All logs sent to syslog-ng will be available in Loki/Grafana for monitoring and alerting.

---
## Usage in CI/CD (example)
```sh
docker compose run --rm devops-pipeline ansible-playbook playbook.yml
```

## Customization
- Add your playbooks, manifests, or scripts to the `workspace` directory.
- Pass secrets and environment variables from your pipeline, not in the image.
- Override the default command as needed for your pipeline job.

## Security
- No secrets are baked into the image.
- Runs as a non-root user.

## Versioning
- Tag images by version or commit for reproducibility in your pipeline.
