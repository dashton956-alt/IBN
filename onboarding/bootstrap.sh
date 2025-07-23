#!/bin/bash
# IBN Linux Bootstrap Script
# This script automates onboarding and production setup for the IBN stack.
# Usage: curl -fsSL <RAW_SCRIPT_URL> | bash

set -euo pipefail

# 1. Clone the repository
REPO_URL="<YOUR_GIT_REPO_URL>"
REPO_DIR="IBN"
if [ ! -d "$REPO_DIR" ]; then
  git clone "$REPO_URL" "$REPO_DIR"
fi
cd "$REPO_DIR"

# 2. Install prerequisites (Docker, Docker Compose, Node.js, Python, etc.)
# (Assumes Ubuntu/Debian. Adjust for your distro as needed.)
if ! command -v docker &>/dev/null; then
  echo "Installing Docker..."
  sudo apt-get update && sudo apt-get install -y docker.io
fi
if ! command -v docker-compose &>/dev/null; then
  echo "Installing Docker Compose..."
  sudo apt-get install -y docker-compose
fi
if ! command -v python3 &>/dev/null; then
  echo "Installing Python3..."
  sudo apt-get install -y python3 python3-pip
fi
if ! command -v npm &>/dev/null; then
  echo "Installing Node.js and npm..."
  sudo apt-get install -y nodejs npm
fi

# 3. Copy and edit .env files for each stack
for d in monitoring-stack example-orchestrator\ 1 intent_engine intent-nexus auth-server; do
  if [ -f "$d/.env.example" ] && [ ! -f "$d/.env" ]; then
    cp "$d/.env.example" "$d/.env"
    echo "[ACTION REQUIRED] Edit $d/.env with your secrets and config."
  fi
done

# 4. Start core services
(cd monitoring-stack && docker compose up -d)
(cd example-orchestrator\ 1 && docker compose up -d)
(cd intent-nexus && docker compose up -d)
(cd auth-server && docker compose up -d)

# 5. Run Django migrations and start intent engine
(cd intent_engine && pip3 install -r requirements.txt && python3 manage.py migrate && python3 manage.py runserver 0.0.0.0:8000 &)

# 6. Print next steps
cat <<EOF

---
IBN stack core services started.

- Edit .env files as needed for secrets and config.
- Access Keycloak at http://localhost:8089 (admin/admin)
- Access Grafana at http://localhost:3000 (admin/admin)
- Access frontend at http://localhost:5173
- Access Django API at http://localhost:8000

[Manual Steps Required]
- Complete Vault setup and onboarding (see onboarding/README.md)
- Configure SSO/OIDC in each stack as per documentation
- Review all onboarding and production notes in each README.md

EOF
