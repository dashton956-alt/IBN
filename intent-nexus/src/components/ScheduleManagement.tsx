
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock, RefreshCw, Settings, Trash2 } from 'lucide-react';
import { useConfigComparison } from '@/hooks/useConfigComparison';
import { useNetworkDevices } from '@/hooks/useNetworkData';
import { toast } from '@/hooks/use-toast';

interface ScheduleConfig {
  id: string;
  name: string;
  type: 'weekly' | 'monthly' | 'on-change';
  enabled: boolean;
  schedule: string;
  devices: string[];
  created_at: string;
}

export const ScheduleManagement = () => {
  const [schedules, setSchedules] = useState<ScheduleConfig[]>([]);
  const [weeklyEnabled, setWeeklyEnabled] = useState(false);
  const [monthlyEnabled, setMonthlyEnabled] = useState(false);
  const [onChangeEnabled, setOnChangeEnabled] = useState(false);
  const [weeklyTime, setWeeklyTime] = useState('0 2 * * 1'); // Monday 2 AM
  const [monthlyTime, setMonthlyTime] = useState('0 2 1 * *'); // 1st of month 2 AM
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: devices = [] } = useNetworkDevices();
  const { scheduleComparison } = useConfigComparison();

  const scheduleOptions = {
    weekly: [
      { value: '0 2 * * 1', label: 'Monday at 2 AM' },
      { value: '0 2 * * 2', label: 'Tuesday at 2 AM' },
      { value: '0 2 * * 3', label: 'Wednesday at 2 AM' },
      { value: '0 2 * * 4', label: 'Thursday at 2 AM' },
      { value: '0 2 * * 5', label: 'Friday at 2 AM' },
      { value: '0 2 * * 6', label: 'Saturday at 2 AM' },
      { value: '0 2 * * 0', label: 'Sunday at 2 AM' },
    ],
    monthly: [
      { value: '0 2 1 * *', label: '1st of month at 2 AM' },
      { value: '0 2 15 * *', label: '15th of month at 2 AM' },
      { value: '0 2 28 * *', label: '28th of month at 2 AM' },
    ]
  };

  // Load existing schedules (mock data for now)
  useEffect(() => {
    const mockSchedules: ScheduleConfig[] = [
      {
        id: 'weekly-1',
        name: 'Weekly All Devices',
        type: 'weekly',
        enabled: true,
        schedule: '0 2 * * 1',
        devices: devices.map(d => d.id),
        created_at: new Date().toISOString()
      }
    ];
    setSchedules(mockSchedules);
  }, [devices]);

  const handleScheduleToggle = async (type: 'weekly' | 'monthly' | 'on-change', enabled: boolean) => {
    if (!enabled) {
      // Disable schedule
      setSchedules(prev => prev.filter(s => s.type !== type));
      if (type === 'weekly') setWeeklyEnabled(false);
      if (type === 'monthly') setMonthlyEnabled(false);
      if (type === 'on-change') setOnChangeEnabled(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const deviceIds = devices.map(d => d.id);
      let schedule = '';
      let name = '';

      switch (type) {
        case 'weekly':
          schedule = weeklyTime;
          name = 'Weekly All Devices Comparison';
          setWeeklyEnabled(true);
          break;
        case 'monthly':
          schedule = monthlyTime;
          name = 'Monthly All Devices Comparison';
          setMonthlyEnabled(true);
          break;
        case 'on-change':
          schedule = 'on-change';
          name = 'On Change Device Comparison';
          setOnChangeEnabled(true);
          break;
      }

      // Create the schedule
      await scheduleComparison(deviceIds, schedule);

      // Add to local state
      const newSchedule: ScheduleConfig = {
        id: `${type}-${Date.now()}`,
        name,
        type,
        enabled: true,
        schedule,
        devices: deviceIds,
        created_at: new Date().toISOString()
      };

      setSchedules(prev => [...prev.filter(s => s.type !== type), newSchedule]);

      toast({
        title: "Schedule Created",
        description: `${name} has been scheduled successfully`
      });
    } catch (error) {
      toast({
        title: "Schedule Failed",
        description: "Failed to create schedule",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleUpdate = async (type: 'weekly' | 'monthly', newSchedule: string) => {
    if (type === 'weekly') {
      setWeeklyTime(newSchedule);
      if (weeklyEnabled) {
        await handleScheduleToggle('weekly', true);
      }
    } else {
      setMonthlyTime(newSchedule);
      if (monthlyEnabled) {
        await handleScheduleToggle('monthly', true);
      }
    }
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    setSchedules(prev => prev.filter(s => s.id !== scheduleId));
    toast({
      title: "Schedule Deleted",
      description: "Scheduled comparison has been removed"
    });
  };

  const getScheduleDescription = (schedule: string) => {
    if (schedule === 'on-change') return 'Triggered after device changes';
    const weeklyOption = scheduleOptions.weekly.find(opt => opt.value === schedule);
    if (weeklyOption) return weeklyOption.label;
    const monthlyOption = scheduleOptions.monthly.find(opt => opt.value === schedule);
    if (monthlyOption) return monthlyOption.label;
    return schedule;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Schedule Management
          </CardTitle>
          <CardDescription className="text-blue-200/70">
            Configure automatic configuration comparisons for all devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Weekly Schedule */}
          <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-white/10">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Switch
                  checked={weeklyEnabled}
                  onCheckedChange={(enabled) => handleScheduleToggle('weekly', enabled)}
                  disabled={isSubmitting}
                />
                <div>
                  <div className="text-white font-medium">Weekly Comparison</div>
                  <div className="text-blue-200/70 text-sm">Compare all devices weekly</div>
                </div>
              </div>
              {weeklyEnabled && (
                <div className="ml-12">
                  <Select value={weeklyTime} onValueChange={(value) => handleScheduleUpdate('weekly', value)}>
                    <SelectTrigger className="w-48 bg-black/20 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/20">
                      {scheduleOptions.weekly.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Monthly Schedule */}
          <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-white/10">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Switch
                  checked={monthlyEnabled}
                  onCheckedChange={(enabled) => handleScheduleToggle('monthly', enabled)}
                  disabled={isSubmitting}
                />
                <div>
                  <div className="text-white font-medium">Monthly Comparison</div>
                  <div className="text-blue-200/70 text-sm">Compare all devices monthly</div>
                </div>
              </div>
              {monthlyEnabled && (
                <div className="ml-12">
                  <Select value={monthlyTime} onValueChange={(value) => handleScheduleUpdate('monthly', value)}>
                    <SelectTrigger className="w-48 bg-black/20 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/20">
                      {scheduleOptions.monthly.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* On Change Schedule */}
          <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-white/10">
            <div className="flex items-center gap-3">
              <Switch
                checked={onChangeEnabled}
                onCheckedChange={(enabled) => handleScheduleToggle('on-change', enabled)}
                disabled={isSubmitting}
              />
              <div>
                <div className="text-white font-medium">On Change Comparison</div>
                <div className="text-blue-200/70 text-sm">Compare device after configuration changes</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Schedules */}
      {schedules.length > 0 && (
        <Card className="bg-black/20 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Active Schedules
            </CardTitle>
            <CardDescription className="text-blue-200/70">
              Currently configured comparison schedules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Badge className={schedule.enabled ? 'bg-green-600/20 text-green-300 border-green-400/30' : 'bg-gray-600/20 text-gray-300 border-gray-400/30'}>
                          {schedule.enabled ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge className="bg-blue-600/20 text-blue-300 border-blue-400/30">
                          {schedule.type}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-white font-medium">{schedule.name}</div>
                        <div className="text-blue-200/70 text-sm">{getScheduleDescription(schedule.schedule)}</div>
                        <div className="text-blue-200/60 text-xs">{schedule.devices.length} devices</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        variant="outline"
                        size="sm"
                        className="border-red-400/30 text-red-300 hover:bg-red-600/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
