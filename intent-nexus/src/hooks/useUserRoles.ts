
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from './use-toast';

export type UserRole = 'admin' | 'engineer' | 'viewer' | 'approver';

interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  assigned_by?: string;
  assigned_at: string;
}

export const useUserRoles = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: userRoles, isLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as UserRoleRecord[];
    },
    enabled: !!user,
  });

  const hasRole = (role: UserRole): boolean => {
    return userRoles?.some(r => r.role === role) ?? false;
  };

  const { data: allUserRoles } = useQuery({
    queryKey: ['all-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `);

      if (error) throw error;
      return data;
    },
    enabled: !!user && hasRole('admin'),
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role,
          assigned_by: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-roles'] });
      toast({
        title: "Role Assigned",
        description: "User role has been successfully assigned",
      });
    },
    onError: (error) => {
      toast({
        title: "Assignment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-roles'] });
      toast({
        title: "Role Removed",
        description: "User role has been successfully removed",
      });
    },
    onError: (error) => {
      toast({
        title: "Removal Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getRoles = (): UserRole[] => {
    return userRoles?.map(r => r.role) ?? [];
  };

  return {
    userRoles,
    allUserRoles,
    isLoading,
    hasRole,
    getRoles,
    assignRole: assignRoleMutation.mutate,
    removeRole: removeRoleMutation.mutate,
    isAssigning: assignRoleMutation.isPending,
    isRemoving: removeRoleMutation.isPending,
  };
};
