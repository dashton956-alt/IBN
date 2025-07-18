
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const NetworkMetrics = () => {
  const [metrics, setMetrics] = useState({
    uptime: 98.7,
    latency: 12,
    packetLoss: 0.02,
    jitter: 2.1,
    throughput: 847,
    activeSessions: 1234
  });

  const [deviceMetrics] = useState([
    { name: "Core-SW-01", cpu: 23, memory: 67, status: "online", uptime: "45d 12h" },
    { name: "Core-SW-02", cpu: 19, memory: 62, status: "online", uptime: "45d 12h" },
    { name: "Dist-SW-01", cpu: 34, memory: 45, status: "online", uptime: "45d 12h" },
    { name: "Dist-SW-02", cpu: 28, memory: 52, status: "online", uptime: "45d 12h" },
    { name: "Access-SW-01", cpu: 67, memory: 78, status: "warning", uptime: "12d 6h" },
    { name: "Access-SW-02", cpu: 15, memory: 34, status: "online", uptime: "45d 12h" },
    { name: "Access-SW-03", cpu: 22, memory: 41, status: "online", uptime: "45d 12h" },
    { name: "Access-SW-04", cpu: 0, memory: 0, status: "offline", uptime: "0d 0h" },
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        latency: Math.max(5, Math.min(50, prev.latency + (Math.random() - 0.5) * 5)),
        throughput: Math.max(200, Math.min(1000, prev.throughput + (Math.random() - 0.5) * 100)),
        packetLoss: Math.max(0, Math.min(1, prev.packetLoss + (Math.random() - 0.5) * 0.1)),
        jitter: Math.max(0.5, Math.min(10, prev.jitter + (Math.random() - 0.5) * 1)),
        activeSessions: Math.max(800, Math.min(2000, prev.activeSessions + Math.floor((Math.random() - 0.5) * 50)))
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "text-green-400 border-green-400/30 bg-green-400/10";
      case "warning": return "text-yellow-400 border-yellow-400/30 bg-yellow-400/10";
      case "offline": return "text-red-400 border-red-400/30 bg-red-400/10";
      default: return "text-gray-400 border-gray-400/30 bg-gray-400/10";
    }
  };

  const getMetricColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return "text-red-400";
    if (value >= thresholds.warning) return "text-yellow-400";
    return "text-green-400";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Network Monitoring</h2>
        <p className="text-blue-200/70">Real-time network performance metrics and device health monitoring</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">{metrics.uptime}%</div>
            <div className="text-blue-200/70 text-sm">Network Uptime</div>
            <Progress value={metrics.uptime} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold mb-1 ${getMetricColor(metrics.latency, { warning: 20, critical: 40 })}`}>
              {metrics.latency.toFixed(1)}ms
            </div>
            <div className="text-blue-200/70 text-sm">Avg Latency</div>
          </CardContent>
        </Card>

        <Card className="bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold mb-1 ${getMetricColor(metrics.packetLoss, { warning: 0.1, critical: 0.5 })}`}>
              {metrics.packetLoss.toFixed(2)}%
            </div>
            <div className="text-blue-200/70 text-sm">Packet Loss</div>
          </CardContent>
        </Card>

        <Card className="bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold mb-1 ${getMetricColor(metrics.jitter, { warning: 5, critical: 8 })}`}>
              {metrics.jitter.toFixed(1)}ms
            </div>
            <div className="text-blue-200/70 text-sm">Jitter</div>
          </CardContent>
        </Card>

        <Card className="bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">{metrics.throughput}</div>
            <div className="text-blue-200/70 text-sm">Throughput (Mbps)</div>
          </CardContent>
        </Card>

        <Card className="bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-400 mb-1">{metrics.activeSessions}</div>
            <div className="text-blue-200/70 text-sm">Active Sessions</div>
          </CardContent>
        </Card>
      </div>

      {/* Device Health */}
      <Card className="bg-black/20 backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Device Health Monitoring</CardTitle>
          <CardDescription className="text-blue-200/70">
            Real-time CPU, memory, and status monitoring for all network devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {deviceMetrics.map((device, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-white/10">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 rounded-full bg-current animate-pulse" 
                       style={{ color: device.status === "online" ? "#10b981" : device.status === "warning" ? "#f59e0b" : "#ef4444" }} />
                  <div>
                    <div className="text-white font-medium">{device.name}</div>
                    <div className="text-blue-200/60 text-sm">Uptime: {device.uptime}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-xs text-blue-200/60 mb-1">CPU</div>
                    <div className={`text-sm font-medium ${getMetricColor(device.cpu, { warning: 70, critical: 90 })}`}>
                      {device.cpu}%
                    </div>
                    <Progress value={device.cpu} className="w-16 h-1 mt-1" />
                  </div>
                  
                  <div className="text-center">
                    <div className="text-xs text-blue-200/60 mb-1">Memory</div>
                    <div className={`text-sm font-medium ${getMetricColor(device.memory, { warning: 80, critical: 95 })}`}>
                      {device.memory}%
                    </div>
                    <Progress value={device.memory} className="w-16 h-1 mt-1" />
                  </div>
                  
                  <Badge className={`${getStatusColor(device.status)} min-w-20 justify-center`} variant="outline">
                    {device.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alerts & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-r from-red-900/20 to-orange-900/20 backdrop-blur-sm border-red-400/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              🚨 Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
              <div>
                <div className="text-white font-medium">High CPU on Access-SW-01</div>
                <div className="text-red-200/70 text-sm">CPU utilization at 67% - investigate traffic load</div>
              </div>
              <Badge className="bg-red-600/20 text-red-300 border-red-400/30">Critical</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
              <div>
                <div className="text-white font-medium">Device Offline</div>
                <div className="text-red-200/70 text-sm">Access-SW-04 is unreachable - check power/connectivity</div>
              </div>
              <Badge className="bg-red-600/20 text-red-300 border-red-400/30">Critical</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 backdrop-blur-sm border-purple-400/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              🤖 AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-black/20 rounded-lg">
              <div className="text-white font-medium mb-1">Load Balancing Optimization</div>
              <div className="text-purple-200/70 text-sm">Consider redistributing traffic from Access-SW-01 to reduce CPU load</div>
            </div>
            
            <div className="p-3 bg-black/20 rounded-lg">
              <div className="text-white font-medium mb-1">Redundancy Enhancement</div>
              <div className="text-purple-200/70 text-sm">Add redundant link between distribution switches for improved resilience</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
