
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { configComparisonService, ConfigComparison } from '@/services/configComparisonService';
import { useErrorHandler } from './useErrorHandler';

interface UseConfigComparisonReturn {
  comparisons: ConfigComparison[];
  isLoading: boolean;
  error: Error | null;
  compareDevice: (deviceId: string, deviceIp: string) => Promise<ConfigComparison>;
  scheduleComparison: (deviceIds: string[], schedule: string) => Promise<{ id: string; message: string }>;
  getComparisonResult: (comparisonId: string) => Promise<ConfigComparison>;
  refreshHistory: () => void;
  createBulkSchedule: (scheduleType: 'weekly' | 'monthly' | 'on-change', schedule: string, deviceIds: string[]) => Promise<{ id: string; message: string }>;
  deleteSchedule: (scheduleId: string) => Promise<void>;
}

export const useConfigComparison = (): UseConfigComparisonReturn => {
  const [isComparing, setIsComparing] = useState(false);
  const { handleError } = useErrorHandler();

  const { 
    data: comparisons = [], 
    isLoading, 
    error,
    refetch: refreshHistory
  } = useQuery({
    queryKey: ['config-comparisons'],
    queryFn: () => configComparisonService.getComparisonHistory(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const compareDevice = useCallback(async (deviceId: string, deviceIp: string): Promise<ConfigComparison> => {
    setIsComparing(true);
    try {
      const result = await configComparisonService.compareDeviceConfig(deviceId, deviceIp);
      await refreshHistory(); // Refresh the history after comparison
      return result;
    } catch (error) {
      handleError(error as Error, 'Failed to compare device configuration');
      throw error;
    } finally {
      setIsComparing(false);
    }
  }, [handleError, refreshHistory]);

  const scheduleComparison = useCallback(async (deviceIds: string[], schedule: string) => {
    try {
      const result = await configComparisonService.scheduleConfigComparison(deviceIds, schedule);
      await refreshHistory(); // Refresh the history after scheduling
      return result;
    } catch (error) {
      handleError(error as Error, 'Failed to schedule configuration comparison');
      throw error;
    }
  }, [handleError, refreshHistory]);

  const createBulkSchedule = useCallback(async (scheduleType: 'weekly' | 'monthly' | 'on-change', schedule: string, deviceIds: string[]) => {
    try {
      const result = await configComparisonService.createBulkSchedule(scheduleType, schedule, deviceIds);
      await refreshHistory();
      return result;
    } catch (error) {
      handleError(error as Error, 'Failed to create bulk schedule');
      throw error;
    }
  }, [handleError, refreshHistory]);

  const deleteSchedule = useCallback(async (scheduleId: string) => {
    try {
      await configComparisonService.deleteSchedule(scheduleId);
      await refreshHistory();
    } catch (error) {
      handleError(error as Error, 'Failed to delete schedule');
      throw error;
    }
  }, [handleError, refreshHistory]);

  const getComparisonResult = useCallback(async (comparisonId: string): Promise<ConfigComparison> => {
    try {
      return await configComparisonService.getComparisonResults(comparisonId);
    } catch (error) {
      handleError(error as Error, 'Failed to fetch comparison results');
      throw error;
    }
  }, [handleError]);

  return {
    comparisons,
    isLoading: isLoading || isComparing,
    error,
    compareDevice,
    scheduleComparison,
    getComparisonResult,
    refreshHistory,
    createBulkSchedule,
    deleteSchedule
  };
};
