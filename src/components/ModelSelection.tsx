'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface Model {
  id: string;
  name: string;
  thumbnail: string;
  description?: string; // Optional field that might be returned from API
  training_mode?: string; // Training mode: single or nsfw
}

type FilterMode = 'all' | 'single' | 'nsfw';

interface ModelSelectionProps {
  selectedModelId?: string;
  onModelSelect: (modelId: string) => void;
  currentTable?: string;
  onTableSync?: () => void;
}

export default function ModelSelection({ selectedModelId, onModelSelect, currentTable, onTableSync }: ModelSelectionProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedModel, setExpandedModel] = useState<Model | null>(null);

  const handleModelSelect = useCallback(async (modelId: string) => {
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
  }, [currentTable, onModelSelect, onTableSync]);

  useEffect(() => {
    fetchModels();
  }, []);

  // Keyboard navigation for modal only
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (models.length === 0 || !expandedModel) return;

      // Handle modal navigation only
      const currentIndex = models.findIndex(m => m.id === expandedModel.id);
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : models.length - 1;
          setExpandedModel(models[prevIndex]);
          break;
        case 'ArrowRight':
          e.preventDefault();
          const nextIndex = currentIndex < models.length - 1 ? currentIndex + 1 : 0;
          setExpandedModel(models[nextIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          setExpandedModel(null);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          handleModelSelect(expandedModel.id);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [models, expandedModel, handleModelSelect]);

  const fetchModels = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/airtable/models');
      if (response.ok) {
        const data = await response.json();
        // Filter and clean the models data to ensure valid structure
        const cleanModels = (data.models || []).filter((model: { id: unknown; name: unknown; thumbnail?: unknown; description?: unknown; training_mode?: unknown }) =>
          model && typeof model === 'object' && model.id && model.name
        ).map((model: { id: unknown; name: unknown; thumbnail?: unknown; description?: unknown; training_mode?: unknown }) => ({
          id: String(model.id),
          name: String(model.name),
          thumbnail: model.thumbnail || '',
          description: model.description,
          training_mode: model.training_mode ? String(model.training_mode) : undefined
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

  // Filter models based on selected filter mode
  const filteredModels = models.filter((model) => {
    if (filterMode === 'all') return true;
    return model.training_mode === filterMode;
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 h-full flex flex-col">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Model Selection
      </h2>

      {/* Filter Tabs */}
      <div className="mb-4">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-6">
            <button
              onClick={() => setFilterMode('all')}
              className={`${
                filterMode === 'all'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode('single')}
              className={`${
                filterMode === 'single'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Single
            </button>
            <button
              onClick={() => setFilterMode('nsfw')}
              className={`${
                filterMode === 'nsfw'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              NSFW
            </button>
          </nav>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading models...</p>
        </div>
      ) : filteredModels.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            {models.length === 0 ? 'No active models found.' : `No ${filterMode === 'all' ? '' : filterMode} models found.`}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            {filteredModels.map((model) => (
              <div
                key={model.id}
                className={`
                  relative rounded-lg border-2 p-4 transition-all hover:shadow-md w-full
                  ${selectedModelId === model.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }
                `}
              >
                {/* Expand button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedModel(model);
                  }}
                  className="absolute top-2 right-2 p-1 bg-white dark:bg-gray-700 rounded-full shadow-md hover:shadow-lg transition-all z-10"
                >
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>

                <div
                  onClick={() => handleModelSelect(model.id)}
                  className="cursor-pointer flex flex-col items-center text-center space-y-3"
                >
                  {model.thumbnail ? (
                    <Image
                      src={model.thumbnail}
                      alt={model.name}
                      width={200}
                      height={200}
                      className="w-50 h-50 rounded-md object-cover"
                    />
                  ) : (
                    <div className="w-50 h-50 rounded-md bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                      <span className="text-gray-500 dark:text-gray-400">No Image</span>
                    </div>
                  )}
                </div>

                {/* Select button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleModelSelect(model.id);
                  }}
                  className={`
                    w-full mt-3 px-3 py-2 rounded-md text-sm font-medium transition-all
                    ${selectedModelId === model.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  {selectedModelId === model.id ? 'Selected' : 'Select'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3 flex-shrink-0">
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

      {/* Modal for expanded image */}
      {expandedModel && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setExpandedModel(null)}
        >
          <div
            className="relative bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setExpandedModel(null)}
              className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal content */}
            <div className="flex flex-col items-center space-y-4">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {expandedModel.name}
              </h3>

              {expandedModel.thumbnail ? (
                <Image
                  src={expandedModel.thumbnail}
                  alt={expandedModel.name}
                  width={600}
                  height={600}
                  className="max-w-full max-h-[60vh] rounded-lg object-contain"
                />
              ) : (
                <div className="w-96 h-96 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                  <span className="text-gray-500 dark:text-gray-400 text-lg">No Image Available</span>
                </div>
              )}

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Model ID:</span> {expandedModel.id}
                </p>
                {expandedModel.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 max-w-lg">
                    {expandedModel.description}
                  </p>
                )}
              </div>

              {/* Select button in modal */}
              <button
                onClick={() => {
                  handleModelSelect(expandedModel.id);
                  setExpandedModel(null);
                }}
                className={`
                  px-6 py-3 rounded-lg text-sm font-medium transition-all
                  ${selectedModelId === expandedModel.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
              >
                {selectedModelId === expandedModel.id ? 'Selected' : 'Select Model'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}