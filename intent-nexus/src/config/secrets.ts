
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
      // HashiCorp Vault HTTP API: assumes KV secrets engine at 'secret/'
      // VAULT_ADDR and VAULT_TOKEN should be set in environment or config
      const VAULT_ADDR = process.env.VAULT_ADDR || "http://localhost:8200";
      const VAULT_TOKEN = process.env.VAULT_TOKEN || "root";
      const url = `${VAULT_ADDR}/v1/secret/data/${key}`;
      const response = await axios.get(url, {
        headers: { "X-Vault-Token": VAULT_TOKEN }
      });
      const value = response.data?.data?.data?.value;
      if (value) {
        this.cache.set(key, value);
        return value;
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
