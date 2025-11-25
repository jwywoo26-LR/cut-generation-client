'use client';

import React from 'react';

interface LoginScreenProps {
  password: string;
  setPassword: (password: string) => void;
  authError: string;
  isAuthLoading: boolean;
  onLogin: (e: React.FormEvent) => void;
}

export function LoginScreen({
  password,
  setPassword,
  authError,
  isAuthLoading,
  onLogin,
}: LoginScreenProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Dashboard V2
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Please enter the password to access the dashboard
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={onLogin}>
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
