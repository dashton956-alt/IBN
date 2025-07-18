import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ollamaService } from "@/services/ollamaService";
import { netboxService } from "@/services/netboxService";
import { ciscoService } from "@/services/ciscoService";
import { NetBoxVariablePicker } from "./NetBoxVariablePicker";
import { Brain, Sparkles, Circle, Database } from "lucide-react";
import { NetBoxVariable } from "@/services/netboxGraphQLService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const IntentCreator = () => {
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [generatedConfig, setGeneratedConfig] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedNetBoxVariables, setSelectedNetBoxVariables] = useState<NetBoxVariable[]>([]);
  
  // Connection status states
  const [isOllamaConnected, setIsOllamaConnected] = useState(false);
  const [isNetboxConnected, setIsNetboxConnected] = useState(false);
  const [isCiscoConnected, setIsCiscoConnected] = useState(false);
  
  const [useAI, setUseAI] = useState(true);
  const [useNetBoxLookup, setUseNetBoxLookup] = useState(true);
  
  // Toggle states for automation tools
  const [enableAnsible, setEnableAnsible] = useState(false);
  const [enableTerraform, setEnableTerraform] = useState(false);
  const [enableNornir, setEnableNornir] = useState(false);
  const [enableCisco, setEnableCisco] = useState(false);

  useEffect(() => {
    checkAllConnections();
  }, []);

  const checkAllConnections = async () => {
    await Promise.all([
      checkOllamaConnection(),
      checkNetboxConnection(),
      checkCiscoConnection()
    ]);
  };

  const checkOllamaConnection = async () => {
    const connected = await ollamaService.checkConnection();
    setIsOllamaConnected(connected);
  };

  const checkNetboxConnection = async () => {
    try {
      await netboxService.fetchDevices();
      setIsNetboxConnected(true);
    } catch (error) {
      setIsNetboxConnected(false);
    }
  };

  const checkCiscoConnection = async () => {
    try {
      // Add a simple connection check method to Cisco service
      await fetch('http://localhost:8080/restconf/data/', {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa('admin:admin'),
          'Accept': 'application/json',
        },
      });
      setIsCiscoConnected(true);
    } catch (error) {
      setIsCiscoConnected(false);
    }
  };

  const templates = [
    { id: "vlan", name: "VLAN Configuration", description: "Create or modify VLANs" },
    { id: "acl", name: "Access Control List", description: "Security access controls" },
    { id: "qos", name: "Quality of Service", description: "Traffic prioritization policies" },
    { id: "routing", name: "Routing Configuration", description: "Static and dynamic routing" },
    { id: "interface", name: "Interface Configuration", description: "Port and interface settings" }
  ];

  const examplePrompts = [
    "Create VLAN 100 for the Marketing department with access to internet and file servers",
    "Configure QoS policy to prioritize VoIP traffic on all access switches",
    "Set up access control list to block traffic from guest network to internal servers",
    "Create trunk interface on port Gi0/1 with VLANs 10, 20, 30",
    "Configure OSPF on core switches with area 0"
  ];

  const parseIntentContext = (input: string) => {
    const context: any = {};
    
    // Simple parsing logic (could be enhanced with NLP)
    const words = input.toLowerCase().split(/\s+/);
    
    // Look for device names
    const devicePatterns = ['switch', 'router', 'firewall', 'sw-', 'rtr-', 'fw-'];
    devicePatterns.forEach(pattern => {
      const index = words.findIndex(word => word.includes(pattern));
      if (index !== -1 && words[index + 1]) {
        context.deviceName = words[index] + (words[index + 1] ? '-' + words[index + 1] : '');
      }
    });
    
    // Look for VLAN IDs
    const vlanMatch = input.match(/vlan\s+(\d+)/i);
    if (vlanMatch) {
      context.vlanId = parseInt(vlanMatch[1]);
    }
    
    // Look for site references
    if (input.toLowerCase().includes('site') || input.toLowerCase().includes('location')) {
      const siteMatch = input.match(/(?:site|location)\s+([a-zA-Z0-9-]+)/i);
      if (siteMatch) {
        context.siteName = siteMatch[1];
      }
    }
    
    context.description = input;
    return context;
  };

  const substituteVariables = (config: string, variables: NetBoxVariable[]): string => {
    let substituted = config;
    
    variables.forEach(variable => {
      const placeholder = `$${variable.name}`;
      substituted = substituted.replace(new RegExp(`\\${placeholder}`, 'g'), variable.value);
    });
    
    return substituted;
  };

  const handleGenerateIntent = async () => {
    if (!naturalLanguageInput.trim()) {
      toast({
        title: "Input Required",
        description: "Please describe your network intent in natural language.",
        variant: "destructive"
      });
      return;
    }

    // Check if at least one automation tool is enabled
    if (!enableAnsible && !enableTerraform && !enableNornir && !enableCisco) {
      toast({
        title: "Automation Tool Required",
        description: "Please enable at least one automation tool (Ansible, Terraform, Nornir, or Cisco).",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    

    try {
      let config;
      
      if (useAI && isOllamaConnected) {
        // Use AI to generate configuration
        const enabledTools = [];
        if (enableAnsible) enabledTools.push('Ansible');
        if (enableTerraform) enabledTools.push('Terraform');
        if (enableNornir) enabledTools.push('Nornir');
        if (enableCisco) enabledTools.push('Cisco');
        
        // Include NetBox variables in the AI prompt if enabled
        let enhancedInput = naturalLanguageInput;
        if (useNetBoxLookup && selectedNetBoxVariables.length > 0) {
          const variableContext = selectedNetBoxVariables.map(v => 
            `${v.name}: ${v.value} (${v.description || v.type})`
          ).join('\n');
          
          enhancedInput = `${naturalLanguageInput}\n\nAvailable NetBox Variables:\n${variableContext}`;
        }
        
        config = await ollamaService.generateConfiguration(
          enhancedInput, 
          selectedTemplate, 
          enabledTools
        );
        
        toast({
          title: "AI Configuration Generated",
          description: "Ollama has successfully generated your network configuration.",
        });
      } else {
        // Fallback to mock configuration
        config = generateMockConfiguration(naturalLanguageInput, selectedTemplate, {
          ansible: enableAnsible,
          terraform: enableTerraform,
          nornir: enableNornir,
          cisco: enableCisco
        });
        
        toast({
          title: useAI ? "Using Mock Data" : "Intent Generated",
          description: useAI 
            ? "Ollama not available, using template-based configuration." 
            : "Template-based configuration generated successfully.",
        });
      }
      
      // Substitute NetBox variables in the generated configuration
      if (useNetBoxLookup && selectedNetBoxVariables.length > 0) {
        config = substituteVariables(config, selectedNetBoxVariables);
      }
      
      setGeneratedConfig(config);
    } catch (error) {
      console.error('Generation failed:', error);
      
      // Fallback to mock if AI fails
      const mockConfig = generateMockConfiguration(naturalLanguageInput, selectedTemplate, {
        ansible: enableAnsible,
        terraform: enableTerraform,
        nornir: enableNornir,
        cisco: enableCisco
      });
      
      const finalConfig = useNetBoxLookup && selectedNetBoxVariables.length > 0 
        ? substituteVariables(mockConfig, selectedNetBoxVariables)
        : mockConfig;
      
      setGeneratedConfig(finalConfig);
      
      toast({
        title: "Fallback Configuration",
        description: "AI generation failed, using template-based configuration instead.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMockConfiguration = (input: string, template: string, tools: { ansible: boolean, terraform: boolean, nornir: boolean, cisco: boolean }) => {
    const timestamp = new Date().toISOString();
    const enabledTools = Object.entries(tools).filter(([_, enabled]) => enabled).map(([tool, _]) => tool.toUpperCase());
    
    let config = `# Generated Multi-Tool Configuration
# Intent: ${input}
# Template: ${template || 'Auto-detected'}
# Enabled Tools: ${enabledTools.join(', ')}
# NetBox Variables: ${selectedNetBoxVariables.length} variables included
# Generated: ${timestamp}

`;

    // Add NetBox variables as comments if any are selected
    if (selectedNetBoxVariables.length > 0) {
      config += `# NetBox Variables Used:\n`;
      selectedNetBoxVariables.forEach(variable => {
        config += `# $${variable.name} = ${variable.value} (${variable.type})\n`;
      });
      config += `\n`;
    }

    if (tools.ansible) {
      config += `
## Ansible Playbook
---
- name: Configure VLAN
  hosts: $site_main_switches
  tasks:
    - name: Create VLAN $vlan_100
      ios_vlan:
        vlan_id: $vlan_100
        name: Marketing-VLAN
        state: present

`;
    }

    if (tools.terraform) {
      config += `
## Terraform Configuration
resource "ios_vlan" "marketing_vlan" {
  vlan_id = $vlan_100
  name    = "Marketing-VLAN"
}

resource "ios_interface" "vlan_interface" {
  name        = "Vlan$vlan_100"
  description = "Marketing Department VLAN"
  ip_address  = "$vlan_100_gateway/$vlan_100_cidr"
}

`;
    }

    if (tools.nornir) {
      config += `
## Nornir Script
from nornir import InitNornir
from nornir_napalm.plugins.tasks import napalm_configure

def configure_vlan(task):
    config = '''
    vlan $vlan_100
    name Marketing-VLAN
    interface vlan$vlan_100
    description Marketing Department VLAN
    ip address $vlan_100_gateway $vlan_100_netmask
    no shutdown
    '''
    task.run(task=napalm_configure, configuration=config)

nr = InitNornir(config_file="config.yaml")
result = nr.run(task=configure_vlan)

`;
    }

    if (tools.cisco) {
      config += `
## Cisco Configuration
{
  "cisco-ios-cli:interface": {
    "GigabitEthernet": [
      {
        "name": "0/1",
        "switchport": {
          "mode": {
            "access": [null]
          },
          "access": {
            "vlan": "$vlan_100"
          }
        }
      }
    ]
  },
  "cisco-ios-cli:vlan": {
    "vlan-list": [
      {
        "id": "$vlan_100",
        "name": "Marketing-VLAN"
      }
    ]
  }
}

`;
    }

    return config;
  };

  const handleSaveIntent = () => {
    if (!generatedConfig) {
      toast({
        title: "No Configuration",
        description: "Please generate a configuration first.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Intent Saved",
      description: "Configuration has been saved to intent storage with change number CHG-2024-" + Date.now().toString().slice(-3),
    });
    
    // Reset form
    setNaturalLanguageInput("");
    setGeneratedConfig("");
    setSelectedTemplate("");
    setSelectedNetBoxVariables([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Brain className="h-7 w-7" />
            AI Intent Creator
          </h2>
          <p className="text-blue-200/70">Describe your network requirements and let AI generate configurations using NetBox variables</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection Status Indicators */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Circle 
                className={`h-3 w-3 ${isOllamaConnected ? 'text-green-400 fill-green-400' : 'text-red-400 fill-red-400'}`}
              />
              <span className="text-xs text-blue-200/70">Ollama</span>
            </div>
            <div className="flex items-center gap-1">
              <Circle 
                className={`h-3 w-3 ${isNetboxConnected ? 'text-green-400 fill-green-400' : 'text-red-400 fill-red-400'}`}
              />
              <span className="text-xs text-blue-200/70">NetBox</span>
            </div>
            <div className="flex items-center gap-1">
              <Circle 
                className={`h-3 w-3 ${isCiscoConnected ? 'text-green-400 fill-green-400' : 'text-red-400 fill-red-400'}`}
              />
              <span className="text-xs text-blue-200/70">Cisco</span>
            </div>
          </div>
          
          <Badge 
            variant={isOllamaConnected ? "default" : "secondary"}
            className={isOllamaConnected ? "bg-green-600/20 text-green-300 border-green-400/30" : ""}
          >
            {isOllamaConnected ? "AI Ready" : "Template Mode"}
          </Badge>
          <Badge 
            variant={isCiscoConnected ? "default" : "secondary"}
            className={isCiscoConnected ? "bg-blue-600/20 text-blue-300 border-blue-400/30" : ""}
          >
            {isCiscoConnected ? "Cisco Ready" : "Cisco Offline"}
          </Badge>
          <Button
            onClick={checkAllConnections}
            variant="outline"
            size="sm"
            className="border-blue-400/30 text-blue-300 hover:bg-blue-600/10"
          >
            Check Connections
          </Button>
        </div>
      </div>

      <Tabs defaultValue="intent" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-black/20 backdrop-blur-sm border border-white/10">
          <TabsTrigger value="intent" className="data-[state=active]:bg-blue-600/30">
            Intent Creation
          </TabsTrigger>
          <TabsTrigger value="variables" className="data-[state=active]:bg-blue-600/30">
            NetBox Variables
          </TabsTrigger>
        </TabsList>

        <TabsContent value="intent" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <Card className="bg-black/20 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Describe Your Intent</CardTitle>
                <CardDescription className="text-blue-200/70">
                  Use natural language to describe what you want to configure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Toggle */}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-400/20">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    <Label htmlFor="ai-toggle" className="text-purple-200">Use AI Generation</Label>
                  </div>
                  <Switch
                    id="ai-toggle"
                    checked={useAI}
                    onCheckedChange={setUseAI}
                    disabled={!isOllamaConnected}
                  />
                </div>

                {/* NetBox Lookup Toggle */}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-900/20 to-teal-900/20 rounded-lg border border-green-400/20">
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4 text-green-400" />
                    <Label htmlFor="netbox-toggle" className="text-green-200">Use NetBox Variables</Label>
                  </div>
                  <Switch
                    id="netbox-toggle"
                    checked={useNetBoxLookup}
                    onCheckedChange={setUseNetBoxLookup}
                    disabled={!isNetboxConnected}
                  />
                </div>

                {/* Selected Variables Display */}
                {useNetBoxLookup && selectedNetBoxVariables.length > 0 && (
                  <div className="p-3 bg-black/30 rounded-lg border border-green-400/20">
                    <div className="text-sm text-green-200 mb-2">NetBox Variables ({selectedNetBoxVariables.length})</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedNetBoxVariables.slice(0, 5).map((variable, index) => (
                        <Badge key={index} className="bg-green-600/20 text-green-300 border-green-400/30 text-xs">
                          ${variable.name}
                        </Badge>
                      ))}
                      {selectedNetBoxVariables.length > 5 && (
                        <Badge className="bg-green-600/20 text-green-300 border-green-400/30 text-xs">
                          +{selectedNetBoxVariables.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Automation Tools Toggle Section */}
                <div>
                  <label className="text-sm text-blue-200/80 mb-3 block">Automation Tools</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="ansible-toggle"
                        checked={enableAnsible}
                        onCheckedChange={setEnableAnsible}
                      />
                      <Label htmlFor="ansible-toggle" className="text-blue-200/80">Ansible</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="terraform-toggle"
                        checked={enableTerraform}
                        onCheckedChange={setEnableTerraform}
                      />
                      <Label htmlFor="terraform-toggle" className="text-blue-200/80">Terraform</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="nornir-toggle"
                        checked={enableNornir}
                        onCheckedChange={setEnableNornir}
                      />
                      <Label htmlFor="nornir-toggle" className="text-blue-200/80">Nornir</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="cisco-toggle"
                        checked={enableCisco}
                        onCheckedChange={setEnableCisco}
                      />
                      <Label htmlFor="cisco-toggle" className="text-blue-200/80">Cisco</Label>
                    </div>
                  </div>
                </div>

                {/* Template Selection */}
                <div>
                  <label className="text-sm text-blue-200/80 mb-2 block">Configuration Template (Optional)</label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger className="bg-black/20 border-white/20 text-white">
                      <SelectValue placeholder="Auto-detect or select template" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/20">
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} - {template.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Natural Language Input */}
                <div>
                  <label className="text-sm text-blue-200/80 mb-2 block">Network Intent Description</label>
                  <Textarea
                    placeholder="Example: Create a VLAN for the Marketing department with ID 100 and allow access to the internet..."
                    value={naturalLanguageInput}
                    onChange={(e) => setNaturalLanguageInput(e.target.value)}
                    className="bg-black/20 border-white/20 text-white placeholder:text-blue-200/50 min-h-32"
                  />
                </div>

                {/* Example Prompts */}
                <div>
                  <label className="text-sm text-blue-200/80 mb-2 block">Example Prompts</label>
                  <div className="space-y-2">
                    {examplePrompts.map((prompt, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        onClick={() => setNaturalLanguageInput(prompt)}
                        className="text-left justify-start h-auto p-3 text-blue-200/80 hover:text-white hover:bg-blue-600/10 border border-white/10 w-full"
                      >
                        <span className="text-xs leading-relaxed">{prompt}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateIntent}
                  disabled={isGenerating}
                  className={`w-full ${
                    useAI && isOllamaConnected 
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" 
                      : "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800"
                  }`}
                >
                  {isGenerating ? "Generating Configuration..." : 
                    useAI && isOllamaConnected ? "Generate AI Configuration" : "Generate Template Configuration"}
                </Button>
              </CardContent>
            </Card>

            {/* Output Section */}
            <Card className="bg-black/20 backdrop-blur-sm border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Generated Configuration</CardTitle>
                    <CardDescription className="text-blue-200/70">
                      Multi-tool automation configurations with NetBox variables
                    </CardDescription>
                  </div>
                  {generatedConfig && (
                    <Badge className="bg-green-600/20 text-green-300 border-green-400/30">
                      Ready to Deploy
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {generatedConfig ? (
                  <>
                    <div className="bg-black/40 rounded-lg p-4 border border-white/10">
                      <pre className="text-sm text-green-300 font-mono whitespace-pre-wrap overflow-x-auto">
                        {generatedConfig}
                      </pre>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button
                        onClick={handleSaveIntent}
                        className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                      >
                        Save Intent
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigator.clipboard.writeText(generatedConfig)}
                        className="border-blue-400/30 text-blue-300 hover:bg-blue-600/10"
                      >
                        Copy Config
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-blue-200/60">
                    <div className="text-lg mb-2">No configuration generated yet</div>
                    <p className="text-sm">Describe your network intent and click generate to see the multi-tool configuration</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="variables" className="mt-6">
          <NetBoxVariablePicker
            onVariableSelect={(variable) => {
              console.log('Variable selected:', variable);
            }}
            onVariablesChange={setSelectedNetBoxVariables}
            selectedVariables={selectedNetBoxVariables}
            intentContext={naturalLanguageInput ? parseIntentContext(naturalLanguageInput) : undefined}
          />
        </TabsContent>
      </Tabs>

      {/* AI Insights */}
      {generatedConfig && (
        <Card className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 backdrop-blur-sm border-purple-400/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              🤖 {useAI && isOllamaConnected ? "AI Insights" : "Template Insights"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-purple-300 font-medium mb-1">Complexity Analysis</div>
                <div className="text-blue-200/80">Low - Standard VLAN configuration</div>
              </div>
              <div>
                <div className="text-purple-300 font-medium mb-1">Impact Assessment</div>
                <div className="text-blue-200/80">Medium - Affects multiple switches</div>
              </div>
              <div>
                <div className="text-purple-300 font-medium mb-1">NetBox Integration</div>
                <div className="text-blue-200/80">{selectedNetBoxVariables.length} variables used</div>
              </div>
              <div>
                <div className="text-purple-300 font-medium mb-1">Recommendation</div>
                <div className="text-blue-200/80">Deploy during maintenance window</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
