'use client';

import { useState, useEffect } from 'react';
import ModelSelection from '@/components/ModelSelection';
import DashboardMain from '@/components/DashboardMain';
import { AirtableRecords } from '@/components/airtable';

export default function DashboardPage() {
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [selectedModelInfo, setSelectedModelInfo] = useState<{id: string; name: string; thumbnail?: string}>();
  const [availableModels, setAvailableModels] = useState<Array<{id: string; name: string; thumbnail?: string}>>([]);
  const [currentTable, setCurrentTable] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Fetch models on component mount
  useEffect(() => {
    fetchModels();
  }, []);

  // Update selected model info when selectedModelId changes
  useEffect(() => {
    if (selectedModelId && availableModels.length > 0) {
      const modelInfo = availableModels.find(model => model.id === selectedModelId);
      if (modelInfo) {
        // Ensure the modelInfo is properly cleaned
        setSelectedModelInfo({
          id: String(modelInfo.id),
          name: String(modelInfo.name),
          thumbnail: String(modelInfo.thumbnail || '')
        });
      } else {
        setSelectedModelInfo(undefined);
      }
    } else {
      setSelectedModelInfo(undefined);
    }
  }, [selectedModelId, availableModels]);

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/airtable/models');
      if (response.ok) {
        const data = await response.json();
        // Clean the models data to ensure valid structure
        const cleanModels = (data.models || []).filter((model: any) => 
          model && typeof model === 'object' && model.id && model.name
        ).map((model: any) => ({
          id: String(model.id),
          name: String(model.name).trim(),
          thumbnail: String(model.thumbnail || '')
        }));
        setAvailableModels(cleanModels);
      } else {
        console.error('Failed to fetch models');
        setAvailableModels([]);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setAvailableModels([]);
    }
  };

  const handlePromptGenerated = () => {
    // Trigger refresh of AirtableRecords by incrementing the trigger
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-8">
      {/* Model Selection */}
      <ModelSelection 
        selectedModelId={selectedModelId}
        onModelSelect={setSelectedModelId}
        currentTable={currentTable}
        onTableSync={handlePromptGenerated}
      />

      {/* Dashboard with Tabs */}
      <DashboardMain currentTable={currentTable} onPromptGenerated={handlePromptGenerated} />

      {/* Airtable Records */}
      <AirtableRecords 
        selectedModelId={selectedModelId} 
        onTableChange={setCurrentTable}
        refreshTrigger={refreshTrigger}
      />

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