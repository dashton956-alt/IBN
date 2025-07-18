
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Settings, Users, Activity, BarChart3, AlertTriangle } from 'lucide-react';
import { BulkOperations } from '@/components/BulkOperations';
import { AlertsPanel } from '@/components/AlertsPanel';
import { UserRoleManager } from '@/components/UserRoleManager';
import { ActivityLogger } from '@/components/ActivityLogger';
import { EnhancedAnalyticsDashboard } from '@/components/EnhancedAnalyticsDashboard';
import { SearchAndFilter } from '@/components/SearchAndFilter';
import { useUserRoles } from '@/hooks/useUserRoles';

export default function Dashboard() {
  const { hasRole } = useUserRoles();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const filterOptions = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'pending', label: 'Pending' },
      ]
    },
    {
      key: 'type',
      label: 'Type',
      options: [
        { value: 'device', label: 'Device' },
        { value: 'intent', label: 'Intent' },
        { value: 'alert', label: 'Alert' },
      ]
    }
  ];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    console.log('Search query:', query);
  };

  const handleFilter = (newFilters: Record<string, string>) => {
    setFilters(newFilters);
    console.log('Applied filters:', newFilters);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilters({});
    console.log('Filters cleared');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Network Operations Dashboard</h1>
            <p className="text-blue-200/70 mt-2">
              Comprehensive network management and monitoring platform
            </p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>

        {/* Search and Filter */}
        <SearchAndFilter
          searchPlaceholder="Search devices, intents, alerts..."
          filterOptions={filterOptions}
          onSearch={handleSearch}
          onFilter={handleFilter}
          onClear={handleClearFilters}
        />

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-slate-800 border-white/20">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="operations" className="data-[state=active]:bg-blue-600">
              <Settings className="h-4 w-4 mr-2" />
              Operations
            </TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-blue-600">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Alerts
            </TabsTrigger>
            {hasRole('admin') && (
              <TabsTrigger value="users" className="data-[state=active]:bg-blue-600">
                <Users className="h-4 w-4 mr-2" />
                User Management
              </TabsTrigger>
            )}
            <TabsTrigger value="activity" className="data-[state=active]:bg-blue-600">
              <Activity className="h-4 w-4 mr-2" />
              Activity Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <EnhancedAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="operations" className="space-y-6">
            <BulkOperations />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <AlertsPanel />
          </TabsContent>

          {hasRole('admin') && (
            <TabsContent value="users" className="space-y-6">
              <UserRoleManager />
            </TabsContent>
          )}

          <TabsContent value="activity" className="space-y-6">
            <ActivityLogger />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
