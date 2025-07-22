import { NETBOX_API_URL, NETBOX_API_TOKEN, API_URLS } from '@/config/urlsCentral';

export interface NetBoxVariable {
  name: string;
  value: string;
  type: string;
  description?: string;
}

export interface NetBoxDevice {
  id: number;
  name: string;
  device_type: {
    model: string;
    manufacturer: { name: string };
  };
  device_role: { name: string; slug: string };
  site: { name: string; slug: string };
  rack?: { name: string };
  position?: number;
  status: { value: string; label: string };
  primary_ip4?: { address: string };
  primary_ip6?: { address: string };
  platform?: { name: string; slug: string };
  interfaces: Array<{
    name: string;
    type: { value: string; label: string };
    enabled: boolean;
    mtu?: number;
  }>;
  config_context: Record<string, any>;
}

export interface NetBoxSite {
  id: number;
  name: string;
  slug: string;
  status: { value: string; label: string };
  region?: { name: string };
  tenant?: { name: string };
  vlans: Array<{
    id: number;
    name: string;
    vid: number;
    status: { value: string; label: string };
  }>;
}

export interface NetBoxVLAN {
  id: number;
  name: string;
  vid: number;
  status: { value: string; label: string };
  site?: { name: string };
  tenant?: { name: string };
  role?: { name: string };
  description?: string;
}

class NetBoxGraphQLService {
  private apiToken: string = NETBOX_API_TOKEN;

  constructor() {
    // Uses centralized config from urlsCentral.ts
  }

  private async makeGraphQLQuery(query: string, variables?: Record<string, any>) {
    try {
      if (!this.apiToken) {
        throw new Error('NetBox API token not configured');
      }

      const response = await fetch(`${NETBOX_API_URL.replace('/api','')}/graphql`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: variables || {}
        }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL errors: ${data.errors.map((e: any) => e.message).join(', ')}`);
      }

      return data.data;
    } catch (error) {
      console.error('NetBox GraphQL Error:', error);
      throw error;
    }
  }

  private async makeRestAPICall(endpoint: string, params?: Record<string, any>) {
    try {
      if (!this.apiToken) {
        throw new Error('NetBox API token not configured');
      }

      const url = new URL(`${NETBOX_API_URL}${endpoint}`);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
          }
        });
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Token ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`REST API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || data;
    } catch (error) {
      console.error('NetBox REST API Error:', error);
      throw error;
    }
  }

