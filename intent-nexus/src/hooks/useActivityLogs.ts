
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

interface ActivityLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export const useActivityLogs = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: activityLogs, isLoading } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ActivityLog[];
    },
    enabled: !!user,
  });

  const logActivityMutation = useMutation({
    mutationFn: async ({
      action,
      resourceType,
      resourceId,
      details,
    }: {
      action: string;
      resourceType: string;
      resourceId?: string;
      details?: any;
    }) => {
      const { error } = await supabase
        .from('activity_logs')
        .insert({
          user_id: user?.id,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          details,
          ip_address: await fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => data.ip)
            .catch(() => null),
          user_agent: navigator.userAgent,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    },
  });

  return {
    activityLogs,
    isLoading,
    logActivity: logActivityMutation.mutate,
    isLogging: logActivityMutation.isPending,
  };
};
