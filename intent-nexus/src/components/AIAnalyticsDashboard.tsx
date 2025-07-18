
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useNetworkDevices, useNetworkMetrics, useNetworkIntents } from "@/hooks/useNetworkData";
import { ollamaService } from "@/services/ollamaService";
import { Brain, TrendingUp, Shield, Zap, AlertTriangle, BarChart3 } from "lucide-react";

export const AIAnalyticsDashboard = () => {
  const [analysis, setAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOllamaConnected, setIsOllamaConnected] = useState(false);

  const { data: devices = [] } = useNetworkDevices();
  const { data: metrics = [] } = useNetworkMetrics();
  const { data: intents = [] } = useNetworkIntents();

  useEffect(() => {
    checkOllamaConnection();
  }, []);

  const checkOllamaConnection = async () => {
    const connected = await ollamaService.checkConnection();
    setIsOllamaConnected(connected);
    
    if (!connected) {
      toast({
        title: "Ollama Not Connected",
        description: "Make sure Ollama is running on localhost:11434",
        variant: "destructive"
      });
    }
  };

  const handleAnalyzeNetwork = async () => {
    if (!isOllamaConnected) {
      toast({
        title: "Connection Required",
        description: "Please ensure Ollama is running and connected.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const aiAnalysis = await ollamaService.analyzeNetworkData(metrics, devices, intents);
      setAnalysis(aiAnalysis);
      
      toast({
        title: "Analysis Complete",
        description: "AI has analyzed your network data and generated insights.",
      });
    } catch (error) {
      console.error('Analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze network data",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const parseAnalysis = (analysisText: string) => {
    const sections = [
      { title: "Performance Analysis", icon: TrendingUp, key: "performance" },
      { title: "Security Recommendations", icon: Shield, key: "security" },
      { title: "Optimization Suggestions", icon: Zap, key: "optimization" },
      { title: "Anomaly Detection", icon: AlertTriangle, key: "anomaly" },
      { title: "Capacity Planning", icon: BarChart3, key: "capacity" },
      { title: "Configuration Quality", icon: Brain, key: "configuration" }
    ];

    return sections.map(section => {
      const regex = new RegExp(`(?:^|\\n)(?:\\*\\*)?${section.title}(?:\\*\\*)?:?([\\s\\S]*?)(?=\\n(?:\\*\\*)?(?:Performance Analysis|Security Recommendations|Optimization Suggestions|Anomaly Detection|Capacity Planning|Configuration Quality)(?:\\*\\*)?:|$)`, 'i');
      const match = analysisText.match(regex);
      const content = match ? match[1].trim() : "No specific insights available for this category.";
      
      return {
        ...section,
        content: content
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">AI Network Analytics</h2>
          <p className="text-blue-200/70">AI-powered insights and recommendations for your network infrastructure</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge 
            variant={isOllamaConnected ? "default" : "destructive"}
            className={isOllamaConnected ? "bg-green-600/20 text-green-300 border-green-400/30" : ""}
          >
            {isOllamaConnected ? "Ollama Connected" : "Ollama Disconnected"}
          </Badge>
          <Button
            onClick={checkOllamaConnection}
            variant="outline"
            size="sm"
            className="border-blue-400/30 text-blue-300 hover:bg-blue-600/10"
          >
            Check Connection
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200/70 text-sm">Network Devices</p>
                <p className="text-2xl font-bold text-white">{devices.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200/70 text-sm">Recent Metrics</p>
                <p className="text-2xl font-bold text-white">{metrics.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200/70 text-sm">Configuration Intents</p>
                <p className="text-2xl font-bold text-white">{intents.length}</p>
              </div>
              <Brain className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Controls */}
      <Card className="bg-black/20 backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Network Analysis
          </CardTitle>
          <CardDescription className="text-blue-200/70">
            Generate comprehensive insights about your network performance, security, and optimization opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleAnalyzeNetwork}
            disabled={isAnalyzing || !isOllamaConnected}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isAnalyzing ? "Analyzing Network Data..." : "Generate AI Analysis"}
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {parseAnalysis(analysis).map((section, index) => {
            const IconComponent = section.icon;
            return (
              <Card key={index} className="bg-black/20 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <IconComponent className="h-5 w-5" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-blue-200/80 text-sm leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Setup Instructions */}
      {!isOllamaConnected && (
        <Card className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 backdrop-blur-sm border-yellow-400/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              Ollama Setup Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-yellow-200/80">To use AI analytics, you need to have Ollama running locally:</p>
            <div className="space-y-2 text-sm text-yellow-200/70">
              <p>1. Install Ollama: <code className="bg-black/20 px-2 py-1 rounded">curl -fsSL https://ollama.ai/install.sh | sh</code></p>
              <p>2. Pull a model: <code className="bg-black/20 px-2 py-1 rounded">ollama pull llama3.1</code></p>
              <p>3. Start Ollama: <code className="bg-black/20 px-2 py-1 rounded">ollama serve</code></p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
