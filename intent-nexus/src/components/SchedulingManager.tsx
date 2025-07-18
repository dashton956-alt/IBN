
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Clock, X } from 'lucide-react';
import { schedulingService } from '@/services/schedulingService';
import { ScheduledIntent } from '@/types/networkOperations';
import { useNetworkIntents } from '@/hooks/useNetworkData';
import { toast } from '@/hooks/use-toast';

export const SchedulingManager = () => {
  const [scheduledIntents, setScheduledIntents] = useState<ScheduledIntent[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    intentId: '',
    scheduledFor: '',
    notes: ''
  });

  const { data: intents } = useNetworkIntents();

  useEffect(() => {
    loadScheduledIntents();
  }, []);

  const loadScheduledIntents = async () => {
    try {
      const scheduled = await schedulingService.getScheduledIntents();
      setScheduledIntents(scheduled);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load scheduled intents",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await schedulingService.scheduleIntent(
        formData.intentId,
        formData.scheduledFor,
        formData.notes
      );
      
      await loadScheduledIntents();
      resetForm();
      setIsDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Intent scheduled successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule intent",
        variant: "destructive"
      });
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled intent?')) return;
    
    try {
      await schedulingService.cancelScheduledIntent(id);
      await loadScheduledIntents();
      
      toast({
        title: "Success",
        description: "Scheduled intent cancelled"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel scheduled intent",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      intentId: '',
      scheduledFor: '',
      notes: ''
    });
  };

  const getStatusColor = (status: ScheduledIntent['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-600';
      case 'running': return 'bg-blue-600';
      case 'completed': return 'bg-green-600';
      case 'failed': return 'bg-red-600';
      case 'cancelled': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  const getIntentTitle = (intentId: string) => {
    const intent = intents?.find(i => i.id === intentId);
    return intent?.title || 'Unknown Intent';
  };

  const formatScheduledTime = (scheduledFor: string) => {
    return new Date(scheduledFor).toLocaleString();
  };

  const isInPast = (scheduledFor: string) => {
    return new Date(scheduledFor) < new Date();
  };

  return (
    <Card className="bg-slate-900 border-white/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Intent Scheduling
            </CardTitle>
            <CardDescription className="text-blue-200/70">
              Schedule intent deployments for specific times
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700">
                <Clock className="h-4 w-4 mr-2" />
                Schedule Intent
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-white/20 text-white">
              <DialogHeader>
                <DialogTitle>Schedule Intent Deployment</DialogTitle>
                <DialogDescription className="text-blue-200/70">
                  Schedule an intent to be deployed at a specific time
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="intentId" className="text-white">Intent</Label>
                  <select
                    id="intentId"
                    value={formData.intentId}
                    onChange={(e) => setFormData(prev => ({ ...prev, intentId: e.target.value }))}
                    className="w-full bg-black/20 border border-white/20 rounded-md px-3 py-2 text-white"
                    required
                  >
                    <option value="">Select an intent</option>
                    {intents?.filter(intent => intent.status === 'approved' || intent.status === 'pending').map((intent) => (
                      <option key={intent.id} value={intent.id}>
                        {intent.title} ({intent.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="scheduledFor" className="text-white">Scheduled Time</Label>
                  <Input
                    id="scheduledFor"
                    type="datetime-local"
                    value={formData.scheduledFor}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledFor: e.target.value }))}
                    className="bg-black/20 border-white/20 text-white"
                    min={new Date().toISOString().slice(0, 16)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="notes" className="text-white">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="bg-black/20 border-white/20 text-white"
                    placeholder="Add any notes about this scheduled deployment"
                  />
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
                    Schedule
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {scheduledIntents.map((scheduledIntent) => (
            <div key={scheduledIntent.id} className="bg-black/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-white font-medium">
                    {getIntentTitle(scheduledIntent.intentId)}
                  </h3>
                  <Badge className={getStatusColor(scheduledIntent.status)}>
                    {scheduledIntent.status}
                  </Badge>
                  {isInPast(scheduledIntent.scheduledFor) && scheduledIntent.status === 'pending' && (
                    <Badge className="bg-orange-600">Overdue</Badge>
                  )}
                </div>
                {(scheduledIntent.status === 'pending' || scheduledIntent.status === 'running') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCancel(scheduledIntent.id)}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                )}
              </div>
              
              <div className="text-sm text-blue-200/70 mb-2">
                Scheduled for: <span className="text-white">{formatScheduledTime(scheduledIntent.scheduledFor)}</span>
              </div>
              
              {scheduledIntent.notes && (
                <div className="text-sm text-blue-200/70">
                  Notes: <span className="text-white">{scheduledIntent.notes}</span>
                </div>
              )}
            </div>
          ))}

          {scheduledIntents.length === 0 && (
            <div className="text-center py-8 text-blue-200/70">
              No scheduled intents. Schedule your first intent deployment.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
