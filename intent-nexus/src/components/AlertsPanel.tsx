
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';
import { useNetworkAlerts, type AlertSeverity } from '@/hooks/useNetworkAlerts';
import { formatDistanceToNow } from 'date-fns';

export const AlertsPanel = () => {
  const { alerts, activeAlerts, criticalAlerts, acknowledgeAlert, resolveAlert, isAcknowledging, isResolving } = useNetworkAlerts();
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);

  const getSeverityColor = (severity: AlertSeverity): string => {
    switch (severity) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-yellow-600';
      case 'low': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    if (severity === 'critical' || severity === 'high') {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  return (
    <Card className="bg-slate-900 border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Network Alerts
          {criticalAlerts.length > 0 && (
            <Badge className="bg-red-600 text-white">
              {criticalAlerts.length} Critical
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-blue-200/70">
          Real-time monitoring alerts and notifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-red-600/20 border border-red-600/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-red-400 font-medium">Critical</span>
            </div>
            <div className="text-2xl text-white font-bold">
              {alerts?.filter(a => a.severity === 'critical' && a.status === 'active').length ?? 0}
            </div>
          </div>

          <div className="bg-orange-600/20 border border-orange-600/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <span className="text-orange-400 font-medium">High</span>
            </div>
            <div className="text-2xl text-white font-bold">
              {alerts?.filter(a => a.severity === 'high' && a.status === 'active').length ?? 0}
            </div>
          </div>

          <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="text-blue-400 font-medium">Total Active</span>
            </div>
            <div className="text-2xl text-white font-bold">
              {activeAlerts.length}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-white font-medium">Recent Alerts</h3>
          <ScrollArea className="h-96 border border-white/20 rounded-lg p-3">
            <div className="space-y-3">
              {alerts?.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    selectedAlert === alert.id
                      ? 'border-blue-500 bg-blue-600/10'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                  onClick={() => setSelectedAlert(alert.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)}/20`}>
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium">{alert.title}</span>
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          <Badge variant="outline" className={
                            alert.status === 'active' ? 'border-red-500 text-red-400' :
                            alert.status === 'acknowledged' ? 'border-yellow-500 text-yellow-400' :
                            'border-green-500 text-green-400'
                          }>
                            {alert.status}
                          </Badge>
                        </div>
                        {alert.description && (
                          <p className="text-sm text-blue-200/70 mb-2">{alert.description}</p>
                        )}
                        <div className="text-xs text-blue-200/60">
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    {alert.status === 'active' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            acknowledgeAlert(alert.id);
                          }}
                          disabled={isAcknowledging}
                          className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Acknowledge
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            resolveAlert(alert.id);
                          }}
                          disabled={isResolving}
                          className="border-green-500 text-green-400 hover:bg-green-500/10"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Resolve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
