
/**
 * Centralized URL Configuration
 * All external service URLs and endpoints are configured here
 */

export const URLS = {
  // Cisco NSO URLs
  NSO: {
    BASE_URL: import.meta.env.VITE_NSO_BASE_URL || 'http://localhost:8080',
    RESTCONF_URL: '/restconf/data',
    ENDPOINTS: {
      DEVICES: '/tailf-ncs:devices/device',
      SERVICES: '/tailf-ncs:services',
      ROLLBACKS: '/tailf-ncs:rollbacks'
    }
  },

  // NetBox URLs  
  NETBOX: {
    API_BASE_URL: import.meta.env.VITE_NETBOX_API_URL || 'http://localhost:8000/api',
    GRAPHQL_URL: import.meta.env.VITE_NETBOX_GRAPHQL_URL || 'http://localhost:8000/graphql',
    ENDPOINTS: {
      DEVICES: '/dcim/devices/',
      SITES: '/dcim/sites/',
      VLANS: '/ipam/vlans/',
      INTERFACES: '/dcim/interfaces/',
      JOURNAL_ENTRIES: '/extras/journal-entries/'
    }
  },

  // Git Integration URLs
  GIT: {
    API_URL: import.meta.env.VITE_GIT_API_URL || 'https://gitlab.com/api/v4',
    PROJECT_ID: import.meta.env.VITE_GIT_PROJECT_ID || '',
    ENDPOINTS: {
      BRANCHES: '/repository/branches',
      FILES: '/repository/files',
      MERGE_REQUESTS: '/merge_requests',
      COMMITS: '/repository/commits'
    }
  },

  // Ollama URLs
  OLLAMA: {
    BASE_URL: import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434',
    HEALTH_CHECK: '/api/tags',
    GENERATE: '/api/generate',
    ENDPOINTS: {
      GENERATE: '/api/generate',
      CHAT: '/api/chat',
      MODELS: '/api/tags'
    }
  },

  // Cisco URLs
  CISCO: {
    BASE_URL: import.meta.env.VITE_CISCO_BASE_URL || 'https://api.cisco.com',
    API_VERSION: 'v1',
    ENDPOINTS: {
      DEVICES: '/devices',
      CONFIG: '/config'
    }
  },

  // Monitoring URLs
  MONITORING: {
    BASE_URL: import.meta.env.VITE_MONITORING_URL || 'http://localhost:3000',
    ENDPOINTS: {
      METRICS: '/metrics',
      ALERTS: '/alerts'
    }
  },

  // Config Comparison URLs
  CONFIG_COMPARISON: {
    BASE_URL: import.meta.env.VITE_CONFIG_COMPARISON_URL || 'http://localhost:8001/api'
  }
} as const;

export const CONFIG = {
  OLLAMA: {
    DEFAULT_MODEL: 'llama2',
    MAX_TOKENS: 2000,
    TEMPERATURE: 0.7
  },
  DEVICE_MANAGEMENT: {
    DEFAULT_TIMEOUT: 30000,
    MAX_RETRIES: 3
  }
} as const;
