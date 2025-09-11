'use client';

import { useEffect, useState } from 'react';

interface AirtableTable {
  id: string;
  name: string;
  description?: string;
}

interface TableSelectorProps {
  selectedTable: string;
  onTableSelect: (tableName: string) => void;
}

export default function TableSelector({ selectedTable, onTableSelect }: TableSelectorProps) {
  const [availableTables, setAvailableTables] = useState<AirtableTable[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);

  // Fetch available tables on component mount
  useEffect(() => {
    fetchAvailableTables();
  }, []);

  const fetchAvailableTables = async () => {
    setIsLoadingTables(true);
    try {
      const response = await fetch('/api/airtable/tables');
      if (response.ok) {
        const data = await response.json();
        setAvailableTables(data.tables);
      } else {
        console.error('Failed to fetch tables');
        // Fallback to sample tables if API fails
        setAvailableTables([
          { id: 'sample1', name: 'Character Generation' },
          { id: 'sample2', name: 'Scene Generation' },
          { id: 'sample3', name: 'Background Generation' },
          { id: 'sample4', name: 'Style Transfer' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      // Fallback to sample tables
      setAvailableTables([
        { id: 'sample1', name: 'Character Generation' },
        { id: 'sample2', name: 'Scene Generation' },
        { id: 'sample3', name: 'Background Generation' },
        { id: 'sample4', name: 'Style Transfer' }
      ]);
    } finally {
      setIsLoadingTables(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <label htmlFor="table-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Select Table:
      </label>
      {isLoadingTables && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      )}
      <select
        id="table-select"
        value={selectedTable}
        onChange={(e) => onTableSelect(e.target.value)}
        disabled={isLoadingTables}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-64 disabled:opacity-50"
      >
        <option value="">
          {isLoadingTables ? "Loading tables..." : "Choose a table..."}
        </option>
        {availableTables.map((table) => (
          <option key={table.id} value={table.name}>
            {table.name}
          </option>
        ))}
      </select>
      
      {selectedTable && (
        <span className="text-xs text-green-600 dark:text-green-400">
          ✓ Connected
        </span>
      )}
    </div>
  );
}