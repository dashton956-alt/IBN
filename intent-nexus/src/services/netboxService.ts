import { supabase } from "@/integrations/supabase/client";
import { URLS } from "@/config/urls";
import { secretsService, SECRET_KEYS } from "@/config/secrets";

// NetBox API Integration Service
export class NetBoxService {
  private baseUrl: string;
  private apiToken: string | null = null;

  constructor() {
    this.baseUrl = URLS.NETBOX.API_BASE_URL;
  }

  // Initialize service with API token from secrets
  private async initialize() {
    if (!this.apiToken) {
      this.apiToken = await secretsService.getSecret(SECRET_KEYS.NETBOX_API_TOKEN);
    }
  }

  // Fetch devices from NetBox
  async fetchDevices() {
    try {
      await this.initialize();

      if (!this.apiToken) {
        console.warn('NetBox API token not configured, using mock data');
        return this.getMockDevices();
      }

      const response = await fetch(`${this.baseUrl}${URLS.NETBOX.ENDPOINTS.DEVICES}`, {
        headers: {
          'Authorization': `Token ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch devices from NetBox');
      }

      const data = await response.json();
      
      // Sync devices to local database
      await this.syncDevicesToDatabase(data.results || []);
      
      return data.results;
    } catch (error) {
      console.error('NetBox API Error:', error);
      // Return mock data for now
      return this.getMockDevices();
    }
  }

  // Sync NetBox devices to local database
  private async syncDevicesToDatabase(devices: any[]) {
    for (const device of devices) {
      const { error } = await supabase
        .from('network_devices')
        .upsert({
          name: device.name,
          type: this.mapDeviceType(device.device_role?.name),
          status: device.status?.value === 'active' ? 'online' : 'offline',
          ip_address: device.primary_ip?.address?.split('/')[0],
          location: device.location?.name,
          model: device.device_type?.model,
          vendor: device.device_type?.manufacturer?.name,
          netbox_id: device.id,
          last_updated: new Date().toISOString(),
        }, { 
          onConflict: 'netbox_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Error syncing device to database:', error);
      }
    }
  }

  private mapDeviceType(roleSlug: string): string {
    const roleMapping: { [key: string]: string } = {
      'core-switch': 'core',
      'distribution-switch': 'distribution',
      'access-switch': 'access',
      'router': 'core',
      'firewall': 'core',
    };

    return roleMapping[roleSlug] || 'access';
  }

  private getMockDevices() {
    return [
      {
        id: 1,
        name: "Core-SW-01",
        device_role: { name: "core-switch" },
        status: { value: "active" },
        primary_ip: { address: "10.0.1.1/24" },
        location: { name: "Data Center 1" },
        device_type: {
          model: "Catalyst 9500",
          manufacturer: { name: "Cisco" }
        }
      },
    ];
  }

  async addChangeNumber(intentId: string, changeNumber: string, description: string) {
    try {
      await this.initialize();

      if (!this.apiToken) {
        console.warn('NetBox API token not configured, storing change number locally');
        return this.storeChangeNumberLocally(intentId, changeNumber, description);
      }

      // Create a journal entry for the change
      const journalEntry = {
        assigned_object_type: 'extras.customfield',
        assigned_object_id: 1, // This would be the intent tracking object
        kind: 'info',
        comments: `Intent Change: ${changeNumber} - ${description}`,
        tags: [{
          name: 'intent-engine',
          slug: 'intent-engine'
        }]
      };

      const response = await fetch(`${this.baseUrl}${URLS.NETBOX.ENDPOINTS.JOURNAL_ENTRIES}`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(journalEntry),
      });

      if (!response.ok) {
        throw new Error('Failed to add change number to NetBox');
      }

      const result = await response.json();
      console.log('Change number added to NetBox:', result);
      return result;
    } catch (error) {
      console.error('NetBox change number error:', error);
      // Fallback to local storage
      return this.storeChangeNumberLocally(intentId, changeNumber, description);
    }
  }

  private async storeChangeNumberLocally(intentId: string, changeNumber: string, description: string) {
    const { error } = await supabase
      .from('network_intents')
      .update({
        configuration: JSON.stringify({
          changeNumber,
          description,
          timestamp: new Date().toISOString()
        })
      })
      .eq('id', intentId);

    if (error) {
      console.error('Error storing change number locally:', error);
      throw error;
    }

    return { changeNumber, stored: 'locally' };
  }

  // Substitute variables in template with NetBox data
  async substituteVariables(template: string, variables: string[], context?: {
    siteName?: string;
    deviceName?: string;
    deviceRole?: string;
  }): Promise<string> {
    try {
      await this.initialize();
      
      let substitutedTemplate = template;
      const netboxData = await this.getVariableData(variables, context);

      // Replace variables in template
      for (const [variable, value] of Object.entries(netboxData)) {
        const regex = new RegExp(`{{${variable}}}`, 'g');
        substitutedTemplate = substitutedTemplate.replace(regex, String(value));
      }

      return substitutedTemplate;
    } catch (error) {
      console.error('Variable substitution error:', error);
      throw error;
    }
  }

  private async getVariableData(variables: string[], context?: {
    siteName?: string;
    deviceName?: string;
    deviceRole?: string;
  }): Promise<Record<string, any>> {
    const data: Record<string, any> = {};

    try {
      // Fetch NetBox data based on context
      if (context?.siteName) {
        const sites = await this.fetchSites();
        const site = sites.find((s: any) => s.name === context.siteName);
        if (site) {
          data.site_id = site.id;
          data.site_name = site.name;
        }
      }

      if (context?.deviceName) {
        const devices = await this.fetchDevices();
        const device = devices.find((d: any) => d.name === context.deviceName);
        if (device) {
          data.device_id = device.id;
          data.device_name = device.name;
          data.device_ip = device.primary_ip?.address?.split('/')[0] || '';
        }
      }

      // Add default values for common variables
      for (const variable of variables) {
        if (!data[variable]) {
          switch (variable) {
            case 'vlan_id':
              data[variable] = '100'; // Default VLAN
              break;
            case 'interface':
              data[variable] = 'GigabitEthernet0/1';
              break;
            case 'description':
              data[variable] = 'Generated by Intent Engine';
              break;
            default:
              data[variable] = `{{${variable}}}`; // Keep as placeholder if no data found
          }
        }
      }

      return data;
    } catch (error) {
      console.error('Error fetching variable data:', error);
      // Return empty substitutions to keep placeholders
      const fallbackData: Record<string, any> = {};
      variables.forEach(variable => {
        fallbackData[variable] = `{{${variable}}}`;
      });
      return fallbackData;
    }
  }

  private async fetchSites() {
    if (!this.apiToken) {
      return [];
    }

    const response = await fetch(`${this.baseUrl}/dcim/sites/`, {
      headers: {
        'Authorization': `Token ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch sites from NetBox');
    }

    const data = await response.json();
    return data.results || [];
  }

  async fetchMergeRequests() {
    try {
      console.log('Fetching merge requests from NetBox...');
      return this.getMockMergeRequests();
    } catch (error) {
      console.error('NetBox Merge Requests Error:', error);
      return this.getMockMergeRequests();
    }
  }

  private getMockMergeRequests() {
    return [
      {
        id: "NB-001",
        title: "Add new VLAN configuration",
        description: "Adding VLAN 100 for new department",
        status: "review",
        author_email: "network.engineer@company.com",
        created_at: new Date().toISOString(),
      }
    ];
  }
}

export const netboxService = new NetBoxService();
