'use client';

import { useState, useEffect } from 'react';
import TableSelector from './TableSelector';
import RecordsTable from './RecordsTable';

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

interface AirtableRecordsProps {
  selectedModelId?: string;
  onTableChange?: (tableName: string) => void;
  refreshTrigger?: number;
}

export default function AirtableRecords({ selectedModelId, onTableChange, refreshTrigger }: AirtableRecordsProps) {
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<Array<{id: string; name: string; thumbnail?: string}>>([]);

  // Fetch models on component mount
  useEffect(() => {
    fetchModels();
  }, []);

  // Refresh records when refreshTrigger changes
  useEffect(() => {
    if (selectedTable && refreshTrigger !== undefined) {
      fetchRecords(selectedTable);
    }
  }, [refreshTrigger, selectedTable]);

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/airtable/models');
      if (response.ok) {
        const data = await response.json();
        setModels(data.models);
      } else {
        console.error('Failed to fetch models');
        setModels([]);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setModels([]);
    }
  };

  // Find selected model info
  const selectedModelInfo = selectedModelId 
    ? models.find(model => model.id === selectedModelId)
    : undefined;

  const handleRecordUpdate = (updatedRecord: AirtableRecord) => {
    setRecords(prevRecords => 
      prevRecords.map(record => 
        record.id === updatedRecord.id ? updatedRecord : record
      )
    );
  };

  const fetchRecords = async (tableName: string) => {
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

  const handleTableSelect = async (tableName: string) => {
    if (!tableName) {
      setSelectedTable('');
      setRecords([]);
      onTableChange?.('');
      return;
    }

    setSelectedTable(tableName);
    onTableChange?.(tableName);
    await fetchRecords(tableName);
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
          isLoading={isLoading}
          tableName={selectedTable}
          onRecordUpdate={handleRecordUpdate}
          selectedModelInfo={selectedModelInfo}
          availableModels={models}
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