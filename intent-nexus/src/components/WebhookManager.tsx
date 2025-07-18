
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Webhook, Plus, Trash2, Edit, ExternalLink } from 'lucide-react';
import { webhookService } from '@/services/webhookService';
import { WebhookConfig } from '@/types/networkOperations';
import { toast } from '@/hooks/use-toast';

export const WebhookManager = () => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as string[],
    active: true,
    secret: ''
  });

  const availableEvents = [
    'intent.created',
    'intent.updated',
    'intent.deployed',
    'intent.failed',
    'intent.scheduled_deployment',
    'workflow.approval_required',
    'workflow.approved',
    'workflow.rejected',
    'device.status_changed',
    'metrics.threshold_exceeded'
  ];

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      const webhookList = await webhookService.getWebhooks();
      setWebhooks(webhookList);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load webhooks",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingWebhook) {
        await webhookService.updateWebhook(editingWebhook.id, formData);
        toast({
          title: "Success",
          description: "Webhook updated successfully"
        });
      } else {
        await webhookService.registerWebhook(formData);
        toast({
          title: "Success",
          description: "Webhook created successfully"
        });
      }
      
      await loadWebhooks();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save webhook",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    
    try {
      await webhookService.deleteWebhook(id);
      await loadWebhooks();
      toast({
        title: "Success",
        description: "Webhook deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete webhook",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (webhook: WebhookConfig) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      active: webhook.active,
      secret: webhook.secret || ''
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      events: [],
      active: true,
      secret: ''
    });
    setEditingWebhook(null);
  };

  const handleEventToggle = (event: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({ ...prev, events: [...prev.events, event] }));
    } else {
      setFormData(prev => ({ ...prev, events: prev.events.filter(e => e !== event) }));
    }
  };

  const testWebhook = async (webhook: WebhookConfig) => {
    try {
      await webhookService.triggerWebhooks('test.webhook', {
        message: 'This is a test webhook call',
        timestamp: new Date().toISOString()
      });
      toast({
        title: "Test Sent",
        description: "Test webhook has been triggered"
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Failed to send test webhook",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="bg-slate-900 border-white/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhook Management
            </CardTitle>
            <CardDescription className="text-blue-200/70">
              Configure webhooks for system events
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-white/20 text-white max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingWebhook ? 'Edit Webhook' : 'Create New Webhook'}
                </DialogTitle>
                <DialogDescription className="text-blue-200/70">
                  Configure webhook endpoint and events
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-white">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-black/20 border-white/20 text-white"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="url" className="text-white">URL</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    className="bg-black/20 border-white/20 text-white"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="secret" className="text-white">Secret (Optional)</Label>
                  <Input
                    id="secret"
                    value={formData.secret}
                    onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
                    className="bg-black/20 border-white/20 text-white"
                    placeholder="Webhook secret for verification"
                  />
                </div>

                <div>
                  <Label className="text-white mb-3 block">Events</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {availableEvents.map((event) => (
                      <div key={event} className="flex items-center space-x-2">
                        <Checkbox
                          checked={formData.events.includes(event)}
                          onCheckedChange={(checked) => handleEventToggle(event, !!checked)}
                        />
                        <label className="text-sm text-white">{event}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                  />
                  <Label className="text-white">Active</Label>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    {editingWebhook ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <div key={webhook.id} className="bg-black/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-white font-medium">{webhook.name}</h3>
                  <Badge className={webhook.active ? 'bg-green-600' : 'bg-gray-600'}>
                    {webhook.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testWebhook(webhook)}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(webhook)}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(webhook.id)}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-blue-200/70 mb-2">
                URL: <span className="text-white">{webhook.url}</span>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {webhook.events.map((event) => (
                  <Badge key={event} className="bg-blue-600/20 text-blue-300 text-xs">
                    {event}
                  </Badge>
                ))}
              </div>
              
              {webhook.lastTriggered && (
                <div className="text-xs text-blue-200/70 mt-2">
                  Last triggered: {new Date(webhook.lastTriggered).toLocaleString()}
                </div>
              )}
            </div>
          ))}

          {webhooks.length === 0 && (
            <div className="text-center py-8 text-blue-200/70">
              No webhooks configured. Create your first webhook to get started.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
