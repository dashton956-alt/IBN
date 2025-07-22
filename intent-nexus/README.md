# Intent-Nexus: Intent-Based Networking Orchestrator (Frontend)

## Overview

Intent-Nexus is a modern web application for managing network intents in an Intent-Based Networking (IBN) platform. It provides:
- Natural language intent creation
- Approval workflows and scheduling
- GitOps integration (branch, config, merge request)
- Bulk operations and device management
- Network health dashboard
- Integration with Cisco, NetBox, Supabase, and monitoring stack

## Architecture

- **Frontend**: React, Vite, TypeScript, Tailwind, shadcn-ui
- **Backend**: Supabase (DB), Django API (optional), integrations (Cisco, NetBox, NSO)
- **GitOps**: Automated branch/config/merge request via GitLab/GitHub
- **Monitoring**: Connects to monitoring-stack (Grafana, Prometheus, Loki)

## Key Features

- Create intents using natural language or templates (VLAN, ACL, QoS, Routing, Security)
- Approval and scheduling workflows
- Dry-run validation and rollback
- Bulk deployment and device selection
- Intent storage, search, filter, and versioning
- Network health dashboard (devices, intents, merge requests)
- GitOps workflow for traceability
- Integration with Cisco, NetBox, Ollama (AI), Supabase

---

# Getting Started & Onboarding

## Prerequisites
- Node.js & npm (recommended: use [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- Supabase project (or use provided demo)
- Monitoring stack (optional, for full observability)

## Local Setup
```sh
git clone <YOUR_GIT_URL>
cd intent-nexus
npm install
npm run dev
```
Access the app at [http://localhost:5173](http://localhost:5173) (default Vite port).

## Dependency Management
- All required packages are listed in `package.json`.
- If you see missing module errors, run:
  ```sh
  npm install react react-dom @tanstack/react-query @supabase/supabase-js tailwindcss shadcn-ui
  npm install --save-dev @types/react @types/react-dom eslint prettier
  ```
- For linting and formatting:
  ```sh
  npm run lint
  npm run format
  ```

## Environment Configuration
- Copy `.env.example` to `.env` and fill in required values (API URLs, tokens, etc.).
- All API URLs, tokens, and credentials are centralized in `src/config/urlsCentral.ts`.
- Update `urlsCentral.ts` for any environment or integration changes.

## Quickstart for New Developers
1. Clone the repo and install dependencies.
2. Set up `.env` and update `src/config/urlsCentral.ts` as needed.
3. Run the app locally and verify all features.
4. Run tests and lint to ensure code quality.
5. Read through this README and `src/config/README.md` for extension points.

---

# Usage Walkthrough
1. **Create an Intent**: Use the Intent Creator to describe your desired network state in plain English or select a template.
2. **Approval & Scheduling**: Submit for approval or schedule deployment. Dry-run validation available.
3. **GitOps Integration**: Intent is stored, branch created, config file generated, and merge request opened automatically.
4. **Bulk Operations**: Deploy multiple intents to selected devices.
5. **Monitor & Manage**: View network health, active/pending intents, merge requests, and device status.

---

# API Endpoints & Integrations
- All endpoints are configured in `src/config/urlsCentral.ts`.
- Integrations: Cisco, NetBox, Supabase, Ollama, Monitoring Stack.

---

# Testing & Security

## Testing
- Unit and integration tests are located in `src/__tests__/`.
- To run tests:
  ```sh
  npm test
  ```
- Continuous Integration (CI) is set up in `.github/workflows/ci.yml` to run linting and tests on every push/PR.

## Security & RBAC
- Role-based access control (RBAC) is implemented in `src/utils/rbac.ts`.
- Use `hasPermission(userRole, 'approve')` to check permissions before showing UI elements or making API calls.
- See `SECURITY.md` for a full security checklist and best practices.

---

# Troubleshooting & FAQ
- Check API endpoints and credentials in `src/config/urlsCentral.ts` and `.env`.
- Use browser dev tools for error details.
- Check Supabase logs for DB/API issues.
- For monitoring, ensure `monitoring-stack` is running and accessible.

---

# Contributing
- Fork the repo, create a feature branch, and submit a pull request.
- See code comments and `src/config/README.md` for extension points.

---

# License
See main repo LICENSE

# Screenshots
Place your screenshots in `docs/screenshots/` (create the folder if needed).

---
