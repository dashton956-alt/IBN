
/**
 * Legacy endpoints configuration - DEPRECATED
 * 
 * This file is kept for backwards compatibility.
 * New code should use src/config/urls.ts and src/config/secrets.ts
 */

import { URLS, CONFIG } from './urls';

console.warn('endpoints.ts is deprecated. Please use urls.ts and secrets.ts instead.');

export const ENDPOINTS = {
  OLLAMA: {
    BASE_URL: URLS.OLLAMA.BASE_URL,
    DEFAULT_MODEL: CONFIG.OLLAMA.DEFAULT_MODEL,
    HEALTH_CHECK: URLS.OLLAMA.HEALTH_CHECK,
    GENERATE: URLS.OLLAMA.GENERATE
  },
  NETBOX: {
    API_BASE_URL: URLS.NETBOX.API_BASE_URL,
    GRAPHQL_URL: URLS.NETBOX.GRAPHQL_URL,
    API_TOKEN: 'USE_SECRETS_SERVICE', // Placeholder - use secretsService instead
    ENDPOINTS: URLS.NETBOX.ENDPOINTS
  },
  CISCO: {
    BASE_URL: URLS.CISCO.BASE_URL,
    API_VERSION: URLS.CISCO.API_VERSION,
    USERNAME: 'USE_SECRETS_SERVICE', // Placeholder - use secretsService instead
    PASSWORD: 'USE_SECRETS_SERVICE' // Placeholder - use secretsService instead
  },
  MONITORING: URLS.MONITORING,
  DEVICE_MANAGEMENT: CONFIG.DEVICE_MANAGEMENT
} as const;

export const getEndpoints = () => {
  console.warn('getEndpoints() is deprecated. Use URLS and secretsService instead.');
  return ENDPOINTS;
};
