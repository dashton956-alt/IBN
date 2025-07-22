import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/config/urlsCentral";
import { netboxService } from "@/services/netboxService";
import { ciscoService } from "@/services/ciscoService";
import { useErrorHandler } from "./useErrorHandler";
import { useRetry } from "./useRetry";
import { useGitIntegration } from "./useGitIntegration";

// Hook to fetch and sync network devices
export const useNetworkDevices = () => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: ['network-devices'],
    queryFn: async () => {
      try {
        // First try to fetch from NetBox and sync
        await netboxService.fetchDevices();
      } catch (error) {
        console.log('NetBox sync failed, using local data:', error);
        // Don't throw here, just log and continue with local data
      }

      // Then fetch from local database
      const { data, error } = await supabase
        .from('network_devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        handleError(error, "Failed to fetch network devices");
        throw error;
      }
      
      return data || [];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: (failureCount, error) => {
      // Don't retry database connection errors
      if (error?.message?.includes('connection') || error?.message?.includes('network')) {
        return failureCount < 2;
      }
      return failureCount < 3;
    },
  });
};

// Hook to fetch network intents
export const useNetworkIntents = () => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: ['network-intents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('network_intents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        handleError(error, "Failed to fetch network intents");
        throw error;
      }
      
      return data || [];
    },
  });
};

// Hook to fetch merge requests
export const useMergeRequests = () => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: ['merge-requests'],
    queryFn: async () => {
      try {
        // Sync from NetBox first
        const netboxMRs = await netboxService.fetchMergeRequests();
        
        // Sync to local database
        for (const mr of netboxMRs) {
          const { error } = await supabase
            .from('merge_requests')
            .upsert({
              netbox_mr_id: mr.id,
              title: mr.title,
              description: mr.description,
              status: mr.status,
              author_email: mr.author_email,
            }, { onConflict: 'netbox_mr_id' });
            
          if (error) {
            console.error('Error syncing MR:', error);
          }
        }
      } catch (error) {
        console.log('NetBox MR sync failed, using local data:', error);
      }

      // Fetch from local database
      const { data, error } = await supabase
        .from('merge_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        handleError(error, "Failed to fetch merge requests");
        throw error;
      }
      
      return data || [];
    },
    refetchInterval: 60000, // Refresh every minute
  });
};

// Hook to fetch network metrics
export const useNetworkMetrics = () => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: ['network-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('network_metrics')
        .select('*, network_devices(*)')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        handleError(error, "Failed to fetch network metrics");
        throw error;
      }
      
      return data || [];
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });
};

// Hook to create and deploy network intents with Git integration
export const useCreateIntent = () => {
  const [loading, setLoading] = useState(false);
  const { handleError } = useErrorHandler();
  const { execute: executeWithRetry } = useRetry({ maxRetries: 2 });
  const { createIntentMergeRequest } = useGitIntegration();

  const createIntent = async (intentData: {
    title: string;
    description: string;
    intent_type: string;
    natural_language_input: string;
  }) => {
    setLoading(true);
    
    try {
      return await executeWithRetry(async () => {
        // Create intent in database
        const { data: intent, error } = await supabase
          .from('network_intents')
          .insert({
            ...intentData,
            created_by: (await supabase.auth.getUser()).data.user?.id,
          })
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to create intent: ${error.message}`);
        }

        // Generate Cisco configuration
        const configuration = await ciscoService.generateConfiguration(intent);
        
        // Update intent with generated configuration
        const { error: updateError } = await supabase
          .from('network_intents')
          .update({ 
            configuration,
            status: 'pending'
          })
          .eq('id', intent.id);

        if (updateError) {
          throw new Error(`Failed to update intent configuration: ${updateError.message}`);
        }

        // Create Git merge request
        const mrData = await createIntentMergeRequest(intent, configuration);
        
        if (mrData) {
          // Update intent with change reference
          await supabase
            .from('network_intents')
            .update({ 
              description: `${intent.description}\n\nChange Reference: ${mrData.changeReference}`
            })
            .eq('id', intent.id);
        }

        return { ...intent, changeReference: mrData?.changeReference };
      });
    } catch (error) {
      handleError(error as Error, "Failed to create network intent");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { createIntent, loading };
};
