# Secrets Management for IBN (Vault + Vault-UI)

This directory now uses HashiCorp Vault and Vault-UI for secure secrets management with a web GUI.

## Usage

1. Start Vault and Vault-UI:
   ```sh
   docker compose up -d
   ```

2. Access the Vault UI at [http://localhost:8083](http://localhost:8083)
   (Login token: `root` for dev mode)

3. Store and manage your secrets using the web interface.

4. Update your applications to fetch secrets from Vault.

## Notes

- The previous FastAPI-based secrets service is deprecated.
- All secrets should be managed in Vault for security and auditability.
# Secrets Docker Service for IBN

This service provides secure storage and retrieval of secrets (API tokens, passwords, etc.) for the Intent-Nexus platform using a simple FastAPI backend in Docker.

## Usage

### 1. Build and Run the Docker Container
```sh
cd secrets-docker
cp .env.example .env  # Add your secrets to .env
# Build the Docker image
docker build -t ibn-secrets .
# Run the container
# (You can mount .env as a file or use --env-file)
docker run -d --name ibn-secrets -p 8000:8000 --env-file .env ibn-secrets
```

### 2. Add/Import Secrets
- Edit `.env` in the `secrets-docker` folder and add secrets as KEY=VALUE pairs.
- Example:
  ```env
  NETBOX_API_TOKEN=your-netbox-token
  DJANGO_SECRET_KEY=your-django-secret
  CISCO_USERNAME=your-cisco-username
  CISCO_PASSWORD=your-cisco-password
  ```
- You can also POST new secrets to the running service:
  ```sh
  curl -X POST http://localhost:8000/set-secret -H "Content-Type: application/json" -d '{"key":"NEW_SECRET","value":"myvalue"}'
  ```

### 3. Retrieve Secrets from Other Services
- Any service (Django backend, frontend, etc.) can retrieve secrets via HTTP:
  ```python
  import requests
  response = requests.post('http://ibn-secrets:8000/get-secret', json={'key': 'NETBOX_API_TOKEN'})
  secret = response.json().get('value')
  ```
- In production, use Docker Compose networking so services can reach `ibn-secrets` by container name.

## Django Integration Example
- In your Django backend, use `requests` to fetch secrets at runtime:
  ```python
  import requests
  def get_secret(key):
      response = requests.post('http://ibn-secrets:8000/get-secret', json={'key': key})
      return response.json().get('value')
  # Usage:
  netbox_token = get_secret('NETBOX_API_TOKEN')
  ```

## Security Notes
- Do not commit `.env` with real secrets to version control.
- Use Docker secrets or a vault for production deployments if possible.
- Restrict network access to the secrets service in production.

## API Endpoints
- `POST /get-secret` — Retrieve a secret by key
- `POST /set-secret` — Add a new secret (for demo/dev only)

---
For questions or improvements, see the main IBN repo.
