
import { supabase } from "@/integrations/supabase/client";
import { ScheduledIntent } from "@/types/networkOperations";
import { webhookService } from "./webhookService";

export class SchedulingService {
  private scheduledIntents: ScheduledIntent[] = [];
  private schedulerRunning = false;

  async scheduleIntent(intentId: string, scheduledFor: string, notes?: string): Promise<ScheduledIntent> {
    const scheduledIntent: ScheduledIntent = {
      id: crypto.randomUUID(),
      intentId,
      scheduledFor,
      status: 'pending',
      createdBy: (await supabase.auth.getUser()).data.user?.id || 'unknown',
      notes
    };

    this.scheduledIntents.push(scheduledIntent);
    await this.saveScheduledIntents();

    // Start scheduler if not running
    if (!this.schedulerRunning) {
      this.startScheduler();
    }

    return scheduledIntent;
  }

  async getScheduledIntents(): Promise<ScheduledIntent[]> {
    await this.loadScheduledIntents();
    return this.scheduledIntents.filter(si => si.status !== 'completed');
  }

  async cancelScheduledIntent(id: string): Promise<boolean> {
    const index = this.scheduledIntents.findIndex(si => si.id === id);
    if (index === -1) return false;

    this.scheduledIntents[index].status = 'cancelled';
    await this.saveScheduledIntents();
    
    return true;
  }

  private startScheduler(): void {
    this.schedulerRunning = true;
    
    const checkSchedule = async () => {
      const now = new Date();
      const dueIntents = this.scheduledIntents.filter(
        si => si.status === 'pending' && new Date(si.scheduledFor) <= now
      );

      for (const scheduledIntent of dueIntents) {
        await this.executeScheduledIntent(scheduledIntent);
      }

      // Continue checking every minute
      setTimeout(checkSchedule, 60000);
    };

    checkSchedule();
  }

  private async executeScheduledIntent(scheduledIntent: ScheduledIntent): Promise<void> {
    try {
      scheduledIntent.status = 'running';
      await this.saveScheduledIntents();

      // Get the intent
      const { data: intent, error } = await supabase
        .from('network_intents')
        .select('*')
        .eq('id', scheduledIntent.intentId)
        .single();

      if (error) throw error;

      // Update intent status to deploying
      await supabase
        .from('network_intents')
        .update({ status: 'deploying' })
        .eq('id', scheduledIntent.intentId);

      // Trigger webhook for scheduled deployment
      await webhookService.triggerWebhooks('intent.scheduled_deployment', {
        intentId: scheduledIntent.intentId,
        scheduledIntent,
        intent
      });

      scheduledIntent.status = 'completed';
      
    } catch (error) {
      console.error('Failed to execute scheduled intent:', error);
      scheduledIntent.status = 'failed';
    }

    await this.saveScheduledIntents();
  }

  private async saveScheduledIntents(): Promise<void> {
    localStorage.setItem('scheduledIntents', JSON.stringify(this.scheduledIntents));
  }

  private async loadScheduledIntents(): Promise<void> {
    const stored = localStorage.getItem('scheduledIntents');
    if (stored) {
      this.scheduledIntents = JSON.parse(stored);
    }
  }
}

export const schedulingService = new SchedulingService();
