
# Network Configuration Guide

This document outlines all the IP addresses, URLs, and credentials you need to update for the Network Intent Orchestrator application to work properly.

## 🔧 Configuration Files to Update

### 1. Main Configuration (`src/config/endpoints.ts`)

**Ollama AI Service:**
```typescript
OLLAMA: {
  BASE_URL: 'http://localhost:11434', // UPDATE: Change to your Ollama server IP
  DEFAULT_MODEL: 'llama3.1',
}
```
- Replace `localhost` with your Ollama server IP (e.g., `http://192.168.1.100:11434`)
- Ensure Ollama is running and accessible

**NetBox Configuration:**
```typescript
NETBOX: {
  API_BASE_URL: 'https://your-netbox-instance.com/api', // UPDATE: Your NetBox URL
  GRAPHQL_URL: 'https://your-netbox-instance.com/graphql/', // UPDATE: GraphQL endpoint
  API_TOKEN: 'YOUR_NETBOX_TOKEN_HERE', // UPDATE: Your API token
}
```
- Replace with your actual NetBox instance URL
- Generate and add your NetBox API token

**NSO Configuration:**
```typescript
NSO: {
  BASE_URL: 'http://your-nso-server:8080', // UPDATE: Your NSO server
  USERNAME: 'admin', // UPDATE: Your NSO username
  PASSWORD: 'admin' // UPDATE: Your NSO password
}
```

### 2. Docker Configuration (`docker/ollama/.env.example`)

```bash
# Copy to .env and update these values:
OLLAMA_HOST=0.0.0.0
OLLAMA_PORT=11434
DEFAULT_MODEL=llama3.1
```

### 3. Environment Variables (for production)

Create these environment variables or add them to your deployment:

```bash
# Ollama Configuration
VITE_OLLAMA_BASE_URL=http://your-ollama-server:11434
VITE_OLLAMA_DEFAULT_MODEL=llama3.1

# NetBox Configuration
VITE_NETBOX_API_URL=https://your-netbox-instance.com/api
VITE_NETBOX_GRAPHQL_URL=https://your-netbox-instance.com/graphql/
VITE_NETBOX_API_TOKEN=your_actual_api_token_here

# NSO Configuration
VITE_NSO_BASE_URL=http://your-nso-server:8080
VITE_NSO_USERNAME=your_nso_username
VITE_NSO_PASSWORD=your_nso_password
```

## 🌐 Network Requirements

### Required Services and Ports:

1. **Ollama AI Service**
   - Default Port: 11434
   - Health Check: `GET /api/tags`
   - Generate Endpoint: `POST /api/generate`

2. **NetBox IPAM/DCIM**
   - API Port: Usually 80/443 (HTTP/HTTPS)
   - Required Endpoints:
     - `/api/dcim/devices/`
     - `/api/dcim/sites/`
     - `/api/ipam/vlans/`
     - `/graphql/`

3. **NSO (Network Service Orchestrator)**
   - Default Port: 8080
   - REST API endpoints for device management

4. **Optional Monitoring Services**
   - Prometheus: Port 9090
   - Grafana: Port 3000
   - Alertmanager: Port 9093

### Firewall Rules Required:

```bash
# Allow access to Ollama
ALLOW TCP 11434 FROM application_server TO ollama_server

# Allow access to NetBox
ALLOW TCP 80,443 FROM application_server TO netbox_server

# Allow access to NSO
ALLOW TCP 8080 FROM application_server TO nso_server

# Allow access to network devices (if direct access needed)
ALLOW TCP 22,23,80,443,161 FROM application_server TO network_devices
```

## 🔑 Authentication & Credentials

### NetBox API Token:
1. Log into your NetBox instance
2. Go to Admin → API → Tokens
3. Create a new token with appropriate permissions
4. Copy the token to your configuration

### NSO Credentials:
- Default: admin/admin
- Update in production with secure credentials

### SNMP Communities:
- Default: public
- Update with your actual SNMP community strings

## 🐳 Docker Deployment

### Start Ollama Container:
```bash
cd docker/ollama
cp .env.example .env
# Edit .env with your settings
docker-compose up -d
./setup.sh
```

### Verify Services:
```bash
# Check Ollama
curl http://your-ollama-server:11434/api/tags

# Check NetBox
curl -H "Authorization: Token YOUR_TOKEN" \
     https://your-netbox-instance.com/api/dcim/devices/

# Check NSO
curl -u username:password \
     http://your-nso-server:8080/restconf/data/
```

## 🔍 Troubleshooting

### Common Issues:

1. **Ollama Connection Failed**
   - Verify Ollama is running: `docker ps`
   - Check firewall rules
   - Verify URL in configuration

2. **NetBox API Errors**
   - Verify API token permissions
   - Check NetBox URL accessibility
   - Ensure CORS is configured if needed

3. **NSO Connection Issues**
   - Verify NSO service status
   - Check credentials
   - Confirm REST API is enabled

### Network Connectivity Test:
```bash
# Test from your application server
telnet ollama-server 11434
telnet netbox-server 443
telnet nso-server 8080
```

## 📝 Quick Setup Checklist

- [ ] Update `src/config/endpoints.ts` with your server IPs
- [ ] Generate NetBox API token
- [ ] Configure NSO credentials
- [ ] Set up environment variables for production
- [ ] Configure firewall rules
- [ ] Start Ollama container
- [ ] Test all service connections
- [ ] Verify AI optimization functionality
