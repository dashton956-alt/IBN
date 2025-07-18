
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Layers, Play, CheckCircle, XCircle } from 'lucide-react';
import { configurationService } from '@/services/configurationService';
import { useNetworkIntents, useNetworkDevices } from '@/hooks/useNetworkData';
import { toast } from '@/hooks/use-toast';

export const BulkOperations = () => {
  const [selectedIntents, setSelectedIntents] = useState<string[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [results, setResults] = useState<{ successful: string[], failed: string[] } | null>(null);
  const [progress, setProgress] = useState(0);

  const { data: intents } = useNetworkIntents();
  const { data: devices } = useNetworkDevices();

  const handleIntentToggle = (intentId: string, checked: boolean) => {
    if (checked) {
      setSelectedIntents([...selectedIntents, intentId]);
    } else {
      setSelectedIntents(selectedIntents.filter(id => id !== intentId));
    }
  };

  const handleDeviceToggle = (deviceId: string, checked: boolean) => {
    if (checked) {
      setSelectedDevices([...selectedDevices, deviceId]);
    } else {
      setSelectedDevices(selectedDevices.filter(id => id !== deviceId));
    }
  };

  const handleBulkApply = async () => {
    if (selectedIntents.length === 0 || selectedDevices.length === 0) {
      toast({
        title: "Selection Required",
        description: "Please select at least one intent and one device",
        variant: "destructive"
      });
      return;
    }

    setIsApplying(true);
    setProgress(0);
    setResults(null);

    try {
      // Simulate progress updates
      const totalOperations = selectedIntents.length;
      let completed = 0;

      const results = await configurationService.applyBulkIntents(selectedIntents, selectedDevices);
      
      // Update progress
      const progressInterval = setInterval(() => {
        completed++;
        setProgress((completed / totalOperations) * 100);
        
        if (completed >= totalOperations) {
          clearInterval(progressInterval);
        }
      }, 500);

      setResults(results);
      
      toast({
        title: "Bulk Operation Complete",
        description: `${results.successful.length} successful, ${results.failed.length} failed`,
      });
    } catch (error) {
      toast({
        title: "Bulk Operation Failed",
        description: "Failed to apply bulk operations",
        variant: "destructive"
      });
    } finally {
      setIsApplying(false);
    }
  };

  const getIntentTitle = (intentId: string): string => {
    const intent = intents?.find(i => i.id === intentId);
    return intent?.title || 'Unknown Intent';
  };

  const getDeviceName = (deviceId: string): string => {
    const device = devices?.find(d => d.id === deviceId);
    return device?.name || 'Unknown Device';
  };

  const getIntentStatus = (intentId: string): string => {
    const intent = intents?.find(i => i.id === intentId);
    return intent?.status || 'unknown';
  };

  const getDeviceStatus = (deviceId: string): string => {
    const device = devices?.find(d => d.id === deviceId);
    return device?.status ? String(device.status) : 'unknown';
  };

  const eligibleIntents = intents?.filter(intent => 
    intent.status === 'approved' || intent.status === 'pending'
  ) || [];

  const onlineDevices = devices?.filter(device => 
    device.status === 'online'
  ) || [];

  const getSuccessfulIntentsText = (): string => {
    if (!results || results.successful.length === 0) return 'Fail';
    return 'Pass';
  };

  const getFailedIntentsText = (): string => {
    if (!results || results.failed.length === 0) return 'Pass';
    return 'Fail';
  };

  return (
    <Card className="bg-slate-900 border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Bulk Operations
        </CardTitle>
        <CardDescription className="text-blue-200/70">
          Apply multiple intents to multiple devices simultaneously
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Intent Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium">Select Intents</h3>
              <Badge className="bg-blue-600">
                {selectedIntents.length} selected
              </Badge>
            </div>
            <ScrollArea className="h-64 border border-white/20 rounded-lg p-3">
              <div className="space-y-2">
                {eligibleIntents.map((intent) => (
                  <div key={intent.id} className="flex items-center space-x-3 p-2 hover:bg-white/5 rounded">
                    <Checkbox
                      checked={selectedIntents.includes(intent.id)}
                      onCheckedChange={(checked) => handleIntentToggle(intent.id, !!checked)}
                    />
                    <div className="flex-1">
                      <div className="text-sm text-white">{intent.title}</div>
                      <div className="text-xs text-blue-200/70">{intent.intent_type}</div>
                    </div>
                    <Badge className={`text-xs ${
                      intent.status === 'approved' 
                        ? 'bg-green-600' 
                        : 'bg-yellow-600'
                    }`}>
                      {intent.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Device Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium">Select Devices</h3>
              <Badge className="bg-blue-600">
                {selectedDevices.length} selected
              </Badge>
            </div>
            <ScrollArea className="h-64 border border-white/20 rounded-lg p-3">
              <div className="space-y-2">
                {onlineDevices.map((device) => (
                  <div key={device.id} className="flex items-center space-x-3 p-2 hover:bg-white/5 rounded">
                    <Checkbox
                      checked={selectedDevices.includes(device.id)}
                      onCheckedChange={(checked) => handleDeviceToggle(device.id, !!checked)}
                    />
                    <div className="flex-1">
                      <div className="text-sm text-white">{device.name}</div>
                      <div className="text-xs text-blue-200/70">{device.ip_address ? String(device.ip_address) : 'No IP'}</div>
                    </div>
                    <Badge className={`text-xs ${
                      device.status === 'online' 
                        ? 'bg-green-600' 
                        : 'bg-red-600'
                    }`}>
                      {getDeviceStatus(device.id)}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Progress and Results */}
        {isApplying && (
          <div className="mt-6 space-y-4">
            <div className="text-white font-medium">Applying configurations...</div>
            <Progress value={progress} className="w-full" />
            <div className="text-sm text-blue-200/70">
              Progress: {Math.round(progress)}%
            </div>
          </div>
        )}

        {results && (
          <div className="mt-6 space-y-4">
            <h3 className="text-white font-medium">Operation Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-600/20 border border-green-600/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 font-medium">Successful</span>
                </div>
                <div className="text-2xl text-white font-bold">{results.successful.length}</div>
                <div className="text-sm text-green-300">
                  {getSuccessfulIntentsText()}
                </div>
              </div>
              
              <div className="bg-red-600/20 border border-red-600/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <span className="text-red-400 font-medium">Failed</span>
                </div>
                <div className="text-2xl text-white font-bold">{results.failed.length}</div>
                <div className="text-sm text-red-300">
                  {getFailedIntentsText()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleBulkApply}
            disabled={isApplying || selectedIntents.length === 0 || selectedDevices.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isApplying ? (
              'Applying...'
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Apply to {selectedDevices.length} devices
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
