
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, User, Database, Settings } from 'lucide-react';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { formatDistanceToNow } from 'date-fns';

export const ActivityLogger = () => {
  const { activityLogs, isLoading } = useActivityLogs();

  const getResourceIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'user': return <User className="h-3 w-3" />;
      case 'device': return <Database className="h-3 w-3" />;
      case 'intent': return <Settings className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  const getActionColor = (action: string): string => {
    if (action.includes('create')) return 'bg-green-600';
    if (action.includes('update')) return 'bg-blue-600';
    if (action.includes('delete')) return 'bg-red-600';
    return 'bg-gray-600';
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Loading activity logs...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Logs
        </CardTitle>
        <CardDescription className="text-blue-200/70">
          Track all user activities and system changes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96 border border-white/20 rounded-lg p-3">
          <div className="space-y-3">
            {activityLogs?.map((log: any) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className={`p-2 rounded-full ${getActionColor(log.action)}/20`}>
                  {getResourceIcon(log.resource_type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium">{log.action}</span>
                    <Badge className={getActionColor(log.action)}>
                      {log.resource_type}
                    </Badge>
                  </div>
                  <div className="text-sm text-blue-200/70 mb-1">
                    by {log.profiles?.full_name || 'System'}
                  </div>
                  {log.details && (
                    <div className="text-xs text-blue-200/60 mb-2">
                      {typeof log.details === 'object' 
                        ? JSON.stringify(log.details, null, 2)
                        : log.details
                      }
                    </div>
                  )}
                  <div className="text-xs text-blue-200/60">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
