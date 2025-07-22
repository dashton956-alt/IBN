# Testing & Security

## Testing

Unit and integration tests are located in `src/__tests__/`. Example:

```tsx
import { render, screen } from '@testing-library/react';
import { IntentStorage } from '../components/IntentStorage';

describe('IntentStorage', () => {
  it('renders intent storage stats', () => {
    render(<IntentStorage />);
    expect(screen.getByText(/Total Intents/i)).toBeInTheDocument();
    expect(screen.getByText(/Active/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending/i)).toBeInTheDocument();
    expect(screen.getByText(/Inactive/i)).toBeInTheDocument();
  });
});
```

To run tests:
```sh
npm install --save-dev @testing-library/react @testing-library/jest-dom jest @types/jest
npm test
```

Continuous Integration (CI) is set up in `.github/workflows/ci.yml` to run linting and tests on every push/PR.

## Security & RBAC

Role-based access control (RBAC) is implemented in `src/utils/rbac.ts`:

```ts
export type Role = 'admin' | 'operator' | 'viewer';
export function hasPermission(role: Role, action: string): boolean {
  const permissions = { ... };
  return permissions[role]?.includes(action);
}
```

Use `hasPermission(userRole, 'approve')` to check permissions before showing UI elements or making API calls.

See `SECURITY.md` for a full security checklist and best practices.
# Screenshots

Below are example screenshots of the main features:

### Intent Creation
![Intent Creation UI](docs/screenshots/intent-creation.png)

### Approval & Scheduling
![Approval Workflow](docs/screenshots/approval-scheduling.png)

### Network Health Dashboard
![Network Dashboard](docs/screenshots/network-dashboard.png)

### Bulk Operations
![Bulk Operations](docs/screenshots/bulk-operations.png)

### Merge Requests & GitOps
![Merge Requests](docs/screenshots/merge-requests.png)

> Place your screenshots in `docs/screenshots/` (create the folder if needed).

---

# API Endpoints

The main API endpoints are configured in `src/config/endpoints.ts`. Example structure:

```ts
export const ENDPOINTS = {
  SUPABASE_URL: 'https://your-supabase-url.supabase.co',
  SUPABASE_KEY: 'your-supabase-key',
  CISCO_API: 'http://your-cisco-api:8080',
  NETBOX_API: 'http://your-netbox-api:8000',
  NSO_API: 'http://your-nso-server:8080',
  OLLAMA_API: 'http://your-ollama-server:11434',
  MONITORING_API: 'http://your-monitoring-stack:3000',
};
```

## Example API Usage

### Create Intent
```http
POST /api/intents
{
  "title": "Create VLAN 100 for Marketing",
  "intent_type": "vlan",
  "description": "Marketing VLAN with internet access",
  "natural_language_input": "Create VLAN 100 for Marketing department with internet access"
}
```

### Get Intents
```http
GET /api/intents
```

### Approve Intent
```http
POST /api/intents/{id}/approve
```

### Schedule Intent
```http
POST /api/intents/{id}/schedule
{
  "scheduledFor": "2025-07-23T10:00:00Z"
}
```

### Get Network Devices
```http
GET /api/devices
```

### Get Merge Requests
```http
GET /api/merge-requests
```

---

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

## Getting Started

### Prerequisites
- Node.js & npm (recommended: use [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- Supabase project (or use provided demo)
- Monitoring stack (optional, for full observability)

### Local Setup
```sh
git clone <YOUR_GIT_URL>
cd intent-nexus
npm install
npm run dev
```
Access the app at [http://localhost:5173](http://localhost:5173) (default Vite port).

### Docker Setup
See `../monitoring-stack/README.md` for backend/monitoring deployment.

### Configuration
- Update `src/config/endpoints.ts` with your API endpoints, credentials, and integration URLs.
- See `src/config/README.md` for details.

## Usage Walkthrough

1. **Create an Intent**: Use the Intent Creator to describe your desired network state in plain English or select a template.
2. **Approval & Scheduling**: Submit for approval or schedule deployment. Dry-run validation available.
3. **GitOps Integration**: Intent is stored, branch created, config file generated, and merge request opened automatically.
4. **Bulk Operations**: Deploy multiple intents to selected devices.
5. **Monitor & Manage**: View network health, active/pending intents, merge requests, and device status.

## Integrations
- **Cisco**: API for config generation and deployment
- **NetBox**: Source of truth for network inventory
- **Ollama (AI)**: Natural language processing and config generation
- **Supabase**: Database and authentication
- **Monitoring Stack**: Grafana, Prometheus, Loki for observability

## Troubleshooting & FAQ
- Check API endpoints and credentials in `src/config/endpoints.ts`
- Use browser dev tools for error details
- Check Supabase logs for DB/API issues
- For monitoring, ensure `monitoring-stack` is running and accessible

## Contributing
- Fork the repo, create a feature branch, and submit a pull request
- See code comments and `src/config/README.md` for extension points

## License
See main repo LICENSE
