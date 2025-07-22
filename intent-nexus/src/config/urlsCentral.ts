// Centralized frontend URL and variable definitions

export const NETBOX_API_URL = 'http://netbox:8000/api';
export const NETBOX_API_TOKEN = 'your-netbox-token';

export const API_URLS = {
  devices: `${NETBOX_API_URL}/dcim/devices/`,
  interfaces: `${NETBOX_API_URL}/dcim/interfaces/`,
  connections: `${NETBOX_API_URL}/dcim/cables/`,
  sites: `${NETBOX_API_URL}/dcim/sites/`,
  vlans: `${NETBOX_API_URL}/ipam/vlans/`,
  journalEntries: `${NETBOX_API_URL}/extras/journal-entries/`,
  gitApiUrl: 'https://gitlab.com/api/v4',
  configComparisonBaseUrl: 'http://localhost:8000/api/config-comparison',
  ciscoApiUrl: 'https://your-cisco-instance.com:8080/restconf',
  ciscoUsername: 'YOUR_CISCO_USERNAME',
  ciscoPassword: 'YOUR_CISCO_PASSWORD',
};

export { supabase } from '@/integrations/supabase/client';

// Example usage:
// import { API_URLS } from './urlsCentral';
// fetch(API_URLS.devices, ...)
