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
}: TableManagementProps) {
  return (
    <div className="lg:col-span-1">
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
                  <button
                    key={table.id}
                    onClick={() => setSelectedTable(table.id)}
                    className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                      selectedTable === table.id
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {table.name}
                  </button>
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

      {/* Table Schema Info */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Table Schema
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p><strong>Created tables include:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>id (text)</li>
            <li>reference_image (text)</li>
            <li>character_id (text)</li>
            <li>reference_image_attached (file)</li>
            <li>initial_prompt (long text)</li>
            <li>restyled_prompt (long text)</li>
            <li>edit_prompt (long text)</li>
            <li>regenerate_status (text)</li>
            <li>image_1 (file)</li>
            <li>image_2 (file)</li>
            <li>image_3 (file)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
