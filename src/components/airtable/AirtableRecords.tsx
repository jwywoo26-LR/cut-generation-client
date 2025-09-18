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
  onRecordsChange?: (records: AirtableRecord[]) => void;
}

export default function AirtableRecords({ selectedModelId, onTableChange, refreshTrigger, onRecordsChange }: AirtableRecordsProps) {
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<Array<{id: string; name: string; thumbnail?: string}>>([]);
  const [hasActiveEdits, setHasActiveEdits] = useState(false);

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

  // Auto-refresh when generation jobs are active (every 60 seconds)
  useEffect(() => {
    if (!selectedTable) return;
    
    // Check if any records are currently processing
    const hasActiveJobs = records.some(record => {
      const status = String(record.fields.status || '');
      return status === 'generation_request_sent' || status === 'initial_request_sent';
    });
    
    if (!hasActiveJobs) return; // No active jobs, no need to auto-refresh
    
    const interval = setInterval(() => {
      if (hasActiveEdits) {
        console.log('Skipping auto-refresh - user is editing');
        return;
      }
      console.log('Auto-refreshing records due to active generation jobs...');
      fetchRecords(selectedTable);
    }, 60000); // Refresh every 60 seconds
    
    return () => clearInterval(interval);
  }, [records, selectedTable, hasActiveEdits]);

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
    const updatedRecords = records.map(record => 
      record.id === updatedRecord.id ? updatedRecord : record
    );
    setRecords(updatedRecords);
    onRecordsChange?.(updatedRecords);
  };

  const fetchRecords = async (tableName: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/airtable/records?table=${encodeURIComponent(tableName)}`);
      if (response.ok) {
        const data = await response.json();
        setRecords(data.records);
        onRecordsChange?.(data.records);
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
        
        <div className="flex items-center gap-3">
          <TableSelector 
            selectedTable={selectedTable}
            onTableSelect={handleTableSelect}
          />
          
          {selectedTable && (
            <button
              onClick={() => fetchRecords(selectedTable)}
              disabled={isLoading}
              className={`
                px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2
                ${isLoading
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                }
              `}
              title="Refresh records"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <span>🔄</span>
              )}
              Refresh
            </button>
          )}
        </div>
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
          onEditingChange={setHasActiveEdits}
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