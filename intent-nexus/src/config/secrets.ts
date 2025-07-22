
import axios from "axios";

// Centralized secrets management service
class SecretsService {
  private cache: Map<string, string> = new Map();

  async getSecret(key: string): Promise<string | null> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key) || null;
    }

    try {
      const response = await axios.post("http://secrets-docker:8000/get-secret", { key });
      if (response.data?.value) {
        this.cache.set(key, response.data.value);
        return response.data.value;
      }
      return null;
    } catch (error) {
      console.error(`Error retrieving secret ${key}:`, error);
      return null;
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

export const secretsService = new SecretsService();

// Secret keys configuration
export const SECRET_KEYS = {
  NSO_API_KEY: 'NSO_API_KEY',
  NSO_USERNAME: 'NSO_USERNAME', 
  NSO_PASSWORD: 'NSO_PASSWORD',
  CISCO_API_KEY: 'CISCO_API_KEY',
  NETBOX_API_TOKEN: 'NETBOX_API_TOKEN',
  GITLAB_TOKEN: 'GITLAB_TOKEN',
  OPENAI_API_KEY: 'OPENAI_API_KEY'
} as const;
