
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock } from 'lucide-react';
import { useConfigComparison } from '@/hooks/useConfigComparison';
import { toast } from '@/hooks/use-toast';

interface ScheduleComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devices: Array<{ id: string; name: string; ip_address: string; status: string }>;
}

export const ScheduleComparisonDialog = ({ open, onOpenChange, devices }: ScheduleComparisonDialogProps) => {
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { scheduleComparison } = useConfigComparison();

  const scheduleOptions = [
    { value: '0 */6 * * *', label: 'Every 6 hours' },
    { value: '0 0 * * *', label: 'Daily at midnight' },
    { value: '0 2 * * *', label: 'Daily at 2 AM' },
    { value: '0 0 * * 1', label: 'Weekly on Monday' },
    { value: '0 0 1 * *', label: 'Monthly on 1st' },
  ];

  const handleDeviceToggle = (deviceId: string, checked: boolean) => {
    if (checked) {
      setSelectedDevices([...selectedDevices, deviceId]);
    } else {
      setSelectedDevices(selectedDevices.filter(id => id !== deviceId));
    }
  };

  const handleSchedule = async () => {
    if (selectedDevices.length === 0 || !schedule) {
      toast({
        title: "Validation Error",
        description: "Please select devices and a schedule",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await scheduleComparison(selectedDevices, schedule);
      toast({
        title: "Scheduled Successfully",
        description: `Configuration comparison scheduled for ${selectedDevices.length} devices`
      });
      onOpenChange(false);
      setSelectedDevices([]);
      setSchedule('');
    } catch (error) {
      toast({
        title: "Scheduling Failed",
        description: "Failed to schedule configuration comparison",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/20 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Configuration Comparison
          </DialogTitle>
          <DialogDescription className="text-blue-200/70">
            Schedule automatic configuration comparisons for selected devices
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Device Selection */}
          <div>
            <div className="text-sm font-medium text-white mb-3">Select Devices</div>
            <ScrollArea className="h-48 border border-white/20 rounded-lg p-3">
              <div className="space-y-2">
                {devices.map((device) => (
                  <div key={device.id} className="flex items-center space-x-3 p-2 hover:bg-white/5 rounded">
                    <Checkbox
                      checked={selectedDevices.includes(device.id)}
                      onCheckedChange={(checked) => handleDeviceToggle(device.id, !!checked)}
                      disabled={device.status !== 'online'}
                    />
                    <div className="flex-1">
                      <div className="text-sm text-white">{device.name}</div>
                      <div className="text-xs text-blue-200/70">{device.ip_address}</div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${
                      device.status === 'online' 
                        ? 'bg-green-600/20 text-green-300' 
                        : 'bg-red-600/20 text-red-300'
                    }`}>
                      {device.status}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="text-xs text-blue-200/70 mt-2">
              {selectedDevices.length} of {devices.length} devices selected
            </div>
          </div>

          {/* Schedule Selection */}
          <div>
            <div className="text-sm font-medium text-white mb-3">Schedule</div>
            <Select value={schedule} onValueChange={setSchedule}>
              <SelectTrigger className="bg-black/20 border-white/20 text-white">
                <SelectValue placeholder="Select comparison frequency" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-white/20">
                {scheduleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={isSubmitting || selectedDevices.length === 0 || !schedule}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Comparison'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
