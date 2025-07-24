# Auth Server (Keycloak)

---
**Production Onboarding & Operations**

- See the central onboarding guide (`onboarding/README.md`) and use the Linux bootstrap script (`onboarding/bootstrap.sh`) for one-shot setup.
- All secrets, environment variables, and configuration should be managed via Vault (see Vault onboarding docs).
- For SSO and RBAC, integrate with the central Keycloak server as described in the main project README.
- For backup, restore, and scaling procedures, see the operational section in the onboarding guide.

---

This folder provides a ready-to-run open source authentication and authorization server using [Keycloak](https://www.keycloak.org/) and Postgres, suitable for JWT, OAuth2, and RBAC for your IBN stack.

## Features
- Open source, free, and production-ready
- Supports JWT, OAuth2, OpenID Connect, SSO, RBAC
- Admin UI for managing users, roles, and clients
- Pre-configured with a default realm (imported on first run)

## Quick Start

1. **Start the server:**
   ```sh
   docker compose up -d
   ```
2. **Access Keycloak UI:**
   - http://localhost:8089/
   - Username: `admin`  Password: `admin`
3. **Database:**
   - Postgres runs on port 5439 (internal use)

## Realm Import
- The container will import `realm-export.json` on first run.
- Customize this file to pre-create clients, roles, and users.

## Integration
- Use Keycloak as your OAuth2/JWT provider for all IBN services.
- See Keycloak docs for client integration examples (Node, Python, Django, etc).

---
For advanced config, see [Keycloak documentation](https://www.keycloak.org/documentation).
