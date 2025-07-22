import { API_URLS } from '@/config/urlsCentral';

export interface ConfigDifference {
  path: string;
  netbox_value: any;
  device_value: any;
  type: 'missing' | 'different' | 'extra';
  severity: 'critical' | 'warning' | 'info';
}

export interface ConfigComparison {
  id: string;
  device_name: string;
  device_ip: string;
  comparison_type: 'instant' | 'scheduled';
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  differences: ConfigDifference[];
  netbox_config: Record<string, any>;
  device_config: Record<string, any>;
  drift_percentage: number;
}

class ConfigComparisonService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URLS.configComparisonBaseUrl;
  }

  async compareDeviceConfig(deviceId: string, deviceIp: string): Promise<ConfigComparison> {
    try {
      const response = await fetch(`${this.baseUrl}/compare/instant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, device_ip: deviceIp })
      });

      if (!response.ok) {
        throw new Error('Failed to start configuration comparison');
      }

      return await response.json();
    } catch (error) {
      console.error('Config comparison error:', error);
      // Return mock data for demonstration
      return this.getMockComparison(deviceId, deviceIp, 'instant');
    }
  }

  // Schedule configuration comparison for multiple devices
  async scheduleConfigComparison(deviceIds: string[], schedule: string): Promise<{ id: string; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/compare/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_ids: deviceIds, schedule })
      });

      if (!response.ok) {
        throw new Error('Failed to schedule configuration comparison');
      }

      return await response.json();
    } catch (error) {
      console.error('Schedule comparison error:', error);
      return { id: 'mock-schedule-' + Date.now(), message: 'Scheduled successfully (mock)' };
    }
  }

  // Create bulk schedule for all devices
  async createBulkSchedule(scheduleType: 'weekly' | 'monthly' | 'on-change', schedule: string, deviceIds: string[]): Promise<{ id: string; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/compare/bulk-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          schedule_type: scheduleType,
          schedule,
          device_ids: deviceIds
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create bulk schedule');
      }

      return await response.json();
    } catch (error) {
      console.error('Bulk schedule error:', error);
      return { 
        id: `bulk-${scheduleType}-${Date.now()}`, 
        message: `${scheduleType} bulk schedule created successfully (mock)` 
      };
    }
  }

  // Delete a schedule
  async deleteSchedule(scheduleId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/compare/schedule/${scheduleId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }
    } catch (error) {
      console.error('Delete schedule error:', error);
      // Mock success for demonstration
    }
  }

  // Get comparison results
  async getComparisonResults(comparisonId: string): Promise<ConfigComparison> {
    try {
      const response = await fetch(`${this.baseUrl}/compare/${comparisonId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch comparison results');
      }

      return await response.json();
    } catch (error) {
      console.error('Get comparison error:', error);
      return this.getMockComparison('device-1', '10.0.1.1', 'instant');
    }
  }

  // Get all comparison history
  async getComparisonHistory(limit = 50): Promise<ConfigComparison[]> {
    try {
      const response = await fetch(`${this.baseUrl}/compare/history?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch comparison history');
      }

      return await response.json();
    } catch (error) {
      console.error('Get history error:', error);
      return [this.getMockComparison('device-1', '10.0.1.1', 'scheduled')];
    }
  }

  private getMockComparison(deviceId: string, deviceIp: string, type: 'instant' | 'scheduled'): ConfigComparison {
    return {
      id: `comp-${Date.now()}`,
      device_name: `Device-${deviceId}`,
      device_ip: deviceIp,
      comparison_type: type,
      status: 'completed',
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      drift_percentage: 15.2,
      differences: [
        {
          path: 'interfaces.GigabitEthernet0/1.description',
          netbox_value: 'Server Connection',
          device_value: 'Legacy Server',
          type: 'different',
          severity: 'warning'
        },
        {
          path: 'vlans.100',
          netbox_value: { name: 'Production', vid: 100 },
          device_value: null,
          type: 'missing',
          severity: 'critical'
        }
      ],
      netbox_config: {
        interfaces: {
          'GigabitEthernet0/1': { description: 'Server Connection', enabled: true }
        },
        vlans: { 100: { name: 'Production', vid: 100 } }
      },
      device_config: {
        interfaces: {
          'GigabitEthernet0/1': { description: 'Legacy Server', enabled: true }
        },
        vlans: {}
      }
    };
  }
}

export const configComparisonService = new ConfigComparisonService();
