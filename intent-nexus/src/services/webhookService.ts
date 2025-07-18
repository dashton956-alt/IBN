
import { supabase } from "@/integrations/supabase/client";
import { WebhookConfig } from "@/types/networkOperations";

export class WebhookService {
  private webhooks: WebhookConfig[] = [];

  async registerWebhook(config: Omit<WebhookConfig, 'id'>): Promise<WebhookConfig> {
    const webhook: WebhookConfig = {
      ...config,
      id: crypto.randomUUID()
    };

    this.webhooks.push(webhook);
    await this.saveWebhooks();
    
    return webhook;
  }

  async triggerWebhooks(event: string, data: any): Promise<void> {
    const relevantWebhooks = this.webhooks.filter(
      webhook => webhook.active && webhook.events.includes(event)
    );

    const promises = relevantWebhooks.map(webhook => this.callWebhook(webhook, event, data));
    await Promise.allSettled(promises);
  }

  async getWebhooks(): Promise<WebhookConfig[]> {
    await this.loadWebhooks();
    return this.webhooks;
  }

  async updateWebhook(id: string, updates: Partial<WebhookConfig>): Promise<WebhookConfig | null> {
    const index = this.webhooks.findIndex(w => w.id === id);
    if (index === -1) return null;

    this.webhooks[index] = { ...this.webhooks[index], ...updates };
    await this.saveWebhooks();
    
    return this.webhooks[index];
  }

  async deleteWebhook(id: string): Promise<boolean> {
    const index = this.webhooks.findIndex(w => w.id === id);
    if (index === -1) return false;

    this.webhooks.splice(index, 1);
    await this.saveWebhooks();
    
    return true;
  }

  private async callWebhook(webhook: WebhookConfig, event: string, data: any): Promise<void> {
    try {
      const payload = {
        event,
        data,
        timestamp: new Date().toISOString(),
        webhook_id: webhook.id
      };

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhook.secret && { 'X-Webhook-Secret': webhook.secret })
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook call failed: ${response.statusText}`);
      }

      // Update last triggered time
      webhook.lastTriggered = new Date().toISOString();
      await this.saveWebhooks();

    } catch (error) {
      console.error(`Failed to call webhook ${webhook.name}:`, error);
    }
  }

  private async saveWebhooks(): Promise<void> {
    localStorage.setItem('webhooks', JSON.stringify(this.webhooks));
  }

  private async loadWebhooks(): Promise<void> {
    const stored = localStorage.getItem('webhooks');
    if (stored) {
      this.webhooks = JSON.parse(stored);
    }
  }
}

export const webhookService = new WebhookService();
