
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAIOptimization } from "@/hooks/useAIOptimization";
import { Brain, TrendingUp, Shield, Zap, AlertTriangle, CheckCircle, Database, Network } from "lucide-react";

export const AIOptimization = () => {
  const { 
    analysis, 
    isAnalyzing, 
    error, 
    runOptimization,
    applyOptimization 
  } = useAIOptimization();

  const [activeTab, setActiveTab] = useState("overview");

  if (error) {
    return (
      <Card className="bg-black/20 backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            AI Optimization Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-400 text-sm">{error}</div>
          <Button 
            onClick={runOptimization}
            className="mt-4 bg-purple-600 hover:bg-purple-700"
          >
            Retry Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            AI Network & NetBox Optimization
          </CardTitle>
          <CardDescription className="text-blue-200/70">
            Comprehensive analysis of network performance, security, and NetBox configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!analysis && !isAnalyzing && (
            <div className="text-center py-8">
              <Brain className="h-16 w-16 text-purple-400 mx-auto mb-4" />
              <p className="text-white mb-4">Ready to analyze your network and NetBox configuration</p>
              <Button 
                onClick={runOptimization}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              >
                <Brain className="h-4 w-4 mr-2" />
                Start Comprehensive Analysis
              </Button>
            </div>
          )}

          {isAnalyzing && (
            <div className="text-center py-8">
              <LoadingSpinner size="lg" />
              <p className="text-white mt-4">Analyzing network and NetBox data with AI...</p>
              <p className="text-blue-200/70 text-sm mt-2">This may take a few moments</p>
            </div>
          )}

          {analysis && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-black/20 backdrop-blur-sm border border-white/10">
                <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600/30">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="performance" className="data-[state=active]:bg-purple-600/30">
                  Performance
                </TabsTrigger>
                <TabsTrigger value="security" className="data-[state=active]:bg-purple-600/30">
                  Security
                </TabsTrigger>
                <TabsTrigger value="netbox" className="data-[state=active]:bg-purple-600/30">
                  NetBox
                </TabsTrigger>
                <TabsTrigger value="recommendations" className="data-[state=active]:bg-purple-600/30">
                  Actions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-400/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-400" />
                        <span className="text-white font-medium">Performance Score</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-400 mt-2">{analysis.performanceScore}/100</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-400/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-green-400" />
                        <span className="text-white font-medium">Security Score</span>
                      </div>
                      <div className="text-2xl font-bold text-green-400 mt-2">{analysis.securityScore}/100</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 border-orange-400/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-orange-400" />
                        <span className="text-white font-medium">NetBox Score</span>
                      </div>
                      <div className="text-2xl font-bold text-orange-400 mt-2">{analysis.netboxScore}/100</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-400/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-purple-400" />
                        <span className="text-white font-medium">Optimization Potential</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-400 mt-2">{analysis.optimizationPotential}%</div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-black/20 backdrop-blur-sm border-white/10 mt-6">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">AI Analysis Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-blue-200/80 whitespace-pre-wrap">{analysis.summary}</div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="performance" className="mt-6">
                <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Performance Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analysis.performanceIssues.map((issue, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                          <AlertTriangle className="h-5 w-5 text-orange-400 mt-0.5" />
                          <div>
                            <div className="text-white font-medium">{issue.title}</div>
                            <div className="text-orange-200/80 text-sm mt-1">{issue.description}</div>
                            <Badge className="mt-2 bg-orange-600/20 text-orange-300 border-orange-400/30">
                              Impact: {issue.impact}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="mt-6">
                <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Security Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analysis.securityIssues.map((issue, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <Shield className="h-5 w-5 text-red-400 mt-0.5" />
                          <div>
                            <div className="text-white font-medium">{issue.title}</div>
                            <div className="text-red-200/80 text-sm mt-1">{issue.description}</div>
                            <Badge className="mt-2 bg-red-600/20 text-red-300 border-red-400/30">
                              Severity: {issue.severity}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="netbox" className="mt-6">
                <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">NetBox Configuration Analysis</CardTitle>
                    <CardDescription className="text-blue-200/70">
                      Issues and improvements for your NetBox IPAM/DCIM configuration
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analysis.netboxIssues?.map((issue, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                          <Database className="h-5 w-5 text-orange-400 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-white font-medium">{issue.title}</span>
                              <Badge className="bg-blue-600/20 text-blue-300 border-blue-400/30">
                                {issue.category}
                              </Badge>
                            </div>
                            <div className="text-orange-200/80 text-sm mb-2">{issue.description}</div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-orange-600/20 text-orange-300 border-orange-400/30">
                                Severity: {issue.severity}
                              </Badge>
                              {issue.affectedObjects.length > 0 && (
                                <div className="text-xs text-blue-200/60">
                                  Affects: {issue.affectedObjects.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))} 
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recommendations" className="mt-6">
                <div className="space-y-4">
                  {analysis.recommendations.map((rec, index) => (
                    <Card key={index} className="bg-black/20 backdrop-blur-sm border-white/10">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {rec.category === 'NetBox' ? (
                                <Database className="h-5 w-5 text-orange-400" />
                              ) : rec.category === 'Security' ? (
                                <Shield className="h-5 w-5 text-green-400" />
                              ) : (
                                <CheckCircle className="h-5 w-5 text-green-400" />
                              )}
                              <span className="text-white font-medium">{rec.title}</span>
                              <Badge className="bg-purple-600/20 text-purple-300 border-purple-400/30">
                                {rec.priority}
                              </Badge>
                              <Badge className="bg-blue-600/20 text-blue-300 border-blue-400/30">
                                {rec.category}
                              </Badge>
                            </div>
                            <div className="text-blue-200/80 text-sm mt-2">{rec.description}</div>
                            <div className="text-green-400 text-sm mt-1">Expected Impact: {rec.impact}</div>
                          </div>
                          <Button
                            onClick={() => applyOptimization(rec.id)}
                            variant="outline"
                            size="sm"
                            className="border-purple-400/30 text-purple-300 hover:bg-purple-600/10"
                          >
                            Apply
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
