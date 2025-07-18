
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, XCircle, Info, Play } from 'lucide-react';
import { configurationService } from '@/services/configurationService';
import { DryRunResult, ValidationResult } from '@/types/networkOperations';
import { toast } from '@/hooks/use-toast';

interface DryRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intentId: string;
  configuration: string;
  onValidationComplete?: (result: DryRunResult) => void;
}

export const DryRunDialog = ({ 
  open, 
  onOpenChange, 
  intentId, 
  configuration, 
  onValidationComplete 
}: DryRunDialogProps) => {
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<DryRunResult | null>(null);

  const handleDryRun = async () => {
    setIsValidating(true);
    try {
      const validationResult = await configurationService.performDryRun(intentId, configuration);
      setResult(validationResult);
      onValidationComplete?.(validationResult);
      
      toast({
        title: "Dry Run Complete",
        description: `Safety Score: ${validationResult.safetyScore}/100`,
      });
    } catch (error) {
      toast({
        title: "Validation Failed",
        description: "Failed to perform dry-run validation",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const getResultIcon = (type: ValidationResult['type']) => {
    switch (type) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getSeverityColor = (severity: ValidationResult['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-yellow-600';
      case 'low': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const getSafetyScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/20 text-white max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Configuration Dry Run
          </DialogTitle>
          <DialogDescription className="text-blue-200/70">
            Validate configuration before deployment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!result && (
            <div className="text-center py-8">
              <Button 
                onClick={handleDryRun} 
                disabled={isValidating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isValidating ? 'Validating...' : 'Start Dry Run'}
              </Button>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Safety Score */}
              <div className="bg-black/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Safety Assessment</h3>
                  <div className={`text-2xl font-bold ${getSafetyScoreColor(result.safetyScore)}`}>
                    {result.safetyScore}/100
                  </div>
                </div>
                <div className="text-sm text-blue-200/70 mb-2">Estimated Impact:</div>
                <div className="text-white">{result.estimatedImpact}</div>
              </div>

              {/* Validation Results */}
              <div className="bg-black/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Validation Results</h3>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {result.validationResults.map((validation, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-white/5 rounded">
                        {getResultIcon(validation.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`${getSeverityColor(validation.severity)} text-white`}>
                              {validation.severity}
                            </Badge>
                            <span className="text-sm text-blue-200/70 capitalize">{validation.type}</span>
                          </div>
                          <div className="text-white mb-2">{validation.message}</div>
                          {validation.affectedDevices.length > 0 && (
                            <div className="text-xs text-blue-200/70">
                              Affected devices: {validation.affectedDevices.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Recommendations */}
              <div className="bg-black/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
                <div className="space-y-2">
                  {result.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-white">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setResult(null)}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Run Again
                </Button>
                <Button
                  onClick={() => onOpenChange(false)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