  async getIntentVariables(intentContext?: {
    deviceName?: string;
    siteName?: string;
    vlanId?: number;
    deviceRole?: string;
  }): Promise<NetBoxVariable[]> {
    const variables: NetBoxVariable[] = [];

    try {
      const sites = await this.getSites();
      sites.forEach(site => {
        variables.push({
          name: `site_${site.slug}`,
          value: site.name,
          type: 'site',
          description: `Site: ${site.name}`
        });
      });

      const deviceRoles = await this.getDeviceRoles();
      deviceRoles.forEach(role => {
        variables.push({
          name: `device_role_${role.slug}`,
          value: role.name,
          type: 'device_role',
          description: `Device Role: ${role.name}`
        });
      });

      const vlans = await this.getVLANs();
      vlans.forEach(vlan => {
        variables.push({
          name: `vlan_${vlan.vid}`,
          value: vlan.name,
          type: 'vlan',
          description: `VLAN ${vlan.vid}: ${vlan.name}`
        });
      });

      if (intentContext?.siteName || intentContext?.deviceRole) {
        const devices = await this.getDevices({
          site: intentContext.siteName,
          role: intentContext.deviceRole
        });
        
        devices.forEach(device => {
          variables.push({
            name: `device_${device.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            value: device.name,
            type: 'device',
            description: `Device: ${device.name} (${device.device_role.name})`
          });
          
          if (device.primary_ip4) {
            variables.push({
              name: `device_${device.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_ip`,
              value: device.primary_ip4.address.split('/')[0],
              type: 'ip_address',
              description: `${device.name} IP Address`
            });
          }
        });
      }

      return variables;
    } catch (error) {
      console.error('Error fetching intent variables:', error);
      return [];
    }
  }

  async getDevicesGraphQL(filters?: {
    site?: string;
    role?: string;
    name?: string;
  }): Promise<NetBoxDevice[]> {
    const query = `
      query GetDevices($site: String, $role: String, $name: String) {
        device_list(
          filters: {
            site: $site,
            device_role: $role,
            name: $name
          }
        ) {
          id
          name
          device_type {
            model
            manufacturer {
              name
            }
          }
          device_role {
            name
            slug
          }
          site {
            name
            slug
          }
          rack {
            name
          }
          position
          status {
            value
            label
          }
          primary_ip4 {
            address
          }
          primary_ip6 {
            address
          }
          platform {
            name
            slug
          }
          config_context
        }
      }
    `;

    try {
      const data = await this.makeGraphQLQuery(query, filters);
      return data.device_list || [];
    } catch (error) {
      console.log('GraphQL not available, falling back to REST API');
      return this.getDevices(filters);
    }
  }

  async getDevices(filters?: {
    site?: string;
    role?: string;
    name?: string;
  }): Promise<NetBoxDevice[]> {
    try {
      const params: Record<string, any> = {};
      if (filters?.site) params.site = filters.site;
      if (filters?.role) params.role = filters.role;
      if (filters?.name) params.name__icontains = filters.name;

      const devices = await this.makeRestAPICall(API_URLS.devices, params);
      return devices;
    } catch (error) {
      console.error('Error fetching devices:', error);
      return [];
    }
  }

  async getSites(): Promise<NetBoxSite[]> {
    try {
      return await this.makeRestAPICall(API_URLS.sites);
    } catch (error) {
      console.error('Error fetching sites:', error);
      return [];
    }
  }

  async getVLANs(siteId?: number): Promise<NetBoxVLAN[]> {
    try {
      const params = siteId ? { site_id: siteId } : {};
      return await this.makeRestAPICall(API_URLS.vlans, params);
    } catch (error) {
      console.error('Error fetching VLANs:', error);
      return [];
    }
  }

  async getDeviceRoles(): Promise<Array<{ name: string; slug: string }>> {
    try {
      return await this.makeRestAPICall(`${NETBOX_API_URL}/dcim/device-roles/`);
    } catch (error) {
      console.error('Error fetching device roles:', error);
      return [];
    }
  }

  async getDeviceInterfaces(deviceId: number): Promise<Array<{
    name: string;
    type: { value: string; label: string };
    enabled: boolean;
    mtu?: number;
    description?: string;
  }>> {
    try {
      return await this.makeRestAPICall(API_URLS.interfaces, { device_id: deviceId });
    } catch (error) {
      console.error('Error fetching device interfaces:', error);
      return [];
    }
  }

  async getDeviceConfigContext(deviceId: number): Promise<Record<string, any>> {
    try {
      const device = await this.makeRestAPICall(`${API_URLS.devices}${deviceId}/`);
      return device.config_context || {};
    } catch (error) {
      console.error('Error fetching device config context:', error);
      return {};
    }
  }

  async searchNetworkObjects(query: string): Promise<{
    devices: NetBoxDevice[];
    sites: NetBoxSite[];
    vlans: NetBoxVLAN[];
  }> {
    try {
      const [devices, sites, vlans] = await Promise.all([
        this.makeRestAPICall(API_URLS.devices, { q: query }),
        this.makeRestAPICall(API_URLS.sites, { q: query }),
        this.makeRestAPICall(API_URLS.vlans, { q: query })
      ]);

      return {
        devices: devices.slice(0, 10),
        sites: sites.slice(0, 10),
        vlans: vlans.slice(0, 10)
      };
    } catch (error) {
      console.error('Error searching network objects:', error);
      return { devices: [], sites: [], vlans: [] };
    }
  }
}

export const netboxGraphQLService = new NetBoxGraphQLService();
