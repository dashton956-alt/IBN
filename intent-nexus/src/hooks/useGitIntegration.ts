
import { useState } from 'react';
import { gitService, GitMergeRequest } from '@/services/gitService';
import { useErrorHandler } from './useErrorHandler';
import { toast } from '@/hooks/use-toast';

export const useGitIntegration = () => {
  const [loading, setLoading] = useState(false);
  const { handleError } = useErrorHandler();

  const createIntentMergeRequest = async (intentData: any, configuration: string): Promise<GitMergeRequest | null> => {
    setLoading(true);
    
    try {
      // Generate unique change reference
      const changeReference = gitService.generateChangeReference();
      const intentWithChangeRef = { ...intentData, changeReference };

      // Create branch
      const branchName = await gitService.createBranch(intentData.id, changeReference);
      
      // Create configuration file
      await gitService.createConfigurationFile(branchName, intentWithChangeRef, configuration);
      
      // Create merge request
      const mrData = await gitService.createMergeRequest(branchName, intentWithChangeRef);
      
      // Store merge request in database
      await gitService.storeMergeRequest(intentData.id, mrData);

      toast({
        title: "Git Integration Success",
        description: `Merge request created: ${changeReference}`
      });

      return mrData;
    } catch (error) {
      handleError(error as Error, "Failed to create Git merge request");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const checkMergeRequestStatus = async (mrId: string): Promise<'open' | 'merged' | 'closed'> => {
    try {
      return await gitService.getMergeRequestStatus(mrId);
    } catch (error) {
      handleError(error as Error, "Failed to check merge request status");
      return 'open';
    }
  };

  return {
    createIntentMergeRequest,
    checkMergeRequestStatus,
    loading
  };
};
