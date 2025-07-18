
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, GitCompare, Clock, Play, Calendar, RefreshCw } from 'lucide-react';
import { useConfigComparison } from '@/hooks/useConfigComparison';
import { useNetworkDevices } from '@/hooks/useNetworkData';
import { LoadingSpinner } from './LoadingSpinner';
import { ConfigDifferencesList } from './ConfigDifferencesList';
import { ScheduleComparisonDialog } from './ScheduleComparisonDialog';
import { ScheduleManagement } from './ScheduleManagement';

export const ConfigComparison = () => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  
  const { data: devices = [] } = useNetworkDevices();
  const { 
    comparisons, 
    isLoading, 
    compareDevice, 
    refreshHistory 
  } = useConfigComparison();

  const handleInstantComparison = async (deviceId: string, deviceIp: string) => {
    try {
      await compareDevice(deviceId, deviceIp);
    } catch (error) {
      console.error('Comparison failed:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-600/20 text-green-300 border-green-400/30';
      case 'running': return 'bg-blue-600/20 text-blue-300 border-blue-400/30';
      case 'failed': return 'bg-red-600/20 text-red-300 border-red-400/30';
      default: return 'bg-yellow-600/20 text-yellow-300 border-yellow-400/30';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-blue-400';
    }
  };

  // Transform devices to match the expected interface
  const transformedDevices = devices.map(device => ({
    id: device.id,
    name: device.name,
    ip_address: String(device.ip_address || ''),
    status: device.status,
    vendor: String(device.vendor || ''),
    model: String(device.model || '')
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-black/20 backdrop-blur-sm border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <GitCompare className="h-5 w-5" />
                Configuration Comparison
              </CardTitle>
              <CardDescription className="text-blue-200/70">
                Compare NetBox configurations with actual network devices
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowScheduleDialog(true)}
                variant="outline"
                className="border-blue-400/30 text-blue-300 hover:bg-blue-600/10"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Quick Schedule
              </Button>
              <Button
                onClick={refreshHistory}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="instant" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-black/20 backdrop-blur-sm border border-white/10">
          <TabsTrigger value="instant" className="data-[state=active]:bg-blue-600/30">
            Instant Comparison
          </TabsTrigger>
          <TabsTrigger value="schedules" className="data-[state=active]:bg-blue-600/30">
            Schedule Management
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-blue-600/30">
            Comparison History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instant" className="mt-6">
          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Run Instant Comparison</CardTitle>
              <CardDescription className="text-blue-200/70">
                Compare a device's current configuration with NetBox
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {transformedDevices.map((device) => (
                  <Card key={device.id} className="bg-black/30 border-white/10 hover:border-blue-400/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-white font-medium">{device.name}</div>
                          <div className="text-blue-200/70 text-sm">{device.ip_address}</div>
                        </div>
                        <Badge className={getStatusColor(device.status)}>
                          {device.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-blue-200/60 mb-3">
                        {device.vendor} {device.model}
                      </div>
                      <Button
                        onClick={() => handleInstantComparison(device.id, device.ip_address)}
                        disabled={isLoading || device.status !== 'online'}
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {isLoading ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Compare
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules" className="mt-6">
          <ScheduleManagement />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Comparison History</CardTitle>
              <CardDescription className="text-blue-200/70">
                Recent configuration comparison results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {comparisons.map((comparison) => (
                    <Card key={comparison.id} className="bg-black/30 border-white/10">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="text-white font-medium">{comparison.device_name}</div>
                              <div className="text-blue-200/70 text-sm">{comparison.device_ip}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={getStatusColor(comparison.status)}>
                              {comparison.status}
                            </Badge>
                            {comparison.comparison_type === 'scheduled' && (
                              <Badge className="bg-purple-600/20 text-purple-300 border-purple-400/30">
                                <Clock className="h-3 w-3 mr-1" />
                                Scheduled
                              </Badge>
                            )}
                          </div>
                        </div>

                        {comparison.status === 'completed' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-blue-200/70">Configuration Drift</span>
                              <span className="text-white font-medium">{comparison.drift_percentage}%</span>
                            </div>
                            <Progress value={comparison.drift_percentage} className="h-2" />
                            
                            <div className="flex gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <AlertTriangle className="h-4 w-4 text-red-400" />
                                <span className="text-red-400">
                                  {comparison.differences.filter(d => d.severity === 'critical').length} Critical
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                                <span className="text-yellow-400">
                                  {comparison.differences.filter(d => d.severity === 'warning').length} Warnings
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-4 w-4 text-blue-400" />
                                <span className="text-blue-400">
                                  {comparison.differences.filter(d => d.severity === 'info').length} Info
                                </span>
                              </div>
                            </div>

                            <ConfigDifferencesList differences={comparison.differences} />
                          </div>
                        )}

                        <div className="text-xs text-blue-200/60 mt-3">
                          Created: {new Date(comparison.created_at).toLocaleString()}
                          {comparison.completed_at && (
                            <> • Completed: {new Date(comparison.completed_at).toLocaleString()}</>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ScheduleComparisonDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        devices={transformedDevices}
      />
    </div>
  );
};
