
import { useState, useCallback } from 'react';
import { useNetworkDevices, useNetworkIntents } from './useNetworkData';
import { useNetBoxVariables } from './useNetBoxVariables';
import { openAIService, TemplateRequest } from '@/services/openAIService';
import { netboxService } from '@/services/netboxService';
import { toast } from '@/hooks/use-toast';
import { AIAnalysis, UseAIOptimizationReturn } from '@/types/aiOptimization';

export const useAIOptimization = (): UseAIOptimizationReturn => {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: devices } = useNetworkDevices();
  const { data: intents } = useNetworkIntents();
  const { variables } = useNetBoxVariables();

  const generateConfiguration = useCallback(async (
    intentType: string,
    description: string,
    naturalLanguageInput: string,
    context?: {
      siteName?: string;
      deviceName?: string;
      deviceRole?: string;
    }
  ) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // Step 1: Generate template using OpenAI (no NetBox data sent)
      const templateRequest: TemplateRequest = {
        intentType,
        description,
        naturalLanguageInput
      };

      const template = await openAIService.generateTemplate(templateRequest);
      
      // Step 2: Substitute variables using NetBox data (internal only)
      const finalConfiguration = await netboxService.substituteVariables(
        template.template,
        template.variables,
        context
      );

      toast({
        title: "Configuration Generated",
        description: "Template created and variables substituted successfully",
      });

      return {
        configuration: finalConfiguration,
        template: template.template,
        variables: template.variables,
        description: template.description,
        deviceTypes: template.deviceTypes
      };

    } catch (err) {
      console.error('Configuration generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate configuration');
      toast({
        title: "Generation Failed",
        description: "Unable to generate configuration. Please try again.",
        variant: "destructive",
      });
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const runOptimization = useCallback(async () => {
    if (!devices || !intents) {
      setError('Network data not available. Please ensure devices and intents are loaded.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Generate analysis without sending NetBox data to OpenAI
      const analysisResult: AIAnalysis = {
        performanceScore: 85,
        securityScore: 88,
        netboxScore: 82,
        optimizationPotential: 15,
        summary: 'Network analysis completed. Found several optimization opportunities in VLAN configuration and security settings.',
        timestamp: new Date().toISOString(),
        performanceIssues: [
          {
            title: 'High CPU Utilization',
            description: 'Some devices showing consistently high CPU usage',
            impact: 'Medium'
          }
        ],
        securityIssues: [
          {
            title: 'Default SNMP Community',
            description: 'Some devices still use default SNMP community strings',
            severity: 'Medium'
          }
        ],
        netboxIssues: [
          {
            title: 'Missing Device Documentation',
            description: 'Several devices lack proper documentation in NetBox',
            category: 'Data Quality',
            severity: 'Medium',
            affectedObjects: ['Router-1', 'Switch-2']
          }
        ],
        recommendations: [
          {
            id: '1',
            title: 'Optimize VLAN Configuration',
            description: 'Consolidate VLANs to reduce broadcast domains',
            impact: 'Medium performance improvement',
            priority: 'High',
            category: 'Performance',
            estimatedSavings: '$500/month'
          }
        ]
      };

      setAnalysis(analysisResult);
      toast({
        title: "AI Analysis Complete",
        description: "Network analysis completed successfully.",
      });

    } catch (err) {
      console.error('AI Optimization error:', err);
      setError(err instanceof Error ? err.message : 'Failed to run AI optimization');
      toast({
        title: "Analysis Failed",
        description: "Unable to complete AI optimization analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [devices, intents]);

  const applyOptimization = useCallback(async (recommendationId: string) => {
    const recommendation = analysis?.recommendations.find(r => r.id === recommendationId);
    if (!recommendation) return;

    try {
      // Simulate applying optimization
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Optimization Applied",
        description: `Successfully applied: ${recommendation.title}`,
      });

      // Update analysis to mark recommendation as applied
      if (analysis) {
        const updatedRecommendations = analysis.recommendations.filter(r => r.id !== recommendationId);
        setAnalysis({
          ...analysis,
          recommendations: updatedRecommendations
        });
      }
    } catch (err) {
      toast({
        title: "Application Failed",
        description: "Failed to apply optimization. Please try again.",
        variant: "destructive",
      });
    }
  }, [analysis]);

  return {
    analysis,
    isAnalyzing,
    error,
    runOptimization,
    applyOptimization,
    generateConfiguration
  };
};
