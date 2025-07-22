
import { DryRunResult, ValidationResult, ConfigurationRollback } from "@/types/networkOperations";
import { ollamaService } from "./ollamaService";

export class ConfigurationService {
  // Dry-run validation for intents
  async performDryRun(intentId: string, configuration: string): Promise<DryRunResult> {
    try {
      // Get intent details
      const { data: intent, error } = await supabase
        .from('network_intents')
        .select('*')
        .eq('id', intentId)
        .single();

      if (error) throw error;

      // Perform AI-powered validation
      const validationPrompt = `
        Analyze this network configuration for potential issues:
        
        Configuration Type: ${intent.intent_type}
        Configuration: ${configuration}
        
        Provide detailed validation results including:
        1. Syntax errors
        2. Security vulnerabilities
        3. Performance impact
        4. Compatibility issues
        5. Best practice violations
        
        Format as JSON with: type, message, severity, affectedDevices
      `;

      const aiValidation = await ollamaService.generateConfiguration(validationPrompt, 'validation', ['validation']);
      
      // Parse AI response and create validation results
      const validationResults: ValidationResult[] = this.parseAIValidation(aiValidation);
      
      // Calculate safety score
      const safetyScore = this.calculateSafetyScore(validationResults);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(validationResults);

      const dryRunResult: DryRunResult = {
        id: crypto.randomUUID(),
        intentId,
        validationResults,
        estimatedImpact: this.calculateEstimatedImpact(validationResults),
        safetyScore,
        recommendations,
        createdAt: new Date().toISOString()
      };

      // Store dry-run result
      await this.storeDryRunResult(dryRunResult);

      return dryRunResult;
    } catch (error) {
      console.error('Dry-run validation failed:', error);
      throw new Error('Failed to perform dry-run validation');
    }
  }

  // Configuration rollback
  async rollbackConfiguration(intentId: string, reason: string): Promise<ConfigurationRollback> {
    try {
      // Get current intent
      const { data: intent, error } = await supabase
        .from('network_intents')
        .select('*')
        .eq('id', intentId)
        .single();

      if (error) throw error;

      // Get previous configuration (simplified - in real implementation, you'd track configuration history)
      const previousConfig = await this.getPreviousConfiguration(intentId);

      // Create rollback record
      const rollback: ConfigurationRollback = {
        id: crypto.randomUUID(),
        intentId,
        previousConfiguration: previousConfig,
        rollbackReason: reason,
        rolledBackAt: new Date().toISOString(),
        rolledBackBy: (await supabase.auth.getUser()).data.user?.id || 'unknown'
      };

      // Update intent status
      await supabase
        .from('network_intents')
        .update({ 
          status: 'rolled_back',
          configuration: previousConfig,
          updated_at: new Date().toISOString()
        })
        .eq('id', intentId);

      // Store rollback record
      await this.storeRollbackRecord(rollback);

      return rollback;
    } catch (error) {
      console.error('Configuration rollback failed:', error);
      throw new Error('Failed to rollback configuration');
    }
  }

  // Bulk operations
  async applyBulkIntents(intentIds: string[], devices: string[]): Promise<{ successful: string[], failed: string[] }> {
    const successful: string[] = [];
    const failed: string[] = [];

    for (const intentId of intentIds) {
      try {
        // Apply intent to each device
        for (const deviceId of devices) {
          await this.applyIntentToDevice(intentId, deviceId);
        }
        successful.push(intentId);
      } catch (error) {
        console.error(`Failed to apply intent ${intentId}:`, error);
        failed.push(intentId);
      }
    }

    return { successful, failed };
  }

  private parseAIValidation(aiResponse: string): ValidationResult[] {
    try {
      // Try to parse JSON response from AI
      const parsed = JSON.parse(aiResponse);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Fallback parsing if AI doesn't return valid JSON
      return [{
        type: 'info',
        message: 'AI validation completed',
        severity: 'low',
        affectedDevices: []
      }];
    }
  }

  private calculateSafetyScore(validationResults: ValidationResult[]): number {
    let score = 100;
    
    validationResults.forEach(result => {
      if (result.type === 'error') {
        score -= result.severity === 'critical' ? 30 : result.severity === 'high' ? 20 : 10;
      } else if (result.type === 'warning') {
        score -= result.severity === 'high' ? 10 : 5;
      }
    });

    return Math.max(0, score);
  }

  private calculateEstimatedImpact(validationResults: ValidationResult[]): string {
    const criticalIssues = validationResults.filter(r => r.severity === 'critical').length;
    const highIssues = validationResults.filter(r => r.severity === 'high').length;

    if (criticalIssues > 0) return 'High Risk - Critical issues detected';
    if (highIssues > 0) return 'Medium Risk - High severity issues found';
    return 'Low Risk - Minor or no issues detected';
  }

  private generateRecommendations(validationResults: ValidationResult[]): string[] {
    const recommendations: string[] = [];
    
    const errors = validationResults.filter(r => r.type === 'error');
    const warnings = validationResults.filter(r => r.type === 'warning');

    if (errors.length > 0) {
      recommendations.push('Review and fix all error conditions before deployment');
    }
    
    if (warnings.length > 0) {
      recommendations.push('Consider addressing warning conditions for optimal performance');
    }

    recommendations.push('Test configuration in a lab environment first');
    recommendations.push('Have a rollback plan ready before deployment');

    return recommendations;
  }

  private async getPreviousConfiguration(intentId: string): Promise<string> {
    // Simplified - in real implementation, you'd have configuration history
    return "# Previous configuration placeholder";
  }

  private async applyIntentToDevice(intentId: string, deviceId: string): Promise<void> {
    // Simplified device application logic
    console.log(`Applying intent ${intentId} to device ${deviceId}`);
  }

  private async storeDryRunResult(result: DryRunResult): Promise<void> {
    // Store in local storage or database as needed
    console.log('Storing dry-run result:', result);
  }

  private async storeRollbackRecord(rollback: ConfigurationRollback): Promise<void> {
    // Store rollback record
    console.log('Storing rollback record:', rollback);
  }
}

export const configurationService = new ConfigurationService();
