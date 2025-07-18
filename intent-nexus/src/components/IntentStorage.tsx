
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface StoredIntent {
  id: string;
  description: string;
  changeNumber: string;
  author: string;
  createdAt: string;
  status: "active" | "inactive" | "pending";
  type: string;
  config: string;
  version: number;
}

export const IntentStorage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [intents] = useState<StoredIntent[]>([
    {
      id: "intent-001",
      description: "Marketing VLAN 100 with internet access and file server connectivity",
      changeNumber: "CHG-2024-001",
      author: "john.doe@company.com",
      createdAt: "2024-01-15T10:30:00Z",
      status: "active",
      type: "VLAN",
      config: "configure\n  devices device core-sw-01\n    config\n      ios:interface Vlan100...",
      version: 1
    },
    {
      id: "intent-002",
      description: "QoS policy for VoIP traffic prioritization across all access switches",
      changeNumber: "CHG-2024-002",
      author: "sarah.johnson@company.com",
      createdAt: "2024-01-14T14:15:00Z",
      status: "pending",
      type: "QoS",
      config: "configure\n  devices device-group access-switches\n    config\n      ios:policy-map VOIP_PRIORITY...",
      version: 2
    },
    {
      id: "intent-003",
      description: "Guest network ACL restrictions for security isolation",
      changeNumber: "CHG-2024-003",
      author: "alex.chen@company.com",
      createdAt: "2024-01-13T09:45:00Z",
      status: "active",
      type: "ACL",
      config: "configure\n  devices device-group all-switches\n    config\n      ios:ip access-list extended GUEST_RESTRICT...",
      version: 1
    },
    {
      id: "intent-004",
      description: "Trunk configuration for inter-switch connectivity",
      changeNumber: "CHG-2024-004",
      author: "mike.wilson@company.com",
      createdAt: "2024-01-12T16:20:00Z",
      status: "inactive",
      type: "Interface",
      config: "configure\n  devices device core-sw-01\n    config\n      ios:interface GigabitEthernet0/1...",
      version: 3
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-600/20 text-green-300 border-green-400/30";
      case "pending": return "bg-yellow-600/20 text-yellow-300 border-yellow-400/30";
      case "inactive": return "bg-gray-600/20 text-gray-300 border-gray-400/30";
      default: return "bg-gray-600/20 text-gray-300 border-gray-400/30";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "VLAN": return "bg-blue-600/20 text-blue-300 border-blue-400/30";
      case "QoS": return "bg-purple-600/20 text-purple-300 border-purple-400/30";
      case "ACL": return "bg-red-600/20 text-red-300 border-red-400/30";
      case "Interface": return "bg-teal-600/20 text-teal-300 border-teal-400/30";
      default: return "bg-gray-600/20 text-gray-300 border-gray-400/30";
    }
  };

  const filteredIntents = intents.filter(intent => {
    const matchesSearch = intent.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         intent.changeNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || intent.status === statusFilter;
    const matchesType = typeFilter === "all" || intent.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleViewConfig = (intent: StoredIntent) => {
    toast({
      title: "Configuration Viewer",
      description: `Displaying configuration for ${intent.changeNumber}`,
    });
  };

  const handleActivateIntent = (intent: StoredIntent) => {
    toast({
      title: "Intent Activated",
      description: `${intent.changeNumber} has been activated and deployed via NSO`,
    });
  };

  const handleDeactivateIntent = (intent: StoredIntent) => {
    toast({
      title: "Intent Deactivated",
      description: `${intent.changeNumber} has been deactivated and configuration removed`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-white mb-1">{intents.length}</div>
            <div className="text-blue-200/70 text-sm">Total Intents</div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {intents.filter(i => i.status === "active").length}
            </div>
            <div className="text-blue-200/70 text-sm">Active</div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-400 mb-1">
              {intents.filter(i => i.status === "pending").length}
            </div>
            <div className="text-blue-200/70 text-sm">Pending</div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-400 mb-1">
              {intents.filter(i => i.status === "inactive").length}
            </div>
            <div className="text-blue-200/70 text-sm">Inactive</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-black/20 backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Intent Storage & Management</CardTitle>
          <CardDescription className="text-blue-200/70">
            Search, filter, and manage your network intents with version control
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search intents or change numbers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-black/20 border-white/20 text-white placeholder:text-blue-200/50 flex-1"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-black/20 border-white/20 text-white w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-white/20">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-black/20 border-white/20 text-white w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-white/20">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="VLAN">VLAN</SelectItem>
                <SelectItem value="QoS">QoS</SelectItem>
                <SelectItem value="ACL">ACL</SelectItem>
                <SelectItem value="Interface">Interface</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Intents List */}
      <div className="grid gap-4">
        {filteredIntents.map((intent) => (
          <Card key={intent.id} className="bg-black/20 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-200">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <CardTitle className="text-white text-lg">{intent.description}</CardTitle>
                    <Badge className={getStatusColor(intent.status)} variant="outline">
                      {intent.status}
                    </Badge>
                    <Badge className={getTypeColor(intent.type)} variant="outline">
                      {intent.type}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-xs text-blue-200/60 uppercase tracking-wide mb-1">Change Number</div>
                  <div className="text-white font-mono text-sm">{intent.changeNumber}</div>
                </div>
                <div>
                  <div className="text-xs text-blue-200/60 uppercase tracking-wide mb-1">Author</div>
                  <div className="text-white text-sm">{intent.author}</div>
                </div>
                <div>
                  <div className="text-xs text-blue-200/60 uppercase tracking-wide mb-1">Version</div>
                  <div className="text-white text-sm">v{intent.version}</div>
                </div>
                <div>
                  <div className="text-xs text-blue-200/60 uppercase tracking-wide mb-1">Created</div>
                  <div className="text-white text-sm">
                    {new Date(intent.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="bg-black/40 rounded-lg p-3 mb-4 border border-white/10">
                <div className="text-xs text-blue-200/60 uppercase tracking-wide mb-2">Configuration Preview</div>
                <pre className="text-xs text-green-300 font-mono truncate">
                  {intent.config.substring(0, 100)}...
                </pre>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewConfig(intent)}
                  className="border-blue-400/30 text-blue-300 hover:bg-blue-600/10"
                >
                  View Full Config
                </Button>
                
                {intent.status === "inactive" && (
                  <Button
                    size="sm"
                    onClick={() => handleActivateIntent(intent)}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  >
                    Activate
                  </Button>
                )}
                
                {intent.status === "active" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeactivateIntent(intent)}
                    className="border-red-400/30 text-red-300 hover:bg-red-600/10"
                  >
                    Deactivate
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-400/30 text-purple-300 hover:bg-purple-600/10"
                >
                  View History
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredIntents.length === 0 && (
        <Card className="bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="text-center py-12">
            <div className="text-blue-200/60 text-lg mb-2">No intents found</div>
            <p className="text-blue-200/40">Try adjusting your search criteria or filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
