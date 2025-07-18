
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, UserPlus, Shield, Trash2 } from 'lucide-react';
import { useUserRoles, type UserRole } from '@/hooks/useUserRoles';

export const UserRoleManager = () => {
  const { userRoles, allUserRoles, hasRole, assignRole, removeRole, isAssigning, isRemoving } = useUserRoles();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('viewer');

  if (!hasRole('admin')) {
    return (
      <Card className="bg-slate-900 border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-200/70">You don't have permission to manage user roles.</p>
        </CardContent>
      </Card>
    );
  }

  const handleAssignRole = () => {
    if (selectedUserId && selectedRole) {
      assignRole({ userId: selectedUserId, role: selectedRole });
      setSelectedUserId('');
      setSelectedRole('viewer');
    }
  };

  const getRoleColor = (role: UserRole): string => {
    switch (role) {
      case 'admin': return 'bg-red-600';
      case 'engineer': return 'bg-blue-600';
      case 'approver': return 'bg-green-600';
      case 'viewer': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <Card className="bg-slate-900 border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Role Management
        </CardTitle>
        <CardDescription className="text-blue-200/70">
          Manage user roles and permissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Assign New Role */}
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Assign Role
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="User ID"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="bg-slate-800 border-white/20 text-white"
              />
              <Select value={selectedRole} onValueChange={(value: UserRole) => setSelectedRole(value)}>
                <SelectTrigger className="bg-slate-800 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="engineer">Engineer</SelectItem>
                  <SelectItem value="approver">Approver</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleAssignRole}
                disabled={!selectedUserId || !selectedRole || isAssigning}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isAssigning ? 'Assigning...' : 'Assign Role'}
              </Button>
            </div>
          </div>

          {/* Current Roles */}
          <div className="space-y-4">
            <h3 className="text-white font-medium">Current User Roles</h3>
            <ScrollArea className="h-96 border border-white/20 rounded-lg p-3">
              <div className="space-y-3">
                {allUserRoles?.map((roleRecord: any) => (
                  <div
                    key={roleRecord.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">
                          {roleRecord.profiles?.full_name || 'Unknown User'}
                        </span>
                        <span className="text-sm text-blue-200/70">
                          {roleRecord.profiles?.email}
                        </span>
                      </div>
                      <Badge className={getRoleColor(roleRecord.role)}>
                        {roleRecord.role}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeRole(roleRecord.id)}
                      disabled={isRemoving}
                      className="border-red-500 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Your Roles */}
          <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">Your Roles</h3>
            <div className="flex gap-2 flex-wrap">
              {userRoles?.map((role) => (
                <Badge key={role.id} className={getRoleColor(role.role)}>
                  {role.role}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
