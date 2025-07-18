
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Play, Calendar, Users, TestTube, GitBranch, ExternalLink } from 'lucide-react';
import { useCreateIntent } from '@/hooks/useNetworkData';
import { DryRunDialog } from './DryRunDialog';
import { configurationService } from '@/services/configurationService';
import { schedulingService } from '@/services/schedulingService';
import { approvalService } from '@/services/approvalService';
import { webhookService } from '@/services/webhookService';
import { DryRunResult } from '@/types/networkOperations';
import { toast } from '@/hooks/use-toast';

export const IntentCreatorEnhanced = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    intent_type: '',
    natural_language_input: '',
  });
  const [isDryRunOpen, setIsDryRunOpen] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [scheduleDeployment, setScheduleDeployment] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [tempIntentId, setTempIntentId] = useState<string | null>(null);
  const [generatedConfig, setGeneratedConfig] = useState<string>('');
  const [changeReference, setChangeReference] = useState<string>('');
  const [gitMergeRequestUrl, setGitMergeRequestUrl] = useState<string>('');

  const { createIntent, loading } = useCreateIntent();

  const intentTypes = [
    { value: 'vlan', label: 'VLAN Configuration' },
    { value: 'qos', label: 'QoS Policy' },
    { value: 'acl', label: 'Access Control List' },
    { value: 'routing', label: 'Routing Configuration' },
    { value: 'security', label: 'Security Policy' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Create the intent with Git integration
      const intent = await createIntent(formData);
      setTempIntentId(intent.id);
      
      // Store change reference and Git URL if available
      if (intent.changeReference) {
        setChangeReference(intent.changeReference);
      }
      
      // Generate configuration for dry-run
      const mockConfig = `# Generated configuration for ${formData.intent_type}
# Intent: ${formData.title}
# Description: ${formData.description}
# Change Reference: ${intent.changeReference || 'Not assigned'}

interface GigabitEthernet0/1
 description ${formData.description}
 no shutdown
!`;
      
      setGeneratedConfig(mockConfig);

      // Handle approval workflow
      if (requireApproval) {
        await approvalService.createApprovalWorkflow(intent.id, 2);
        toast({
          title: "Approval Required",
          description: `Intent created with change reference: ${intent.changeReference}`
        });
      }

      // Handle scheduling
      if (scheduleDeployment && scheduledFor) {
        await schedulingService.scheduleIntent(intent.id, scheduledFor);
        toast({
          title: "Intent Scheduled",
          description: `Intent scheduled for ${new Date(scheduledFor).toLocaleString()}`
        });
      }

      // Trigger webhooks
      await webhookService.triggerWebhooks('intent.created', {
        intent,
        requireApproval,
        scheduled: scheduleDeployment,
        changeReference: intent.changeReference
      });

      if (!requireApproval && !scheduleDeployment) {
        toast({
          title: "Intent Created",
          description: `Network intent created with change reference: ${intent.changeReference}`
        });
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        intent_type: '',
        natural_language_input: '',
      });
      setRequireApproval(false);
      setScheduleDeployment(false);
      setScheduledFor('');
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create intent",
        variant: "destructive"
      });
    }
  };

  const handleDryRun = () => {
    if (!tempIntentId || !generatedConfig) {
      toast({
        title: "No Configuration",
        description: "Please create an intent first to run dry-run validation",
        variant: "destructive"
      });
      return;
    }
    setIsDryRunOpen(true);
  };

  const handleRollback = async () => {
    if (!tempIntentId) return;
    
    try {
      await configurationService.rollbackConfiguration(tempIntentId, 'Manual rollback from creator');
      toast({
        title: "Configuration Rolled Back",
        description: "Intent has been rolled back to previous state"
      });
    } catch (error) {
      toast({
        title: "Rollback Failed",
        description: "Failed to rollback configuration",
        variant: "destructive"
      });
    }
  };

  const getSafetyScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card className="bg-slate-900 border-white/20">
      <CardHeader>
        <CardTitle className="text-white">Enhanced Intent Creator</CardTitle>
        <CardDescription className="text-blue-200/70">
          Create network intents with GitOps workflow, dry-run validation, approval workflows, and scheduling
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Intent Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-white">Intent Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="bg-black/20 border-white/20 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="intent_type" className="text-white">Intent Type</Label>
              <Select value={formData.intent_type} onValueChange={(value) => setFormData(prev => ({ ...prev, intent_type: value }))}>
                <SelectTrigger className="bg-black/20 border-white/20 text-white">
                  <SelectValue placeholder="Select intent type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/20">
                  {intentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description" className="text-white">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-black/20 border-white/20 text-white"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="natural_language_input" className="text-white">Natural Language Input</Label>
              <Textarea
                id="natural_language_input"
                value={formData.natural_language_input}
                onChange={(e) => setFormData(prev => ({ ...prev, natural_language_input: e.target.value }))}
                className="bg-black/20 border-white/20 text-white"
                placeholder="Describe what you want to configure in plain English..."
                rows={4}
                required
              />
            </div>
          </div>

          <Separator className="bg-white/20" />

          {/* Git Integration Status */}
          {changeReference && (
            <div className="bg-black/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-green-400" />
                <h3 className="text-white font-medium">GitOps Integration</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-blue-200/70 text-sm">Change Reference:</span>
                  <Badge className="bg-blue-600 text-white">{changeReference}</Badge>
                </div>
                {gitMergeRequestUrl && (
                  <div className="flex items-center gap-2">
                    <span className="text-blue-200/70 text-sm">Merge Request:</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(gitMergeRequestUrl, '_blank')}
                      className="border-blue-400/30 text-blue-300 hover:bg-blue-600/10 h-6 px-2 text-xs"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View MR
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Workflow Options */}
          <div className="space-y-4">
            <h3 className="text-white font-medium">Deployment Options</h3>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="requireApproval"
                checked={requireApproval}
                onChange={(e) => setRequireApproval(e.target.checked)}
                className="rounded border-white/20"
              />
              <Label htmlFor="requireApproval" className="text-white flex items-center gap-2">
                <Users className="h-4 w-4" />
                Require approval workflow
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="scheduleDeployment"
                checked={scheduleDeployment}
                onChange={(e) => setScheduleDeployment(e.target.checked)}
                className="rounded border-white/20"
              />
              <Label htmlFor="scheduleDeployment" className="text-white flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule deployment
              </Label>
            </div>

            {scheduleDeployment && (
              <div className="ml-6">
                <Label htmlFor="scheduledFor" className="text-white">Deployment Time</Label>
                <Input
                  id="scheduledFor"
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="bg-black/20 border-white/20 text-white"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}
          </div>

          {/* Dry-Run Results */}
          {dryRunResult && (
            <div className="bg-black/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">Dry-Run Validation Results</h3>
                <div className={`text-lg font-bold ${getSafetyScoreColor(dryRunResult.safetyScore)}`}>
                  Safety Score: {dryRunResult.safetyScore}/100
                </div>
              </div>
              <div className="text-sm text-blue-200/70">{dryRunResult.estimatedImpact}</div>
              <div className="flex flex-wrap gap-1">
                {dryRunResult.validationResults.slice(0, 3).map((result, index) => (
                  <Badge key={index} className={`text-xs ${
                    result.type === 'error' ? 'bg-red-600' : 
                    result.type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600'
                  }`}>
                    {result.type}: {result.severity}
                  </Badge>
                ))}
                {dryRunResult.validationResults.length > 3 && (
                  <Badge className="bg-gray-600 text-xs">
                    +{dryRunResult.validationResults.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Creating...' : 'Create Intent'}
            </Button>
            
            {tempIntentId && generatedConfig && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDryRun}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Dry Run
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRollback}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  Rollback
                </Button>
              </>
            )}
          </div>
        </form>

        {/* Dry-Run Dialog */}
        <DryRunDialog
          open={isDryRunOpen}
          onOpenChange={setIsDryRunOpen}
          intentId={tempIntentId || ''}
          configuration={generatedConfig}
          onValidationComplete={setDryRunResult}
        />
      </CardContent>
    </Card>
  );
};
