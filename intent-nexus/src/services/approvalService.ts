
import { supabase } from "@/integrations/supabase/client";
import { ApprovalWorkflow } from "@/types/networkOperations";
import { webhookService } from "./webhookService";

export class ApprovalService {
  async createApprovalWorkflow(intentId: string, requiredApprovals: number = 2): Promise<ApprovalWorkflow> {
    const workflow: ApprovalWorkflow = {
      id: crypto.randomUUID(),
      intentId,
      requiredApprovals,
      currentApprovals: 0,
      approvers: [],
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Store workflow
    await this.storeWorkflow(workflow);

    // Trigger webhook for approval request
    await webhookService.triggerWebhooks('workflow.approval_required', {
      workflow,
      intentId
    });

    return workflow;
  }

  async approveIntent(workflowId: string, approverId: string): Promise<ApprovalWorkflow | null> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow || workflow.status !== 'pending') return null;

    // Check if user already approved
    if (workflow.approvers.includes(approverId)) {
      throw new Error('User has already approved this intent');
    }

    // Add approval
    workflow.approvers.push(approverId);
    workflow.currentApprovals++;

    // Check if fully approved
    if (workflow.currentApprovals >= workflow.requiredApprovals) {
      workflow.status = 'approved';
      
      // Update intent status
      await supabase
        .from('network_intents')
        .update({ status: 'approved' })
        .eq('id', workflow.intentId);

      // Trigger webhook
      await webhookService.triggerWebhooks('workflow.approved', {
        workflow,
        intentId: workflow.intentId
      });
    }

    await this.storeWorkflow(workflow);
    return workflow;
  }

  async rejectIntent(workflowId: string, rejectorId: string, reason: string): Promise<ApprovalWorkflow | null> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow || workflow.status !== 'pending') return null;

    workflow.status = 'rejected';

    // Update intent status
    await supabase
      .from('network_intents')
      .update({ status: 'rejected' })
      .eq('id', workflow.intentId);

    // Trigger webhook
    await webhookService.triggerWebhooks('workflow.rejected', {
      workflow,
      intentId: workflow.intentId,
      reason,
      rejectedBy: rejectorId
    });

    await this.storeWorkflow(workflow);
    return workflow;
  }

  async getWorkflowsForUser(userId: string): Promise<ApprovalWorkflow[]> {
    // In a real implementation, this would query pending workflows
    // that the user is eligible to approve
    const allWorkflows = await this.getAllWorkflows();
    return allWorkflows.filter(w => w.status === 'pending');
  }

  private async storeWorkflow(workflow: ApprovalWorkflow): Promise<void> {
    const workflows = await this.getAllWorkflows();
    const index = workflows.findIndex(w => w.id === workflow.id);
    
    if (index >= 0) {
      workflows[index] = workflow;
    } else {
      workflows.push(workflow);
    }

    localStorage.setItem('approvalWorkflows', JSON.stringify(workflows));
  }

  private async getWorkflow(id: string): Promise<ApprovalWorkflow | null> {
    const workflows = await this.getAllWorkflows();
    return workflows.find(w => w.id === id) || null;
  }

  private async getAllWorkflows(): Promise<ApprovalWorkflow[]> {
    const stored = localStorage.getItem('approvalWorkflows');
    return stored ? JSON.parse(stored) : [];
  }
}

export const approvalService = new ApprovalService();
