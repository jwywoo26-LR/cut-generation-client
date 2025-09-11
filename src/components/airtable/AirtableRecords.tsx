'use client';

import { useState } from 'react';
import TableSelector from './TableSelector';
import RecordsTable from './RecordsTable';

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

interface AirtableRecordsProps {
  selectedModelId?: string;
}

export default function AirtableRecords({ selectedModelId }: AirtableRecordsProps) {
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleTableSelect = async (tableName: string) => {
    if (!tableName) {
      setSelectedTable('');
      setRecords([]);
      return;
    }

    setSelectedTable(tableName);
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/airtable/records?table=${encodeURIComponent(tableName)}`);
      if (response.ok) {
        const data = await response.json();
        setRecords(data.records);
      } else {
        console.error('Failed to fetch records');
        setRecords([]);
      }
    } catch (error) {
      console.error('Error fetching records:', error);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Airtable Records
        </h2>
        
        <TableSelector 
          selectedTable={selectedTable}
          onTableSelect={handleTableSelect}
        />
      </div>

      {/* Records Display */}
      {selectedTable ? (
        <RecordsTable 
          records={records}
          selectedModelId={selectedModelId}
          isLoading={isLoading}
        />
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            Select a table to view records.
          </p>
        </div>
      )}
    </div>
  );
}