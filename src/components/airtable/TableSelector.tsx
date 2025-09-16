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
        
        // Log filtering results for debugging
        if (data.totalTables && data.compatibleTables !== undefined) {
          console.log(`Found ${data.compatibleTables} compatible tables out of ${data.totalTables} total tables`);
        }
      } else {
        console.error('Failed to fetch tables');
        setAvailableTables([]);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      setAvailableTables([]);
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
          {isLoadingTables 
            ? "Loading tables..." 
            : availableTables.length === 0 
              ? "No compatible tables found"
              : "Choose a table..."
          }
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
      
      {!isLoadingTables && availableTables.length === 0 && (
        <span className="text-xs text-amber-600 dark:text-amber-400">
          ⚠ No tables with required columns found
        </span>
      )}
    </div>
  );
}