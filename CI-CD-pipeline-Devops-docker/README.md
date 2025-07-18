# CI/CD Pipeline DevOps Docker

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
