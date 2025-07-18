
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, Database, Server, Network, Zap } from 'lucide-react';
import { useNetBoxVariables } from '@/hooks/useNetBoxVariables';
import { NetBoxVariable } from '@/services/netboxGraphQLService';
import { LoadingSpinner } from './LoadingSpinner';

interface NetBoxVariablePickerProps {
  onVariableSelect: (variable: NetBoxVariable) => void;
  onVariablesChange: (variables: NetBoxVariable[]) => void;
  selectedVariables: NetBoxVariable[];
  intentContext?: {
    deviceName?: string;
    siteName?: string;
    vlanId?: number;
    deviceRole?: string;
    description?: string;
  };
}

export const NetBoxVariablePicker = ({ 
  onVariableSelect, 
  onVariablesChange,
  selectedVariables = [],
  intentContext 
}: NetBoxVariablePickerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  
  const {
    variables,
    devices,
    sites,
    vlans,
    searchResults,
    isLoading,
    searchNetworkObjects,
    getVariablesForContext,
    refreshData
  } = useNetBoxVariables(intentContext);

  // Update variables when context changes
  useEffect(() => {
    if (intentContext) {
      getVariablesForContext(intentContext).then(onVariablesChange);
    }
  }, [intentContext, getVariablesForContext, onVariablesChange]);

  // Handle search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery) {
        searchNetworkObjects(searchQuery);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, searchNetworkObjects]);

  const getVariableIcon = (type: string) => {
    switch (type) {
      case 'device':
      case 'device_role':
        return <Server className="h-4 w-4" />;
      case 'site':
        return <Database className="h-4 w-4" />;
      case 'vlan':
      case 'ip_address':
        return <Network className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const getVariableColor = (type: string) => {
    switch (type) {
      case 'device':
      case 'device_role':
        return 'bg-blue-600/20 text-blue-300 border-blue-400/30';
      case 'site':
        return 'bg-green-600/20 text-green-300 border-green-400/30';
      case 'vlan':
      case 'ip_address':
        return 'bg-purple-600/20 text-purple-300 border-purple-400/30';
      default:
        return 'bg-gray-600/20 text-gray-300 border-gray-400/30';
    }
  };

  const filteredVariables = variables.filter(variable => {
    const matchesSearch = variable.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         variable.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (variable.description && variable.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filterType === 'all' || variable.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const isVariableSelected = (variable: NetBoxVariable) => {
    return selectedVariables.some(v => v.name === variable.name && v.value === variable.value);
  };

  const handleVariableClick = (variable: NetBoxVariable) => {
    if (isVariableSelected(variable)) {
      const updated = selectedVariables.filter(v => !(v.name === variable.name && v.value === variable.value));
      onVariablesChange(updated);
    } else {
      onVariableSelect(variable);
      onVariablesChange([...selectedVariables, variable]);
    }
  };

  const variableTypes = Array.from(new Set(variables.map(v => v.type)));

  if (isLoading && variables.length === 0) {
    return (
      <Card className="bg-black/20 backdrop-blur-sm border-white/10">
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" />
          <span className="ml-2 text-blue-200/70">Loading NetBox data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/20 backdrop-blur-sm border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="h-5 w-5" />
              NetBox Variables
            </CardTitle>
            <CardDescription className="text-blue-200/70">
              Available network variables from NetBox ({variables.length} total)
            </CardDescription>
          </div>
          <Button
            onClick={refreshData}
            variant="outline"
            size="sm"
            className="border-blue-400/30 text-blue-300 hover:bg-blue-600/10"
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filter */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-200/50" />
            <Input
              placeholder="Search variables, devices, sites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-black/20 border-white/20 text-white placeholder:text-blue-200/50"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48 bg-black/20 border-white/20 text-white">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-white/20">
              <SelectItem value="all">All Types</SelectItem>
              {variableTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selected Variables */}
        {selectedVariables.length > 0 && (
          <div>
            <div className="text-sm text-blue-200/80 mb-2">Selected Variables ({selectedVariables.length})</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedVariables.map((variable, index) => (
                <Badge
                  key={`${variable.name}-${index}`}
                  className={`cursor-pointer ${getVariableColor(variable.type)}`}
                  onClick={() => handleVariableClick(variable)}
                >
                  {getVariableIcon(variable.type)}
                  <span className="ml-1">${variable.name}</span>
                  <span className="ml-1 opacity-70">= {variable.value}</span>
                </Badge>
              ))}
            </div>
            <Separator className="bg-white/10" />
          </div>
        )}

        {/* Available Variables */}
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {filteredVariables.length === 0 ? (
              <div className="text-center py-8 text-blue-200/60">
                {searchQuery ? 'No variables match your search' : 'No variables available'}
              </div>
            ) : (
              filteredVariables.map((variable, index) => (
                <div
                  key={`${variable.name}-${index}`}
                  onClick={() => handleVariableClick(variable)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isVariableSelected(variable)
                      ? 'bg-blue-600/20 border-blue-400/50'
                      : 'bg-black/20 border-white/10 hover:bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getVariableIcon(variable.type)}
                      <div>
                        <div className="text-white font-mono text-sm">${variable.name}</div>
                        <div className="text-blue-200/70 text-xs">{variable.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getVariableColor(variable.type)}>
                        {variable.type}
                      </Badge>
                      <div className="text-green-300 text-sm font-mono mt-1">{variable.value}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-blue-400 font-semibold">{devices.length}</div>
            <div className="text-xs text-blue-200/70">Devices</div>
          </div>
          <div>
            <div className="text-green-400 font-semibold">{sites.length}</div>
            <div className="text-xs text-blue-200/70">Sites</div>
          </div>
          <div>
            <div className="text-purple-400 font-semibold">{vlans.length}</div>
            <div className="text-xs text-blue-200/70">VLANs</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
