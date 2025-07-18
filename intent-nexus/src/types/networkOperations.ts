
export interface ConfigurationRollback {
  id: string;
  intentId: string;
  previousConfiguration: string;
  rollbackReason: string;
  rolledBackAt: string;
  rolledBackBy: string;
}

export interface DryRunResult {
  id: string;
  intentId: string;
  validationResults: ValidationResult[];
  estimatedImpact: string;
  safetyScore: number;
  recommendations: string[];
  createdAt: string;
}

export interface ValidationResult {
  type: 'error' | 'warning' | 'info';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedDevices: string[];
}

export interface ScheduledIntent {
  id: string;
  intentId: string;
  scheduledFor: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdBy: string;
  notes?: string;
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  secret?: string;
  lastTriggered?: string;
}

export interface ApprovalWorkflow {
  id: string;
  intentId: string;
  requiredApprovals: number;
  currentApprovals: number;
  approvers: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}
