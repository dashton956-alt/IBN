
import { toast } from "@/hooks/use-toast";
import { NETBOX_API_URL } from "@/config/urlsCentral";
import { secretsService, SECRET_KEYS } from "@/config/secrets";

// Django API Service for backend integration
export class DjangoApiService {
  private baseUrl: string;
  private token: string | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    this.baseUrl = NETBOX_API_URL;
    console.log('DjangoApiService initialized with baseUrl:', this.baseUrl);
  }

  async getNetboxToken(): Promise<string | null> {
    return await secretsService.getSecret(SECRET_KEYS.NETBOX_API_TOKEN);
  }

  // Set authentication token
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('django_token', token);
    console.log('Token set successfully');
  }

  // Get stored token
  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('django_token');
    }
    return this.token;
  }

  // Clear token
  clearToken() {
    this.token = null;
    localStorage.removeItem('django_token');
    console.log('Token cleared');
  }

  // Generic API request method with timeout and retry logic
  private async request<T>(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();
    const maxRetries = 2;
    const timeout = 10000; // 10 seconds

    console.log(`API Request: ${options.method || 'GET'} ${url}`, { retryCount });

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeout);
    });

    try {
      const response = await Promise.race([
        fetch(url, config),
        timeoutPromise
      ]);
      
      console.log(`API Response: ${response.status} ${response.statusText}`, { url });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Authentication failed, clearing token');
          this.clearToken();
          throw new Error('Authentication required');
        }
        
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // Use default error message if JSON parsing fails
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('API Response data:', data);
      return data;
    } catch (error: any) {
      console.error(`API request failed: ${endpoint}`, error);
      
      // Retry logic for network errors (not auth errors)
      if (retryCount < maxRetries && !error.message.includes('Authentication required')) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`Retrying request after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.request(endpoint, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  // Authentication methods
  async login(email: string, password: string) {
    console.log('Attempting login for:', email);
    const response = await this.request<{
      user: any;
      access: string;
      refresh: string;
    }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    this.setToken(response.access);
    console.log('Login successful');
    return response;
  }

  async register(email: string, password: string, fullName?: string) {
    console.log('Attempting registration for:', email);
    const response = await this.request<{
      user: any;
      access: string;
      refresh: string;
    }>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({ 
        email, 
        password,
        full_name: fullName 
      }),
    });

    this.setToken(response.access);
    console.log('Registration successful');
    return response;
  }

  async getProfile() {
    console.log('Fetching user profile...');
    return this.request<any>('/auth/profile/');
  }

  // Network Devices
  async getNetworkDevices() {
    return this.request<any[]>('/devices/');
  }

  async createNetworkDevice(deviceData: any) {
    return this.request<any>('/devices/', {
      method: 'POST',
      body: JSON.stringify(deviceData),
    });
  }

  async updateNetworkDevice(deviceId: string, deviceData: any) {
    return this.request<any>(`/devices/${deviceId}/`, {
      method: 'PUT',
      body: JSON.stringify(deviceData),
    });
  }

  // Network Intents
  async getNetworkIntents() {
    return this.request<any[]>('/intents/');
  }

  async createNetworkIntent(intentData: any) {
    return this.request<any>('/intents/', {
      method: 'POST',
      body: JSON.stringify(intentData),
    });
  }

  async updateNetworkIntent(intentId: string, intentData: any) {
    return this.request<any>(`/intents/${intentId}/`, {
      method: 'PUT',
      body: JSON.stringify(intentData),
    });
  }

  // Network Metrics
  async getNetworkMetrics() {
    return this.request<any[]>('/metrics/');
  }

  async createNetworkMetric(metricData: any) {
    return this.request<any>('/metrics/', {
      method: 'POST',
      body: JSON.stringify(metricData),
    });
  }

  // Network Alerts
  async getNetworkAlerts() {
    return this.request<any[]>('/alerts/');
  }

  async updateNetworkAlert(alertId: string, alertData: any) {
    return this.request<any>(`/alerts/${alertId}/`, {
      method: 'PUT',
      body: JSON.stringify(alertData),
    });
  }

  // Merge Requests
  async getMergeRequests() {
    return this.request<any[]>('/merge-requests/');
  }

  async createMergeRequest(mrData: any) {
    return this.request<any>('/merge-requests/', {
      method: 'POST',
      body: JSON.stringify(mrData),
    });
  }

  async updateMergeRequest(mrId: string, mrData: any) {
    return this.request<any>(`/merge-requests/${mrId}/`, {
      method: 'PUT',
      body: JSON.stringify(mrData),
    });
  }

  // Activity Logs
  async getActivityLogs() {
    return this.request<any[]>('/activity/');
  }
}

export const djangoApiService = new DjangoApiService();
