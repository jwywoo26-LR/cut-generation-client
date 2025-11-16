'use client';

import { useState, useEffect } from 'react';
import ModelSelection from '@/components/ModelSelection';
import DashboardMain from '@/components/DashboardMain';
import { AirtableRecords } from '@/components/airtable';

export default function DashboardPage() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [currentTable, setCurrentTable] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [records, setRecords] = useState<Array<{id: string; fields: Record<string, unknown>}>>([]);


  // Check if user is already authenticated
  useEffect(() => {
    const authStatus = sessionStorage.getItem('dashboardAuth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');

    try {
      const response = await fetch('/api/auth/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setIsAuthenticated(true);
        sessionStorage.setItem('dashboardAuth', 'true');
        setPassword('');
      } else {
        const data = await response.json();
        setAuthError(data.error || 'Invalid password');
      }
    } catch (error) {
      setAuthError('Authentication failed. Please try again.');
      console.error('Auth error:', error);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('dashboardAuth');
    setPassword('');
    setAuthError('');
  };

  const handlePromptGenerated = () => {
    // Trigger refresh of AirtableRecords by incrementing the trigger
    setRefreshTrigger(prev => prev + 1);
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              Dashboard
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Please enter the password to access the dashboard
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter password"
                disabled={isAuthLoading}
              />
            </div>

            {authError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                <div className="text-red-800 dark:text-red-200 text-sm">
                  {authError}
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isAuthLoading || !password.trim()}
                className={`
                  group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                  ${isAuthLoading || !password.trim()
                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                  }
                `}
              >
                {isAuthLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Authenticating...
                  </div>
                ) : (
                  'Access Dashboard'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header with Logout */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-8 flex-1 overflow-hidden">
        {/* Sidebar with Model Selection */}
        <div className="w-80 flex-shrink-0">
          <div className="h-full">
            <ModelSelection
              selectedModelId={selectedModelId}
              onModelSelect={setSelectedModelId}
              currentTable={currentTable}
              onTableSync={handlePromptGenerated}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full">
          {/* Dashboard with Tabs */}
          <div className="flex-shrink-0">
            <DashboardMain currentTable={currentTable} onPromptGenerated={handlePromptGenerated} records={records} />
          </div>

          {/* Airtable Records - Scrollable */}
          <div className="flex-1 overflow-hidden mt-8">
            <AirtableRecords
              selectedModelId={selectedModelId}
              onTableChange={setCurrentTable}
              refreshTrigger={refreshTrigger}
              onRecordsChange={setRecords}
            />
          </div>
        </div>
      </div>
    </div>
  );
}