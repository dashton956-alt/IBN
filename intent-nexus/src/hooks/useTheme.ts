
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/urlsCentral';
import { useAuth } from '@/contexts/AuthContext';

export type Theme = 'light' | 'dark' | 'auto';

interface UserPreferences {
  id: string;
  user_id: string;
  theme: Theme;
  dashboard_layout: any;
  notification_settings: any;
  created_at: string;
  updated_at: string;
}

export const useTheme = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as UserPreferences | null;
    },
    enabled: !!user,
  });

  const updateThemeMutation = useMutation({
    mutationFn: async (theme: Theme) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          theme,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
    },
  });

  const updateDashboardLayoutMutation = useMutation({
    mutationFn: async (layout: any) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          dashboard_layout: layout,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
    },
  });

  const currentTheme = preferences?.theme ?? 'dark';

  return {
    theme: currentTheme,
    dashboardLayout: preferences?.dashboard_layout ?? {},
    notificationSettings: preferences?.notification_settings ?? {},
    isLoading,
    setTheme: updateThemeMutation.mutate,
    updateDashboardLayout: updateDashboardLayoutMutation.mutate,
    isUpdating: updateThemeMutation.isPending || updateDashboardLayoutMutation.isPending,
  };
};
