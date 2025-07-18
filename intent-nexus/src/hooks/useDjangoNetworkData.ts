import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { djangoApiService } from "@/services/djangoApiService";
import { netboxService } from "@/services/netboxService";
import { useErrorHandler } from "./useErrorHandler";
import { useRetry } from "./useRetry";
import { toast } from "@/hooks/use-toast";

// Hook to fetch network devices from Django backend
export const useDjangoNetworkDevices = () => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: ['django-network-devices'],
    queryFn: async () => {
      try {
        return await djangoApiService.getNetworkDevices();
      } catch (error: any) {
        handleError(error, "Failed to fetch network devices");
        throw error;
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('Authentication required')) {
        return false; // Don't retry auth errors
      }
      return failureCount < 3;
    },
  });
};

// Hook to fetch network intents from Django backend
export const useDjangoNetworkIntents = () => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: ['django-network-intents'],
    queryFn: async () => {
      try {
        return await djangoApiService.getNetworkIntents();
      } catch (error: any) {
        handleError(error, "Failed to fetch network intents");
        throw error;
      }
    },
    refetchInterval: 60000, // Refresh every minute
  });
};

// Hook to fetch merge requests from Django backend
export const useDjangoMergeRequests = () => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: ['django-merge-requests'],
    queryFn: async () => {
      try {
        return await djangoApiService.getMergeRequests();
      } catch (error: any) {
        handleError(error, "Failed to fetch merge requests");
        throw error;
      }
    },
    refetchInterval: 60000, // Refresh every minute
  });
};

// Hook to fetch network metrics from Django backend
export const useDjangoNetworkMetrics = () => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: ['django-network-metrics'],
    queryFn: async () => {
      try {
        return await djangoApiService.getNetworkMetrics();
      } catch (error: any) {
        handleError(error, "Failed to fetch network metrics");
        throw error;
      }
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });
};

// Hook to create network intents with Django backend and NetBox integration
export const useDjangoCreateIntent = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  const { execute: executeWithRetry } = useRetry({ maxRetries: 2 });

  return useMutation({
    mutationFn: async (intentData: {
      title: string;
      description: string;
      intent_type: string;
      natural_language_input: string;
      context?: {
        siteName?: string;
        deviceName?: string;
        deviceRole?: string;
      };
    }) => {
      return executeWithRetry(async () => {
        // Create the intent in Django
        const response = await djangoApiService.createNetworkIntent(intentData);
        
        // Add change number to NetBox if available
        if (response.id && response.changeReference) {
          try {
            await netboxService.addChangeNumber(
              response.id,
              response.changeReference,
              `Intent: ${intentData.title} - ${intentData.description}`
            );
            
            console.log('Change number added to NetBox:', response.changeReference);
          } catch (netboxError) {
            console.warn('Failed to add change number to NetBox:', netboxError);
            // Don't fail the intent creation if NetBox update fails
          }
        }
        
        toast({
          title: "Intent Created",
          description: `Network intent created with change reference: ${response.changeReference}`,
        });
        
        return response;
      });
    },
    onSuccess: () => {
      // Invalidate and refetch network intents
      queryClient.invalidateQueries({ queryKey: ['django-network-intents'] });
    },
    onError: (error: any) => {
      handleError(error, "Failed to create network intent");
    },
  });
};

// Hook to create network devices
export const useDjangoCreateDevice = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (deviceData: any) => {
      return await djangoApiService.createNetworkDevice(deviceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['django-network-devices'] });
      toast({
        title: "Device Created",
        description: "Network device created successfully",
      });
    },
    onError: (error: any) => {
      handleError(error, "Failed to create network device");
    },
  });
};

// Hook to fetch network alerts
export const useDjangoNetworkAlerts = () => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: ['django-network-alerts'],
    queryFn: async () => {
      try {
        return await djangoApiService.getNetworkAlerts();
      } catch (error: any) {
        handleError(error, "Failed to fetch network alerts");
        throw error;
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

// Hook to fetch activity logs
export const useDjangoActivityLogs = () => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: ['django-activity-logs'],
    queryFn: async () => {
      try {
        return await djangoApiService.getActivityLogs();
      } catch (error: any) {
        handleError(error, "Failed to fetch activity logs");
        throw error;
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
