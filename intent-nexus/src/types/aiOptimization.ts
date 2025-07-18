
export interface PerformanceIssue {
  title: string;
  description: string;
  impact: 'Low' | 'Medium' | 'High';
}

export interface SecurityIssue {
  title: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface NetBoxIssue {
  title: string;
  description: string;
  category: 'Configuration' | 'Data Quality' | 'Relationships' | 'Standards';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  affectedObjects: string[];
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  impact: string;
  category: 'Performance' | 'Security' | 'NetBox' | 'General';
  estimatedSavings?: string;
}

export interface AIAnalysis {
  performanceScore: number;
  securityScore: number;
  netboxScore: number;
  optimizationPotential: number;
  summary: string;
  performanceIssues: PerformanceIssue[];
  securityIssues: SecurityIssue[];
  netboxIssues: NetBoxIssue[];
  recommendations: Recommendation[];
  timestamp: string;
}

export interface UseAIOptimizationReturn {
  analysis: AIAnalysis | null;
  isAnalyzing: boolean;
  error: string | null;
  runOptimization: () => Promise<void>;
  applyOptimization: (recommendationId: string) => Promise<void>;
  generateConfiguration: (
    intentType: string,
    description: string,
    naturalLanguageInput: string,
    context?: {
      siteName?: string;
      deviceName?: string;
      deviceRole?: string;
    }
  ) => Promise<{
    configuration: string;
    template: string;
    variables: string[];
    description: string;
    deviceTypes: string[];
  }>;
}
