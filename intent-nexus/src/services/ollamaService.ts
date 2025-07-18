
import { getEndpoints } from '@/config/endpoints';

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
  };
}

class OllamaService {
  private endpoints = getEndpoints();

  async generateConfiguration(naturalLanguageInput: string, template: string, enabledTools: string[]): Promise<string> {
    const prompt = this.buildConfigurationPrompt(naturalLanguageInput, template, enabledTools);
    
    try {
      const response = await fetch(`${this.endpoints.OLLAMA.BASE_URL}${this.endpoints.OLLAMA.GENERATE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.endpoints.OLLAMA.DEFAULT_MODEL,
          prompt,
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.9,
          }
        } as OllamaRequest),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data: OllamaResponse = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error calling Ollama:', error);
      throw new Error('Failed to generate configuration with AI. Make sure Ollama is running.');
    }
  }

  async analyzeNetworkData(metrics: any[], devices: any[], intents: any[]): Promise<string> {
    const prompt = this.buildAnalyticsPrompt(metrics, devices, intents);
    
    try {
      const response = await fetch(`${this.endpoints.OLLAMA.BASE_URL}${this.endpoints.OLLAMA.GENERATE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.endpoints.OLLAMA.DEFAULT_MODEL,
          prompt,
          stream: false,
          options: {
            temperature: 0.4,
            top_p: 0.8,
          }
        } as OllamaRequest),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data: OllamaResponse = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error analyzing network data:', error);
      throw new Error('Failed to analyze network data with AI.');
    }
  }

  async analyzeNetworkWithNetBox(metrics: any[], devices: any[], intents: any[], netboxData: any): Promise<string> {
    const prompt = this.buildNetBoxAnalyticsPrompt(metrics, devices, intents, netboxData);
    
    try {
      const response = await fetch(`${this.endpoints.OLLAMA.BASE_URL}${this.endpoints.OLLAMA.GENERATE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.endpoints.OLLAMA.DEFAULT_MODEL,
          prompt,
          stream: false,
          options: {
            temperature: 0.4,
            top_p: 0.8,
          }
        } as OllamaRequest),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data: OllamaResponse = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error analyzing network data with NetBox:', error);
      throw new Error('Failed to analyze network data with NetBox using AI.');
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoints.OLLAMA.BASE_URL}${this.endpoints.OLLAMA.HEALTH_CHECK}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.endpoints.OLLAMA.BASE_URL}${this.endpoints.OLLAMA.HEALTH_CHECK}`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch {
      return [];
    }
  }

  private buildConfigurationPrompt(input: string, template: string, enabledTools: string[]): string {
    return `You are a network automation expert. Generate configuration code for the following tools: ${enabledTools.join(', ')}.

User Request: ${input}
Template Type: ${template || 'Auto-detect based on request'}

Requirements:
1. Generate working configuration code for each enabled tool
2. Include proper syntax and best practices
3. Add comments explaining each section
4. Ensure configurations are production-ready
5. Include error handling where appropriate

For each tool, provide:
- Clear section headers (## Tool Name Configuration)
- Proper indentation and formatting
- Inline comments explaining key parameters
- Validation checks where needed

Generate the complete configuration below:`;
  }

  private buildAnalyticsPrompt(metrics: any[], devices: any[], intents: any[]): string {
    const metricsCount = metrics.length;
    const devicesCount = devices.length;
    const intentsCount = intents.length;
    
    const recentMetrics = metrics.slice(0, 10);
    const recentIntents = intents.slice(0, 5);

    return `You are a network analytics expert. Analyze the following network data and provide actionable insights and recommendations.

Network Overview:
- Total Devices: ${devicesCount}
- Recent Metrics: ${metricsCount} data points
- Recent Intents: ${intentsCount} configurations

Recent Performance Data:
${JSON.stringify(recentMetrics, null, 2)}

Recent Configuration Intents:
${JSON.stringify(recentIntents, null, 2)}

Please provide:
1. **Performance Analysis**: Key trends and patterns
2. **Security Recommendations**: Potential vulnerabilities or improvements
3. **Optimization Suggestions**: Ways to improve network efficiency
4. **Anomaly Detection**: Any unusual patterns or concerning metrics
5. **Capacity Planning**: Recommendations for future growth
6. **Configuration Quality**: Assessment of recent intent implementations

Format your response in clear sections with specific, actionable recommendations.`;
  }

  private buildNetBoxAnalyticsPrompt(metrics: any[], devices: any[], intents: any[], netboxData: any): string {
    const metricsCount = metrics.length;
    const devicesCount = devices.length;
    const intentsCount = intents.length;
    const netboxDevicesCount = netboxData.deviceCount;
    const sitesCount = netboxData.siteCount;
    const vlansCount = netboxData.vlanCount;
    
    const recentMetrics = metrics.slice(0, 10);
    const recentIntents = intents.slice(0, 5);
    const netboxDevices = netboxData.devices.slice(0, 10);
    const netboxSites = netboxData.sites.slice(0, 5);

    return `You are a network analytics expert with specialized knowledge in NetBox IPAM/DCIM systems. Analyze the following comprehensive network and NetBox data to provide actionable insights and recommendations.

Network Overview:
- Live Network Devices: ${devicesCount}
- Network Metrics: ${metricsCount} data points
- Active Intents: ${intentsCount} configurations

NetBox IPAM/DCIM Overview:
- NetBox Devices: ${netboxDevicesCount}
- Sites: ${sitesCount}
- VLANs: ${vlansCount}

Recent Performance Data:
${JSON.stringify(recentMetrics, null, 2)}

Recent Configuration Intents:
${JSON.stringify(recentIntents, null, 2)}

NetBox Device Sample:
${JSON.stringify(netboxDevices, null, 2)}

NetBox Sites Sample:
${JSON.stringify(netboxSites, null, 2)}

Please provide comprehensive analysis including:

**Network Performance Analysis:**
1. Performance trends and bottlenecks
2. Configuration drift detection
3. Capacity utilization patterns

**Security Assessment:**
1. Vulnerability identification
2. Compliance gaps
3. Access control recommendations

**NetBox Configuration Analysis:**
1. **Data Quality Issues**: Missing or incomplete device information, IP assignments, relationships
2. **Documentation Gaps**: Incomplete device descriptions, missing cable connections, rack assignments
3. **IP Address Management**: Overlapping subnets, unused IP ranges, missing reservations
4. **VLAN Management**: Unused VLANs, missing VLAN assignments, inconsistent VLAN usage
5. **Device Relationships**: Missing or incorrect rack assignments, cable connections, power connections
6. **Naming Standards**: Inconsistent device/interface naming conventions
7. **Site Management**: Missing location details, incomplete site hierarchies
8. **Custom Fields**: Underutilized custom fields that could improve documentation

**NetBox Best Practices Recommendations:**
1. Data consistency improvements
2. Automation opportunities
3. Integration enhancements with live network
4. Reporting and compliance improvements

**Cross-System Analysis:**
1. Discrepancies between live network and NetBox documentation
2. Configuration drift between intended (NetBox) and actual (live) state
3. Opportunities for automated synchronization

Format your response with clear sections and specific, actionable recommendations for both network operations and NetBox configuration improvements.`;
  }
}

export const ollamaService = new OllamaService();
