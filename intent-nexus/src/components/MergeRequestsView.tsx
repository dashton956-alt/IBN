
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch, ExternalLink, Clock, CheckCircle } from "lucide-react";
import { useGitIntegration } from "@/hooks/useGitIntegration";
import { toast } from "@/hooks/use-toast";

interface MergeRequest {
  id: string;
  title: string;
  description: string;
  status: "draft" | "review" | "approved" | "rejected" | "open" | "merged" | "closed";
  changeNumber: string;
  author: string;
  reviewers: string[];
  createdAt: string;
  netboxUrl: string;
  gitStatus?: "open" | "merged" | "closed";
}

export const MergeRequestsView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mergeRequests, setMergeRequests] = useState<MergeRequest[]>([]);
  const { checkMergeRequestStatus } = useGitIntegration();

  useEffect(() => {
    // Initialize with mock data - in real implementation, fetch from database
    const mockData: MergeRequest[] = [
      {
        id: "mr-001",
        title: "[CHG-1704729600000-ABC123] Add VLAN 200 for Marketing Department",
        description: "Configure VLAN 200 across distribution switches for marketing team network segmentation",
        status: "merged",
        changeNumber: "CHG-1704729600000-ABC123",
        author: "john.doe@company.com",
        reviewers: ["jane.smith@company.com", "mike.wilson@company.com"],
        createdAt: "2024-01-15T10:30:00Z",
        netboxUrl: "https://gitlab.company.com/network/config/-/merge_requests/1",
        gitStatus: "merged"
      },
      {
        id: "mr-002",
        title: "[CHG-1704729700000-DEF456] Update QoS Policies for Voice Traffic",
        description: "Implement enhanced QoS policies for VoIP traffic across core infrastructure",
        status: "open",
        changeNumber: "CHG-1704729700000-DEF456",
        author: "sarah.johnson@company.com",
        reviewers: ["admin@company.com"],
        createdAt: "2024-01-14T14:15:00Z",
        netboxUrl: "https://gitlab.company.com/network/config/-/merge_requests/2",
        gitStatus: "open"
      },
      {
        id: "mr-003",
        title: "[CHG-1704729800000-GHI789] Security ACL Updates for Guest Network",
        description: "Enhance security access control lists for guest wireless network isolation",
        status: "open",
        changeNumber: "CHG-1704729800000-GHI789",
        author: "alex.chen@company.com",
        reviewers: [],
        createdAt: "2024-01-13T09:45:00Z",
        netboxUrl: "https://gitlab.company.com/network/config/-/merge_requests/3",
        gitStatus: "open"
      }
    ];
    setMergeRequests(mockData);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "merged": return "bg-green-600/20 text-green-300 border-green-400/30";
      case "approved": return "bg-green-600/20 text-green-300 border-green-400/30";
      case "open": return "bg-blue-600/20 text-blue-300 border-blue-400/30";
      case "review": return "bg-yellow-600/20 text-yellow-300 border-yellow-400/30";
      case "draft": return "bg-gray-600/20 text-gray-300 border-gray-400/30";
      case "rejected": return "bg-red-600/20 text-red-300 border-red-400/30";
      case "closed": return "bg-red-600/20 text-red-300 border-red-400/30";
      default: return "bg-gray-600/20 text-gray-300 border-gray-400/30";
    }
  };

  const getGitStatusIcon = (gitStatus?: string) => {
    switch (gitStatus) {
      case "merged":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "open":
        return <GitBranch className="h-4 w-4 text-blue-400" />;
      case "closed":
        return <Clock className="h-4 w-4 text-red-400" />;
      default:
        return <GitBranch className="h-4 w-4 text-gray-400" />;
    }
  };

  const handleDeploy = (mr: MergeRequest) => {
    if (mr.gitStatus !== "merged") {
      toast({
        title: "Deployment Blocked",
        description: "Merge request must be merged before deployment",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Deployment Initiated",
      description: `Starting deployment of ${mr.changeNumber} via Cisco NSO...`,
    });
  };

  const handleDryRun = (mr: MergeRequest) => {
    toast({
      title: "Dry Run Started",
      description: `Validating configuration for ${mr.changeNumber}...`,
    });
  };

  const handleRefreshStatus = async (mr: MergeRequest) => {
    try {
      const status = await checkMergeRequestStatus(mr.id);
      setMergeRequests(prev => 
        prev.map(m => m.id === mr.id ? { ...m, gitStatus: status } : m)
      );
      toast({
        title: "Status Refreshed",
        description: `Git status updated to: ${status}`
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Could not refresh Git status",
        variant: "destructive"
      });
    }
  };

  const filteredRequests = mergeRequests.filter(mr => {
    const matchesSearch = mr.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mr.changeNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || mr.status === statusFilter || mr.gitStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const canDeploy = (mr: MergeRequest) => {
    return mr.gitStatus === "merged" && (mr.status === "approved" || mr.status === "merged");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">GitOps Merge Requests</h2>
          <p className="text-blue-200/70">Git integration for network configuration changes with change tracking</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Input
            placeholder="Search merge requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-black/20 border-white/20 text-white placeholder:text-blue-200/50 w-full sm:w-64"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-black/20 border-white/20 text-white w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-white/20">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="merged">Merged</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Merge Requests List */}
      <div className="grid gap-4">
        {filteredRequests.map((mr) => (
          <Card key={mr.id} className="bg-black/20 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-200">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <CardTitle className="text-white text-lg">{mr.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      {getGitStatusIcon(mr.gitStatus)}
                      <Badge className={getStatusColor(mr.gitStatus || mr.status)} variant="outline">
                        {mr.gitStatus || mr.status}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="text-blue-200/70">
                    {mr.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-xs text-blue-200/60 uppercase tracking-wide mb-1">Change Reference</div>
                  <div className="text-white font-mono text-sm">{mr.changeNumber}</div>
                </div>
                <div>
                  <div className="text-xs text-blue-200/60 uppercase tracking-wide mb-1">Author</div>
                  <div className="text-white text-sm">{mr.author}</div>
                </div>
                <div>
                  <div className="text-xs text-blue-200/60 uppercase tracking-wide mb-1">Git Status</div>
                  <div className="flex items-center gap-2">
                    {getGitStatusIcon(mr.gitStatus)}
                    <span className="text-white text-sm capitalize">{mr.gitStatus || 'Unknown'}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-blue-200/60 uppercase tracking-wide mb-1">Created</div>
                  <div className="text-white text-sm">
                    {new Date(mr.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(mr.netboxUrl, '_blank')}
                  className="border-blue-400/30 text-blue-300 hover:bg-blue-600/10"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View in Git
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRefreshStatus(mr)}
                  className="border-purple-400/30 text-purple-300 hover:bg-purple-600/10"
                >
                  <GitBranch className="h-4 w-4 mr-1" />
                  Refresh Status
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDryRun(mr)}
                  className="border-yellow-400/30 text-yellow-300 hover:bg-yellow-600/10"
                >
                  Dry Run
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleDeploy(mr)}
                  disabled={!canDeploy(mr)}
                  className={canDeploy(mr) 
                    ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                    : "bg-gray-600 text-gray-400 cursor-not-allowed"
                  }
                >
                  {canDeploy(mr) ? "Deploy Intent" : "Awaiting Merge"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <Card className="bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="text-center py-12">
            <div className="text-blue-200/60 text-lg mb-2">No merge requests found</div>
            <p className="text-blue-200/40">Try adjusting your search criteria or status filter.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
