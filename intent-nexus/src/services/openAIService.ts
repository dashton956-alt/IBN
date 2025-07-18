
import { secretsService, SECRET_KEYS } from '@/config/secrets';

export interface TemplateRequest {
  intentType: string;
  description: string;
  naturalLanguageInput: string;
}

export interface ConfigurationTemplate {
  template: string;
  variables: string[];
  description: string;
  deviceTypes: string[];
}

class OpenAIService {
  private apiKey: string | null = null;

  private async initialize() {
    if (!this.apiKey) {
      this.apiKey = await secretsService.getSecret(SECRET_KEYS.OPENAI_API_KEY);
    }
  }

  async generateTemplate(request: TemplateRequest): Promise<ConfigurationTemplate> {
    await this.initialize();

    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are a network configuration template generator. Generate ONLY configuration templates with placeholder variables. 
    
Rules:
- Use {{variable_name}} syntax for variables
- Do NOT include any specific IP addresses, device names, or site-specific data
- Focus on the configuration structure and logic
- Return a JSON response with template, variables array, description, and deviceTypes array
- Keep variables generic like {{device_name}}, {{vlan_id}}, {{ip_address}}, etc.`;

    const userPrompt = `Generate a configuration template for:
Intent Type: ${request.intentType}
Description: ${request.description}
Requirements: ${request.naturalLanguageInput}

Return only a JSON object with this structure:
{
  "template": "configuration template with {{variables}}",
  "variables": ["variable1", "variable2"],
  "description": "what this template does",
  "deviceTypes": ["router", "switch"]
}`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      try {
        return JSON.parse(content);
      } catch (parseError) {
        throw new Error('Failed to parse OpenAI response as JSON');
      }
    } catch (error) {
      console.error('OpenAI template generation error:', error);
      throw error;
    }
  }
}

export const openAIService = new OpenAIService();
