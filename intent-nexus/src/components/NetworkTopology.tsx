
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

export const NetworkTopology = () => {
  const [devices, setDevices] = useState([
    { id: 1, name: "Core-SW-01", type: "core", status: "online", x: 50, y: 20 },
    { id: 2, name: "Core-SW-02", type: "core", status: "online", x: 50, y: 80 },
    { id: 3, name: "Dist-SW-01", type: "distribution", status: "online", x: 20, y: 50 },
    { id: 4, name: "Dist-SW-02", type: "distribution", status: "online", x: 80, y: 50 },
    { id: 5, name: "Access-SW-01", type: "access", status: "warning", x: 10, y: 30 },
    { id: 6, name: "Access-SW-02", type: "access", status: "online", x: 10, y: 70 },
    { id: 7, name: "Access-SW-03", type: "access", status: "online", x: 90, y: 30 },
    { id: 8, name: "Access-SW-04", type: "access", status: "offline", x: 90, y: 70 },
  ]);

  const getDeviceColor = (status: string) => {
    switch (status) {
      case "online": return "text-green-400 border-green-400/30 bg-green-400/10";
      case "warning": return "text-yellow-400 border-yellow-400/30 bg-yellow-400/10";
      case "offline": return "text-red-400 border-red-400/30 bg-red-400/10";
      default: return "text-gray-400 border-gray-400/30 bg-gray-400/10";
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "core": return "⚡";
      case "distribution": return "🔗";
      case "access": return "📡";
      default: return "📦";
    }
  };

  return (
    <div className="relative h-96 bg-gradient-to-br from-slate-800/50 to-blue-900/30 rounded-lg border border-white/10 overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" className="text-blue-300" />
        </svg>
      </div>

      {/* Connection Lines */}
      <svg className="absolute inset-0 w-full h-full">
        {/* Core to Distribution */}
        <line x1="50%" y1="20%" x2="20%" y2="50%" stroke="rgb(59 130 246)" strokeWidth="2" opacity="0.6" />
        <line x1="50%" y1="20%" x2="80%" y2="50%" stroke="rgb(59 130 246)" strokeWidth="2" opacity="0.6" />
        <line x1="50%" y1="80%" x2="20%" y2="50%" stroke="rgb(59 130 246)" strokeWidth="2" opacity="0.6" />
        <line x1="50%" y1="80%" x2="80%" y2="50%" stroke="rgb(59 130 246)" strokeWidth="2" opacity="0.6" />
        
        {/* Distribution to Access */}
        <line x1="20%" y1="50%" x2="10%" y2="30%" stroke="rgb(34 197 94)" strokeWidth="1.5" opacity="0.5" />
        <line x1="20%" y1="50%" x2="10%" y2="70%" stroke="rgb(34 197 94)" strokeWidth="1.5" opacity="0.5" />
        <line x1="80%" y1="50%" x2="90%" y2="30%" stroke="rgb(34 197 94)" strokeWidth="1.5" opacity="0.5" />
        <line x1="80%" y1="50%" x2="90%" y2="70%" stroke="rgb(239 68 68)" strokeWidth="1.5" opacity="0.5" />
      </svg>

      {/* Devices */}
      {devices.map((device) => (
        <div
          key={device.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
          style={{ left: `${device.x}%`, top: `${device.y}%` }}
        >
          <div className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center backdrop-blur-sm transition-all duration-200 group-hover:scale-110 ${getDeviceColor(device.status)}`}>
            <span className="text-lg">{getDeviceIcon(device.type)}</span>
          </div>
          
          {/* Device Info Tooltip */}
          <div className="absolute top-14 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-white/20 min-w-max">
              <div className="text-white font-medium text-sm">{device.name}</div>
              <div className="text-blue-200/70 text-xs capitalize">{device.type} Switch</div>
              <Badge className={`mt-1 text-xs ${getDeviceColor(device.status)}`}>
                {device.status}
              </Badge>
            </div>
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-sm rounded-lg p-3 border border-white/10">
        <div className="text-white text-xs font-medium mb-2">Device Types</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <span>⚡</span>
            <span className="text-blue-200/70">Core</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>🔗</span>
            <span className="text-blue-200/70">Distribution</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>📡</span>
            <span className="text-blue-200/70">Access</span>
          </div>
        </div>
      </div>
    </div>
  );
};
