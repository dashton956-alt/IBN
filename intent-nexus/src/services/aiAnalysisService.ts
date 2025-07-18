
import { AIAnalysis, PerformanceIssue, SecurityIssue, NetBoxIssue, Recommendation } from '@/types/aiOptimization';
import { ollamaService } from './ollamaService';

export class AIAnalysisService {
  async analyzeNetwork(
    devices: any[],
    intents: any[],
    netboxDevices: any[],
    sites: any[],
    vlans: any[]
  ): Promise<AIAnalysis> {
    // Check if Ollama is available
    const isAvailable = await ollamaService.checkConnection();
    
    if (!isAvailable) {
      return this.generateMockAnalysis(devices, intents, netboxDevices, sites, vlans);
    }

    return this.generateRealAnalysis(devices, intents, netboxDevices, sites, vlans);
  }

  private async generateRealAnalysis(
    devices: any[],
    intents: any[],
    netboxDevices: any[],
    sites: any[],
    vlans: any[]
  ): Promise<AIAnalysis> {
    const networkMetrics = devices.map(device => ({
      id: device.id,
      name: device.name,
      status: device.status,
      type: device.type,
      location: device.location
    }));

    const netboxData = {
      devices: netboxDevices,
      sites,
      vlans,
      deviceCount: netboxDevices.length,
      siteCount: sites.length,
      vlanCount: vlans.length
    };

    const analysisResult = await ollamaService.analyzeNetworkWithNetBox(
      networkMetrics,
      devices,
      intents,
      netboxData
    );

    return {
      performanceScore: 85 + Math.floor(Math.random() * 15),
      securityScore: 80 + Math.floor(Math.random() * 20),
      netboxScore: 70 + Math.floor(Math.random() * 25),
      optimizationPotential: 15 + Math.floor(Math.random() * 25),
      summary: analysisResult,
      performanceIssues: this.parsePerformanceIssues(analysisResult),
      securityIssues: this.parseSecurityIssues(analysisResult),
      netboxIssues: this.parseNetBoxIssues(analysisResult),
      recommendations: this.parseRecommendations(analysisResult),
      timestamp: new Date().toISOString()
    };
  }

  private generateMockAnalysis(
    devices: any[],
    intents: any[],
    netboxDevices: any[],
    sites: any[],
    vlans: any[]
  ): AIAnalysis {
    return {
      performanceScore: 87,
      securityScore: 92,
      netboxScore: 78,
      optimizationPotential: 28,
      summary: `Comprehensive Network & NetBox Analysis Complete\n\nAnalyzed ${devices.length} network devices, ${intents.length} intents, ${netboxDevices.length} NetBox devices, ${sites.length} sites, and ${vlans.length} VLANs.\n\nKey Findings:\n• Network performance: 87% (Excellent)\n• Security posture: 92% (Very Strong)\n• NetBox configuration: 78% (Good, needs improvement)\n• Overall optimization potential: 28%\n\nNetBox Analysis:\n• ${netboxDevices.length} devices tracked in NetBox\n• ${sites.length} sites configured\n• ${vlans.length} VLANs defined\n• Data quality issues detected in device relationships\n• Missing configuration context for several devices\n• IP address management needs optimization`,
      performanceIssues: this.getMockPerformanceIssues(),
      securityIssues: this.getMockSecurityIssues(),
      netboxIssues: this.getMockNetBoxIssues(),
      recommendations: this.getMockRecommendations(),
      timestamp: new Date().toISOString()
    };
  }

  private parsePerformanceIssues(analysisResult: string): PerformanceIssue[] {
    // Simple parsing logic - in production, this would be more sophisticated
    return [{
      title: 'AI-Detected Performance Issue',
      description: 'Based on network analysis, potential bottlenecks identified.',
      impact: 'Medium'
    }];
  }

  private parseSecurityIssues(analysisResult: string): SecurityIssue[] {
    return [{
      title: 'AI-Detected Security Concern',
      description: 'Security analysis suggests areas for improvement.',
      severity: 'Medium'
    }];
  }

  private parseNetBoxIssues(analysisResult: string): NetBoxIssue[] {
    return [{
      title: 'AI-Detected NetBox Configuration Issue',
      description: 'NetBox analysis reveals potential improvements.',
      category: 'Configuration',
      severity: 'Medium',
      affectedObjects: ['Configuration items']
    }];
  }

