import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { useDjangoAuth } from "@/contexts/DjangoAuthContext";
import { 
  useDjangoNetworkDevices, 
  useDjangoNetworkIntents, 
  useDjangoMergeRequests 
} from "@/hooks/useDjangoNetworkData";
import { NetworkTopology } from "@/components/NetworkTopology";
import { MergeRequestsView } from "@/components/MergeRequestsView";
import { IntentCreator } from "@/components/IntentCreator";
import { NetworkMetrics } from "@/components/NetworkMetrics";
import { IntentStorage } from "@/components/IntentStorage";
import { ConfigComparison } from "@/components/ConfigComparison";
import { LoadingCard } from "@/components/LoadingCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { LogOut, User } from "lucide-react";
import { AIOptimization } from "@/components/AIOptimization";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { user, signOut } = useDjangoAuth();
  
  const { 
    data: devices, 
    isLoading: devicesLoading, 
    error: devicesError 
  } = useDjangoNetworkDevices();
  
  const { 
    data: intents, 
    isLoading: intentsLoading, 
    error: intentsError 
  } = useDjangoNetworkIntents();
  
  const { 
    data: mergeRequests, 
    isLoading: mergeRequestsLoading, 
    error: mergeRequestsError 
  } = useDjangoMergeRequests();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  // Calculate network health based on real device data
  const networkHealth = devices && devices.length > 0 ? 
    (devices.filter((d: any) => d.status === 'online').length / devices.length) * 100 : 98.7;

  const activeIntents = intents?.filter((i: any) => i.status === 'deployed').length || 0;
  const pendingIntents = intents?.filter((i: any) => i.status === 'pending').length || 0;

  // Show loading state for critical data
  const isInitialLoading = devicesLoading && intentsLoading && mergeRequestsLoading;

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <div className="text-white text-xl">Loading Network Dashboard...</div>
          <div className="text-blue-200/70 text-sm">Fetching network data and configurations</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-teal-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Network Intent Orchestrator</h1>
                <p className="text-blue-200/80 text-sm">AI-Powered Network Management Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="border-green-400/30 text-green-400">
                Django Connected
              </Badge>
              <Badge variant="outline" className="border-blue-400/30 text-blue-400">
                NSO Ready
              </Badge>
              <div className="flex items-center space-x-2 text-white">
                <User className="h-4 w-4" />
                <span className="text-sm">{user?.email}</span>
              </div>
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7 bg-black/20 backdrop-blur-sm border border-white/10">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-600/30">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="merge-requests" className="data-[state=active]:bg-blue-600/30">
              Merge Requests
            </TabsTrigger>
            <TabsTrigger value="intent-creator" className="data-[state=active]:bg-blue-600/30">
              AI Intent Creator
            </TabsTrigger>
            <TabsTrigger value="intents" className="data-[state=active]:bg-blue-600/30">
              Intent Storage
            </TabsTrigger>
            <TabsTrigger value="config-comparison" className="data-[state=active]:bg-blue-600/30">
              Config Comparison
            </TabsTrigger>
            <TabsTrigger value="ai-optimization" className="data-[state=active]:bg-blue-600/30">
              AI Optimization
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="data-[state=active]:bg-blue-600/30">
              Network Monitoring
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Network Health Cards */}
              {devicesLoading ? (
                <LoadingCard />
              ) : (
                <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-lg">Network Health</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-400 mb-2">{networkHealth.toFixed(1)}%</div>
                    <p className="text-blue-200/70 text-sm">Overall Uptime</p>
                    <Progress value={networkHealth} className="mt-3" />
                    <div className="text-xs text-blue-200/60 mt-2">
                      {devices?.length || 0} devices monitored
                    </div>
                  </CardContent>
                </Card>
              )}

              {intentsLoading ? (
                <LoadingCard />
              ) : (
                <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-lg">Active Intents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-400 mb-2">{activeIntents}</div>
                    <p className="text-blue-200/70 text-sm">Deployed Configurations</p>
                    <div className="flex items-center justify-between mt-3 text-sm">
                      <span className="text-green-400">Active: {activeIntents}</span>
                      <span className="text-yellow-400">Pending: {pendingIntents}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {mergeRequestsLoading ? (
                <LoadingCard />
              ) : (
                <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-lg">Merge Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-400 mb-2">{mergeRequests?.length || 0}</div>
                    <p className="text-blue-200/70 text-sm">Pending Reviews</p>
                    <Badge className="mt-3 bg-purple-600/20 text-purple-300 border-purple-400/30">
                      {mergeRequests?.filter((mr: any) => mr.status === 'review').length || 0} In Review
                    </Badge>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Network Topology */}
            <Card className="bg-black/20 backdrop-blur-sm border-white/10 mb-6">
              <CardHeader>
                <CardTitle className="text-white">Network Topology</CardTitle>
                <CardDescription className="text-blue-200/70">
                  Live network visualization with real-time status updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NetworkTopology />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={() => setActiveTab("intent-creator")}
                className="h-16 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                Create New Intent
              </Button>
              <Button 
                onClick={() => setActiveTab("merge-requests")}
                variant="outline" 
                className="h-16 border-white/20 text-white hover:bg-white/10"
              >
                Review Merge Requests
              </Button>
              <Button 
                onClick={() => setActiveTab("ai-optimization")}
                variant="outline" 
                className="h-16 border-purple-400/30 text-purple-300 hover:bg-purple-600/10"
              >
                AI Optimization
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="merge-requests" className="mt-6">
            <MergeRequestsView />
          </TabsContent>

          <TabsContent value="intent-creator" className="mt-6">
            <IntentCreator />
          </TabsContent>

          <TabsContent value="intents" className="mt-6">
            <IntentStorage />
          </TabsContent>

          <TabsContent value="config-comparison" className="mt-6">
            <ConfigComparison />
          </TabsContent>

          <TabsContent value="ai-optimization" className="mt-6">
            <AIOptimization />
          </TabsContent>

          <TabsContent value="monitoring" className="mt-6">
            <NetworkMetrics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
