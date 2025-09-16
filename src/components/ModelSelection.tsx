'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Model {
  id: string;
  name: string;
  thumbnail: string;
  description?: string; // Optional field that might be returned from API
}

interface ModelSelectionProps {
  selectedModelId?: string;
  onModelSelect: (modelId: string) => void;
  currentTable?: string;
  onTableSync?: () => void;
}

export default function ModelSelection({ selectedModelId, onModelSelect, currentTable, onTableSync }: ModelSelectionProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/airtable/models');
      if (response.ok) {
        const data = await response.json();
        // Filter and clean the models data to ensure valid structure
        const cleanModels = (data.models || []).filter((model: any) => 
          model && typeof model === 'object' && model.id && model.name
        ).map((model: any) => ({
          id: String(model.id),
          name: String(model.name),
          thumbnail: model.thumbnail || '',
          description: model.description
        }));
        setModels(cleanModels);
      } else {
        console.error('Failed to fetch models');
        setModels([]);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setModels([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelSelect = async (modelId: string) => {
    onModelSelect(modelId);
    
    // If we have a current table, sync the selected_characters field
    if (currentTable && modelId) {
      setIsSyncing(true);
      try {
        const response = await fetch('/api/airtable/update-selected-characters', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tableName: currentTable,
            modelId: modelId,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`Updated selected_characters for ${result.successCount} records`);
          // Trigger refresh of the AirtableRecords component
          onTableSync?.();
        } else {
          console.error('Failed to update selected_characters');
        }
      } catch (error) {
        console.error('Error updating selected_characters:', error);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Model Selection
      </h2>
      
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading models...</p>
        </div>
      ) : models.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No active models found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {models.map((model) => (
            <div
              key={model.id}
              onClick={() => handleModelSelect(model.id)}
              className={`
                cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md flex-shrink-0 w-48
                ${selectedModelId === model.id 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }
              `}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                {model.thumbnail ? (
                  <Image
                    src={model.thumbnail}
                    alt={model.name}
                    width={256}
                    height={256}
                    className="w-64 h-64 rounded-md object-cover"
                  />
                ) : (
                  <div className="w-64 h-64 rounded-md bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    <span className="text-gray-500 dark:text-gray-400">No Image</span>
                  </div>
                )}
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                    {String(model.name)}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ID: {String(model.id).slice(0, 12)}...
                  </p>
                </div>
              </div>
            </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-4 space-y-3">
        {selectedModelId && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Selected Model ID: <span className="font-mono font-medium">{selectedModelId}</span>
            </p>
          </div>
        )}
        
        {currentTable && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
            <p className="text-sm text-green-800 dark:text-green-200">
              Current Table: <span className="font-medium">{currentTable}</span>
              {selectedModelId && (
                <span className="block mt-1 text-xs">
                  Model selections will automatically update the selected_characters field for all records in this table.
                </span>
              )}
            </p>
          </div>
        )}
        
        {isSyncing && (
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-md">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
              <p className="text-sm text-orange-800 dark:text-orange-200">
                Updating selected_characters for all records in {currentTable}...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}