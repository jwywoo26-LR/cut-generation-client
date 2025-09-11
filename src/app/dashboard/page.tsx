'use client';

import { useState } from 'react';
import ModelSelection from '@/components/ModelSelection';
import { AirtableRecords } from '@/components/airtable';

export default function DashboardPage() {
  const [selectedModelId, setSelectedModelId] = useState<string>('');

  return (
    <div className="space-y-8">
      {/* Model Selection */}
      <ModelSelection 
        selectedModelId={selectedModelId}
        onModelSelect={setSelectedModelId}
      />

      {/* Airtable Records */}
      <AirtableRecords selectedModelId={selectedModelId} />

      {/* Generation Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Generation Controls
        </h2>
        <div className="flex gap-4">
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            disabled
          >
            Start Generation
          </button>
          <button 
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400"
            disabled
          >
            Stop All
          </button>
          <button 
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            disabled
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}