
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { netboxGraphQLService, NetBoxVariable, NetBoxDevice, NetBoxSite, NetBoxVLAN } from '@/services/netboxGraphQLService';
import { useErrorHandler } from './useErrorHandler';

interface IntentContext {
  deviceName?: string;
  siteName?: string;
  vlanId?: number;
  deviceRole?: string;
  description?: string;
}

interface UseNetBoxVariablesReturn {
  variables: NetBoxVariable[];
  devices: NetBoxDevice[];
  sites: NetBoxSite[];
  vlans: NetBoxVLAN[];
  searchResults: {
    devices: NetBoxDevice[];
    sites: NetBoxSite[];
    vlans: NetBoxVLAN[];
  };
  isLoading: boolean;
  error: Error | null;
  searchNetworkObjects: (query: string) => Promise<void>;
  getVariablesForContext: (context: IntentContext) => Promise<NetBoxVariable[]>;
  refreshData: () => void;
}

export const useNetBoxVariables = (initialContext?: IntentContext): UseNetBoxVariablesReturn => {
  const [variables, setVariables] = useState<NetBoxVariable[]>([]);
  const [searchResults, setSearchResults] = useState<{
    devices: NetBoxDevice[];
    sites: NetBoxSite[];
    vlans: NetBoxVLAN[];
  }>({
    devices: [],
    sites: [],
    vlans: []
  });
  
  const { handleError } = useErrorHandler();

  // Fetch basic NetBox data
  const { 
    data: netboxData, 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['netbox-variables', initialContext],
    queryFn: async () => {
      const [devices, sites, vlans, variables] = await Promise.all([
        netboxGraphQLService.getDevicesGraphQL(initialContext ? {
          site: initialContext.siteName,
          role: initialContext.deviceRole,
          name: initialContext.deviceName
        } : {}),
        netboxGraphQLService.getSites(),
        netboxGraphQLService.getVLANs(),
        netboxGraphQLService.getIntentVariables(initialContext)
      ]);

      return { devices, sites, vlans, variables };
    },
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Update local state when data changes
  useEffect(() => {
    if (netboxData) {
      setVariables(netboxData.variables);
    }
  }, [netboxData]);

  // Search network objects
  const searchNetworkObjects = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ devices: [], sites: [], vlans: [] });
      return;
    }

    try {
      const results = await netboxGraphQLService.searchNetworkObjects(query);
      setSearchResults(results);
    } catch (error) {
      handleError(error as Error, 'Failed to search network objects');
      setSearchResults({ devices: [], sites: [], vlans: [] });
    }
  }, [handleError]);

  // Get variables for specific context
  const getVariablesForContext = useCallback(async (context: IntentContext): Promise<NetBoxVariable[]> => {
    try {
      const contextVariables = await netboxGraphQLService.getIntentVariables(context);
      setVariables(contextVariables);
      return contextVariables;
    } catch (error) {
      handleError(error as Error, 'Failed to fetch context variables');
      return [];
    }
  }, [handleError]);

  const refreshData = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    variables,
    devices: netboxData?.devices || [],
    sites: netboxData?.sites || [],
    vlans: netboxData?.vlans || [],
    searchResults,
    isLoading,
    error,
    searchNetworkObjects,
    getVariablesForContext,
    refreshData
  };
};