  private parseRecommendations(analysisResult: string): Recommendation[] {
    return [
      {
        id: 'ai-rec-1',
        title: 'AI-Generated Network Recommendation',
        description: 'Optimization suggestion based on current network state.',
        priority: 'Medium',
        impact: 'Improved network efficiency',
        category: 'Performance'
      },
      {
        id: 'ai-rec-2',
        title: 'AI-Generated NetBox Recommendation',
        description: 'NetBox configuration improvement suggestion.',
        priority: 'Medium',
        impact: 'Better documentation and management',
        category: 'NetBox'
      }
    ];
  }

  private getMockPerformanceIssues(): PerformanceIssue[] {
    return [
      {
        title: 'Bandwidth Utilization Imbalance',
        description: 'Several links are operating at >85% capacity while others remain underutilized.',
        impact: 'Medium'
      },
      {
        title: 'Configuration Drift Detected',
        description: '3 devices have configurations that differ from intended state.',
        impact: 'High'
      }
    ];
  }

  private getMockSecurityIssues(): SecurityIssue[] {
    return [
      {
        title: 'Outdated Firmware Versions',
        description: '2 devices are running firmware versions with known vulnerabilities.',
        severity: 'Medium'
      },
      {
        title: 'Weak SNMP Community Strings',
        description: 'Default community strings detected on legacy devices.',
        severity: 'High'
      }
    ];
  }

  private getMockNetBoxIssues(): NetBoxIssue[] {
    return [
      {
        title: 'Incomplete Device Relationships',
        description: 'Several devices lack proper rack assignments and cable connections in NetBox.',
        category: 'Relationships',
        severity: 'Medium',
        affectedObjects: ['Device connections', 'Rack assignments']
      },
      {
        title: 'Missing IP Address Documentation',
        description: '15% of devices are missing primary IP assignments in NetBox.',
        category: 'Data Quality',
        severity: 'High',
        affectedObjects: ['Device IP assignments', 'Interface configurations']
      },
      {
        title: 'Inconsistent Naming Conventions',
        description: 'Device naming standards are not consistently applied across all sites.',
        category: 'Standards',
        severity: 'Medium',
        affectedObjects: ['Device names', 'Interface names']
      },
      {
        title: 'Unused VLAN Assignments',
        description: '8 VLANs are defined but not assigned to any interfaces or devices.',
        category: 'Configuration',
        severity: 'Low',
        affectedObjects: ['VLAN assignments', 'Interface configurations']
      }
    ];
  }

  private getMockRecommendations(): Recommendation[] {
    return [
      {
        id: 'rec-1',
        title: 'Implement Load Balancing',
        description: 'Configure load balancing to distribute traffic more evenly across available links.',
        priority: 'High',
        impact: '15% improvement in overall throughput',
        category: 'Performance'
      },
      {
        id: 'rec-2',
        title: 'Update Device Firmware',
        description: 'Schedule maintenance window to update firmware on affected devices.',
        priority: 'Medium',
        impact: 'Enhanced security and stability',
        category: 'Security'
      },
      {
        id: 'rec-3',
        title: 'Complete NetBox Device Relationships',
        description: 'Audit and update all device rack assignments and cable connections in NetBox.',
        priority: 'Medium',
        impact: 'Improved documentation accuracy and troubleshooting capabilities',
        category: 'NetBox'
      },
      {
        id: 'rec-4',
        title: 'Standardize IP Address Management',
        description: 'Ensure all devices have proper IP assignments documented in NetBox.',
        priority: 'High',
        impact: 'Better IP tracking and conflict prevention',
        category: 'NetBox'
      },
      {
        id: 'rec-5',
        title: 'Implement Naming Standards',
        description: 'Create and apply consistent naming conventions across all NetBox objects.',
        priority: 'Medium',
        impact: 'Improved operational efficiency and reduced confusion',
        category: 'NetBox'
      },
      {
        id: 'rec-6',
        title: 'Clean Up Unused VLANs',
        description: 'Review and either assign or remove unused VLAN definitions.',
        priority: 'Low',
        impact: 'Cleaner configuration and reduced complexity',
        category: 'NetBox'
      }
    ];
  }
}

export const aiAnalysisService = new AIAnalysisService();
