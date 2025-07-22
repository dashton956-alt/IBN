
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/urlsCentral';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from './use-toast';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

interface NetworkAlert {
  id: string;
  alert_type: string;
  severity: AlertSeverity;
  title: string;
  description?: string;
  device_id?: string;
  intent_id?: string;
  metric_value?: number;
  threshold_value?: number;
  status: AlertStatus;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export const useNetworkAlerts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['network-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('network_alerts')
        .select(`
          *,
          network_devices:device_id (
            name,
            ip_address
          ),
          network_intents:intent_id (
            title
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as NetworkAlert[];
    },
    enabled: !!user,
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('network_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network-alerts'] });
      toast({
        title: "Alert Acknowledged",
        description: "The alert has been acknowledged",
      });
    },
  });

  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('network_alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network-alerts'] });
      toast({
        title: "Alert Resolved",
        description: "The alert has been resolved",
      });
    },
  });

  const createAlertMutation = useMutation({
    mutationFn: async (alert: Omit<NetworkAlert, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('network_alerts')
        .insert(alert);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network-alerts'] });
    },
  });

  // Real-time subscription
  const { data: realtimeAlerts } = useQuery({
    queryKey: ['realtime-alerts'],
    queryFn: async () => {
      const channel = supabase
        .channel('network_alerts')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'network_alerts' },
          (payload) => {
            queryClient.invalidateQueries({ queryKey: ['network-alerts'] });
            
            if (payload.eventType === 'INSERT') {
              const newAlert = payload.new as NetworkAlert;
              if (newAlert.severity === 'critical' || newAlert.severity === 'high') {
                toast({
                  title: `${newAlert.severity.toUpperCase()} Alert`,
                  description: newAlert.title,
                  variant: newAlert.severity === 'critical' ? 'destructive' : 'default',
                });
              }
            }
          }
        )
        .subscribe();

      return channel;
    },
    enabled: !!user,
  });

  const activeAlerts = alerts?.filter(alert => alert.status === 'active') ?? [];
  const criticalAlerts = alerts?.filter(alert => alert.severity === 'critical' && alert.status === 'active') ?? [];

  return {
    alerts,
    activeAlerts,
    criticalAlerts,
    isLoading,
    acknowledgeAlert: acknowledgeAlertMutation.mutate,
    resolveAlert: resolveAlertMutation.mutate,
    createAlert: createAlertMutation.mutate,
    isAcknowledging: acknowledgeAlertMutation.isPending,
    isResolving: resolveAlertMutation.isPending,
  };
};
