
import { supabase } from "@/integrations/supabase/client";
import { API_URLS } from "@/config/urlsCentral";

export interface GitMergeRequest {
  id: string;
  title: string;
  description: string;
  branch: string;
  status: 'open' | 'merged' | 'closed';
  webUrl: string;
  changeReference: string;
}

export class GitService {
  private baseUrl: string;
  private token: string;
  private projectId: string;

  constructor() {
    // These should be configured via environment variables
    this.baseUrl = API_URLS.gitApiUrl;
    this.token = import.meta.env.VITE_GIT_TOKEN || '';
    this.projectId = import.meta.env.VITE_GIT_PROJECT_ID || '';
  }

  // Generate unique change reference
  generateChangeReference(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `CHG-${timestamp}-${random}`.toUpperCase();
  }

  // Create a new branch for the intent
  async createBranch(intentId: string, changeReference: string): Promise<string> {
    const branchName = `intent/${intentId}-${changeReference}`;
    
    try {
      const response = await fetch(`${this.baseUrl}/projects/${this.projectId}/repository/branches`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch: branchName,
          ref: 'main' // or 'master' depending on your default branch
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create branch: ${response.statusText}`);
      }

      return branchName;
    } catch (error) {
      console.error('Error creating branch:', error);
      throw error;
    }
  }

  // Create configuration file in the repository
  async createConfigurationFile(branchName: string, intentData: any, configuration: string): Promise<void> {
    const fileName = `configurations/${intentData.id}.yaml`;
    const fileContent = this.generateConfigurationContent(intentData, configuration);

    try {
      const response = await fetch(`${this.baseUrl}/projects/${this.projectId}/repository/files/${encodeURIComponent(fileName)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch: branchName,
          content: btoa(fileContent), // Base64 encode the content
          commit_message: `Add configuration for intent: ${intentData.title} [${intentData.changeReference}]`,
          encoding: 'base64'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create file: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error creating configuration file:', error);
      throw error;
    }
  }

  // Create merge request
  async createMergeRequest(branchName: string, intentData: any): Promise<GitMergeRequest> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${this.projectId}/merge_requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_branch: branchName,
          target_branch: 'main',
          title: `[${intentData.changeReference}] ${intentData.title}`,
          description: `
## Network Intent Configuration

**Intent ID:** ${intentData.id}
**Change Reference:** ${intentData.changeReference}
**Type:** ${intentData.intent_type}

### Description
${intentData.description}

### Natural Language Input
${intentData.natural_language_input}

### Generated Configuration
The configuration has been generated and added to \`configurations/${intentData.id}.yaml\`

---
*This merge request was automatically created by the Intent Orchestrator*
          `,
          remove_source_branch: true
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create merge request: ${response.statusText}`);
      }

      const mrData = await response.json();
      
      return {
        id: mrData.iid.toString(),
        title: mrData.title,
        description: mrData.description,
        branch: branchName,
        status: 'open',
        webUrl: mrData.web_url,
        changeReference: intentData.changeReference
      };
    } catch (error) {
      console.error('Error creating merge request:', error);
      throw error;
    }
  }

  // Check merge request status
  async getMergeRequestStatus(mrId: string): Promise<'open' | 'merged' | 'closed'> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${this.projectId}/merge_requests/${mrId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get merge request status: ${response.statusText}`);
      }

      const mrData = await response.json();
      return mrData.state === 'merged' ? 'merged' : mrData.state === 'closed' ? 'closed' : 'open';
    } catch (error) {
      console.error('Error getting merge request status:', error);
      return 'open'; // Default to open if we can't determine status
    }
  }

  // Store merge request in database
  async storeMergeRequest(intentId: string, mrData: GitMergeRequest): Promise<void> {
    const { error } = await supabase
      .from('merge_requests')
      .insert({
        intent_id: intentId,
        title: mrData.title,
        description: mrData.description,
        status: mrData.status,
        change_number: mrData.changeReference,
        netbox_url: mrData.webUrl, // Reusing this field for Git URL
        author_email: (await supabase.auth.getUser()).data.user?.email || 'system@company.com'
      });

    if (error) {
      console.error('Error storing merge request:', error);
      throw error;
    }
  }

  private generateConfigurationContent(intentData: any, configuration: string): string {
    return `# Network Intent Configuration
# Generated on: ${new Date().toISOString()}
# Change Reference: ${intentData.changeReference}

metadata:
  id: "${intentData.id}"
  title: "${intentData.title}"
  type: "${intentData.intent_type}"
  status: "${intentData.status}"
  change_reference: "${intentData.changeReference}"
  created_at: "${intentData.created_at}"
  description: |
    ${intentData.description}

natural_language_input: |
  ${intentData.natural_language_input}

configuration: |
${configuration.split('\n').map(line => `  ${line}`).join('\n')}
`;
  }
}

export const gitService = new GitService();
