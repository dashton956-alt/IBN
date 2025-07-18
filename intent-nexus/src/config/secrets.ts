
import { supabase } from "@/integrations/supabase/client";

// Centralized secrets management service
class SecretsService {
  private cache: Map<string, string> = new Map();

  async getSecret(key: string): Promise<string | null> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key) || null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('get-secret', {
        body: { key }
      });

      if (error) {
        console.error(`Error retrieving secret ${key}:`, error);
        return null;
      }

      if (data?.value) {
        // Cache the secret for this session
        this.cache.set(key, data.value);
        return data.value;
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
