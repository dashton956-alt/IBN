
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNetworkMetrics } from '@/hooks/useNetworkData';
import { useNetworkAlerts } from '@/hooks/useNetworkAlerts';

export const EnhancedAnalyticsDashboard = () => {
  const { data: metrics } = useNetworkMetrics();
  const { alerts, activeAlerts, criticalAlerts } = useNetworkAlerts();

  // Sample data for charts
  const performanceData = [
    { name: 'Jan', cpu: 65, memory: 80, network: 45 },
    { name: 'Feb', cpu: 70, memory: 75, network: 50 },
    { name: 'Mar', cpu: 55, memory: 85, network: 60 },
    { name: 'Apr', cpu: 80, memory: 70, network: 55 },
    { name: 'May', cpu: 75, memory: 90, network: 65 },
    { name: 'Jun', cpu: 85, memory: 85, network: 70 },
  ];

  const alertsData = [
    { name: 'Critical', value: criticalAlerts.length, color: '#DC2626' },
    { name: 'High', value: alerts?.filter(a => a.severity === 'high' && a.status === 'active').length || 0, color: '#EA580C' },
    { name: 'Medium', value: alerts?.filter(a => a.severity === 'medium' && a.status === 'active').length || 0, color: '#CA8A04' },
    { name: 'Low', value: alerts?.filter(a => a.severity === 'low' && a.status === 'active').length || 0, color: '#2563EB' },
  ];

  const deviceStatusData = [
    { name: 'Online', value: 85, color: '#16A34A' },
    { name: 'Offline', value: 10, color: '#DC2626' },
    { name: 'Warning', value: 5, color: '#CA8A04' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200/70">Total Devices</p>
                <p className="text-2xl font-bold text-white">124</p>
              </div>
              <Activity className="h-8 w-8 text-blue-400" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
              <span className="text-sm text-green-400">+5.2%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200/70">Active Alerts</p>
                <p className="text-2xl font-bold text-white">{activeAlerts.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-400" />
            </div>
            <div className="flex items-center mt-2">
              <span className="text-sm text-red-400">
                {criticalAlerts.length} Critical
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200/70">Uptime</p>
                <p className="text-2xl font-bold text-white">99.9%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <div className="flex items-center mt-2">
              <span className="text-sm text-green-400">
                Last 30 days
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200/70">Avg Response</p>
                <p className="text-2xl font-bold text-white">12ms</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400" />
            </div>
            <div className="flex items-center mt-2">
              <span className="text-sm text-green-400">
                -2.1ms from last week
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="bg-slate-800 border-white/20">
          <TabsTrigger value="performance" className="data-[state=active]:bg-blue-600">
            Performance Metrics
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-blue-600">
            Alert Distribution
          </TabsTrigger>
          <TabsTrigger value="devices" className="data-[state=active]:bg-blue-600">
            Device Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <Card className="bg-slate-900 border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Performance Trends</CardTitle>
              <CardDescription className="text-blue-200/70">
                CPU, Memory, and Network utilization over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                    />
                    <Line type="monotone" dataKey="cpu" stroke="#3B82F6" strokeWidth={2} />
                    <Line type="monotone" dataKey="memory" stroke="#10B981" strokeWidth={2} />
                    <Line type="monotone" dataKey="network" stroke="#F59E0B" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-900 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Alert Severity Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={alertsData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {alertsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Alerts by Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={alertsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="value">
                        {alertsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="devices">
          <Card className="bg-slate-900 border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Device Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceStatusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {deviceStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
