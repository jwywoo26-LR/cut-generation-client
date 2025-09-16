'use client';

import { useState } from 'react';
import TableSelector from './TableSelector';
import RecordsTable from './RecordsTable';

// Model data - should match ModelSelection component
const models = [
  {
    id: 'train-dfa3f57e398645098c8ffee40446639b',
    name: '현수아',
    thumbnail: '/data/thumbnails/suahyun_1.png'
  },
  {
    id: 'train-4331de6cf53d430795deb09fe9728f16', 
    name: '임수아',
    thumbnail: '/data/thumbnails/sualim.png'
  },
  {
    id: 'train-7f9911080f9e479198be762001437b16',
    name: '신서연',
    thumbnail: '/data/thumbnails/seoyeonshin.png'
  },
  {
    id: 'train-094acb0638db4d51845f95a24b9add2e',
    name: '김나희',
    thumbnail: '/data/thumbnails/kimnahee.png'
  },
];

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