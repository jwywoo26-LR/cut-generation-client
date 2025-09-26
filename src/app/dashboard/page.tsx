'use client';

import { useState } from 'react';
import ModelSelection from '@/components/ModelSelection';
import DashboardMain from '@/components/DashboardMain';
import { AirtableRecords } from '@/components/airtable';

export default function DashboardPage() {
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [currentTable, setCurrentTable] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [records, setRecords] = useState<Array<{id: string; fields: Record<string, unknown>}>>([]);


  const handlePromptGenerated = () => {
    // Trigger refresh of AirtableRecords by incrementing the trigger
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex gap-8 h-screen">
      {/* Sidebar with Model Selection */}
      <div className="w-80 flex-shrink-0">
        <div className="h-full">
          <ModelSelection
            selectedModelId={selectedModelId}
            onModelSelect={setSelectedModelId}
            currentTable={currentTable}
            onTableSync={handlePromptGenerated}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full">
        {/* Dashboard with Tabs */}
        <div className="flex-shrink-0">
          <DashboardMain currentTable={currentTable} onPromptGenerated={handlePromptGenerated} records={records} />
        </div>

        {/* Airtable Records - Scrollable */}
        <div className="flex-1 overflow-hidden mt-8">
          <AirtableRecords
            selectedModelId={selectedModelId}
            onTableChange={setCurrentTable}
            refreshTrigger={refreshTrigger}
            onRecordsChange={setRecords}
          />
        </div>
      </div>
    </div>
  );
}