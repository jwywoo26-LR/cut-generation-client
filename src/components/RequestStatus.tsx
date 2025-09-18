'use client';

import { useState, useEffect } from 'react';

interface RequestStatusData {
  activeCount: number;
  requestsByType: Record<string, number>;
  activeRequests: Array<{
    id: string;
    type: string;
    startTime: string;
    recordId: string;
    duration: number;
  }>;
  timestamp: string;
}

export default function RequestStatus() {
  const [status, setStatus] = useState<RequestStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status/requests');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setError(null);
      } else {
        throw new Error('Failed to fetch request status');
      }
    } catch (error) {
      console.error('Error fetching request status:', error);
      setError('Failed to load request status');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Request Status
        </h2>
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Request Status
        </h2>
        <button
          onClick={fetchStatus}
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Active Requests */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                Active Requests
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {status.activeCount}
              </p>
            </div>
            <div className="text-blue-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Request Types Breakdown */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 md:col-span-2">
          <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-2">
            Requests by Type
          </p>
          {Object.keys(status.requestsByType).length > 0 ? (
            <div className="space-y-1">
              {Object.entries(status.requestsByType).map(([type, count]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 capitalize">
                    {type.replace(/_/g, ' ')}
                  </span>
                  <span className="font-medium text-green-900 dark:text-green-100">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No active requests</p>
          )}
        </div>
      </div>

      {/* Active Requests Details */}
      {status.activeRequests.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Active Requests Details
          </p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {status.activeRequests.map((request) => (
              <div
                key={request.id}
                className="text-xs bg-gray-50 dark:bg-gray-700 rounded p-2 flex justify-between"
              >
                <span className="text-gray-600 dark:text-gray-400">
                  {request.type.replace(/_/g, ' ')} • Record: {request.recordId}
                </span>
                <span className="text-gray-500 dark:text-gray-500">
                  {Math.round(request.duration / 1000)}s
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Last updated: {new Date(status.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}