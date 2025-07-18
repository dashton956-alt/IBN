
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, AlertTriangle, Info, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { ConfigDifference } from '@/services/configComparisonService';

interface ConfigDifferencesListProps {
  differences: ConfigDifference[];
}

export const ConfigDifferencesList = ({ differences }: ConfigDifferencesListProps) => {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      default: return <Info className="h-4 w-4 text-blue-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600/20 text-red-300 border-red-400/30';
      case 'warning': return 'bg-yellow-600/20 text-yellow-300 border-yellow-400/30';
      default: return 'bg-blue-600/20 text-blue-300 border-blue-400/30';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'missing': return <Minus className="h-4 w-4 text-red-400" />;
      case 'extra': return <Plus className="h-4 w-4 text-green-400" />;
      default: return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
    }
  };

  if (differences.length === 0) {
    return (
      <Card className="bg-green-600/10 border-green-400/30">
        <CardContent className="p-4 text-center">
          <div className="text-green-400 font-medium">No configuration differences found</div>
          <div className="text-green-300/70 text-sm">Device configuration matches NetBox</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-white mb-2">
        Configuration Differences ({differences.length})
      </div>
      <ScrollArea className="h-64">
        <div className="space-y-2">
          {differences.map((diff, index) => (
            <Collapsible key={index}>
              <CollapsibleTrigger
                onClick={() => toggleExpanded(index)}
                className="w-full"
              >
                <Card className="bg-black/40 border-white/10 hover:border-white/20 transition-colors cursor-pointer">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getSeverityIcon(diff.severity)}
                        {getTypeIcon(diff.type)}
                        <div className="text-left">
                          <div className="text-white text-sm font-mono">{diff.path}</div>
                          <div className="text-blue-200/70 text-xs capitalize">{diff.type} configuration</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(diff.severity)}>
                          {diff.severity}
                        </Badge>
                        <ChevronDown className={`h-4 w-4 text-white transition-transform ${
                          expandedItems.has(index) ? 'rotate-180' : ''
                        }`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <Card className="bg-black/60 border-white/10 mt-1">
                  <CardContent className="p-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-blue-400 mb-1">NetBox Configuration</div>
                        <div className="bg-blue-600/10 p-2 rounded border border-blue-400/20">
                          <pre className="text-xs text-blue-200 font-mono">
                            {JSON.stringify(diff.netbox_value, null, 2)}
                          </pre>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-orange-400 mb-1">Device Configuration</div>
                        <div className="bg-orange-600/10 p-2 rounded border border-orange-400/20">
                          <pre className="text-xs text-orange-200 font-mono">
                            {JSON.stringify(diff.device_value, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
