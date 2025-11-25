'use client';

import { useState } from 'react';

interface AirtableTable {
  id: string;
  name: string;
  fields: { name: string }[];
}

interface TableManagementProps {
  tables: AirtableTable[];
  selectedTable: string;
  isLoadingTables: boolean;
  onTableSelect: (tableName: string) => void;
  onTableCreated: () => void;
}

export default function TableManagement({
  tables,
  selectedTable,
  isLoadingTables,
  onTableSelect,
  onTableCreated,
}: TableManagementProps) {
  const [newTableName, setNewTableName] = useState('');
  const [isCreatingTable, setIsCreatingTable] = useState(false);
  const [createTableError, setCreateTableError] = useState('');
  const [createTableSuccess, setCreateTableSuccess] = useState('');

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;

    setIsCreatingTable(true);
    setCreateTableError('');
    setCreateTableSuccess('');

    try {
      const response = await fetch('/api/airtable/create-translator-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableName: newTableName }),
      });

      if (response.ok) {
        setCreateTableSuccess('Table created successfully!');
        setNewTableName('');
        onTableCreated();
      } else {
        const data = await response.json();
        setCreateTableError(data.error || 'Failed to create table');
      }
    } catch (error) {
      setCreateTableError('Failed to create table. Please try again.');
      console.error('Create table error:', error);
    } finally {
      setIsCreatingTable(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Table Management
      </h2>

      {/* Select Table */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Table
        </label>
        <select
          value={selectedTable}
          onChange={(e) => onTableSelect(e.target.value)}
          disabled={isLoadingTables}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose a table</option>
          {tables.map((table) => (
            <option key={table.id} value={table.name}>
              {table.name}
            </option>
          ))}
        </select>
        {isLoadingTables && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading tables...</p>
        )}
      </div>

      {/* Create New Table */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Create New Table
        </label>
        <form onSubmit={handleCreateTable} className="space-y-3">
          <input
            type="text"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            placeholder="Table name"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isCreatingTable || !newTableName.trim()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCreatingTable ? 'Creating...' : 'Create Table'}
          </button>
          {createTableError && (
            <p className="text-sm text-red-600 dark:text-red-400">{createTableError}</p>
          )}
          {createTableSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400">{createTableSuccess}</p>
          )}
        </form>
      </div>
    </div>
  );
}
