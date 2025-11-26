'use client';

import React from 'react';
import { AirtableTable } from '../types';

interface TableManagementProps {
  tables: AirtableTable[];
  selectedTable: string;
  setSelectedTable: (tableId: string) => void;
  isLoadingTables: boolean;
  newTableName: string;
  setNewTableName: (name: string) => void;
  isCreatingTable: boolean;
  createTableError: string;
  createTableSuccess: string;
  onCreateTable: (e: React.FormEvent) => void;
  onRefreshTables: () => void;
  onDeleteTable: (tableId: string, tableName: string) => void;
  isDeletingTable: boolean;
}

export function TableManagement({
  tables,
  selectedTable,
  setSelectedTable,
  isLoadingTables,
  newTableName,
  setNewTableName,
  isCreatingTable,
  createTableError,
  createTableSuccess,
  onCreateTable,
  onRefreshTables,
  onDeleteTable,
  isDeletingTable,
}: TableManagementProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Table Management
        </h2>

        {/* Create New Table Form */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Create New Table
          </h3>
          <form onSubmit={onCreateTable} className="space-y-3">
            <input
              type="text"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              placeholder="Enter table name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isCreatingTable}
            />
            <button
              type="submit"
              disabled={isCreatingTable || !newTableName.trim()}
              className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                isCreatingTable || !newTableName.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isCreatingTable ? 'Creating...' : 'Create Table'}
            </button>
          </form>

          {createTableError && (
            <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-800 dark:text-red-200">
                {createTableError}
              </p>
            </div>
          )}

          {createTableSuccess && (
            <div className="mt-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
              <p className="text-sm text-green-800 dark:text-green-200">
                {createTableSuccess}
              </p>
            </div>
          )}
        </div>

        {/* Table Selection */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Table
          </h3>
          {isLoadingTables ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {tables.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No tables found. Create one to get started.
                </p>
              ) : (
                tables.map((table) => (
                  <div key={table.id} className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedTable(table.id)}
                      className={`flex-1 text-left px-4 py-2 rounded-md transition-colors ${
                        selectedTable === table.id
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {table.name}
                    </button>
                    <button
                      onClick={() => onDeleteTable(table.id, table.name)}
                      disabled={isDeletingTable}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={`Delete ${table.name}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
          <button
            onClick={onRefreshTables}
            className="mt-3 w-full py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Refresh Tables
          </button>
      </div>
    </div>
  );
}
