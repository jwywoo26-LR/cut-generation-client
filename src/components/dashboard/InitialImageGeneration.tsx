'use client';

import { useState } from 'react';

interface ImageGenResult {
  recordId: string;
  status: 'success' | 'error';
  successCount?: number;
  errorCount?: number;
  generatedImages?: number;
  error?: string;
}

interface InitialImageGenerationProps {
  currentTable?: string;
  onImagesGenerated?: () => void;
}

export default function InitialImageGeneration({ currentTable, onImagesGenerated }: InitialImageGenerationProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<ImageGenResult[]>([]);
  const [error, setError] = useState<string>('');
  const [imageCount, setImageCount] = useState<number>(3);
  const [customCount, setCustomCount] = useState<string>('');
  const [useCustomCount, setUseCustomCount] = useState<boolean>(false);

  const handleGenerateImages = async () => {
    if (!currentTable) {
      setError('Please select a table from the Airtable Records section first');
      return;
    }

    setIsGenerating(true);
    setError('');
    setResults([]);

    try {
      const response = await fetch('/api/image-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableName: currentTable,
          generationType: 'initial',
          imageCount: useCustomCount ? parseInt(customCount) || 1 : imageCount,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to generate initial images (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setResults(data.results || []);
      
      if (data.processedCount === 0) {
        setError('No records found that need initial image generation');
      } else {
        // Trigger refresh of the AirtableRecords component
        onImagesGenerated?.();
      }

    } catch (error) {
      console.error('Error generating initial images:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const totalGeneratedImages = results.reduce((sum, r) => sum + (r.generatedImages || 0), 0);

  return (
    <div className="space-y-6">
      {/* Generate Button */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Initial Image Generation
        </h3>
        
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Generate images for each record using the initial_prompt and reference_image_attached.
            Images will be saved to initial_prompt_image fields (1, 2, 3).
            {currentTable && (
              <span className="block mt-1 text-blue-600 dark:text-blue-400 font-medium">
                Working with table: {currentTable}
              </span>
            )}
          </p>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Number of images per record:
            </label>
            
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!useCustomCount}
                  onChange={() => setUseCustomCount(false)}
                  disabled={isGenerating}
                  className="text-green-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Preset:</span>
              </label>
              <select
                value={imageCount}
                onChange={(e) => setImageCount(Number(e.target.value))}
                disabled={isGenerating || useCustomCount}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value={1}>1 image</option>
                <option value={2}>2 images</option>
                <option value={3}>3 images</option>
                <option value={5}>5 images</option>
                <option value={10}>10 images</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={useCustomCount}
                  onChange={() => setUseCustomCount(true)}
                  disabled={isGenerating}
                  className="text-green-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Custom:</span>
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={customCount}
                onChange={(e) => setCustomCount(e.target.value)}
                disabled={isGenerating || !useCustomCount}
                placeholder="Enter number (1-50)"
                className="px-3 py-1 w-40 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">images</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="text-blue-800 dark:text-blue-200 text-sm">
                <strong>Dynamic Columns:</strong> The system automatically creates Airtable fields like initial_prompt_image_1, initial_prompt_image_2, etc., based on your selected count. No manual column setup needed!
              </div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="text-yellow-800 dark:text-yellow-200 text-sm">
                <strong>Note:</strong> Image generation can take several minutes per image. 
                The process will generate {useCustomCount ? parseInt(customCount) || 1 : imageCount} image{(useCustomCount ? parseInt(customCount) || 1 : imageCount) > 1 ? 's' : ''} per record using your selected model and reference images.
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerateImages}
            disabled={isGenerating || !currentTable}
            className={`
              px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2
              ${isGenerating || !currentTable
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
              }
            `}
          >
            {isGenerating && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {isGenerating 
              ? 'Generating Initial Images...' 
              : !currentTable 
                ? 'Select a table first'
                : 'Generate Initial Images'
            }
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <div className="text-red-800 dark:text-red-200">
              <strong>Error:</strong> {error}
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {results.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Initial Image Generation Results
          </h3>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {successCount}
              </div>
              <div className="text-sm text-green-800 dark:text-green-300">
                Records Processed
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {totalGeneratedImages}
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-300">
                Images Generated
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {errorCount}
              </div>
              <div className="text-sm text-red-800 dark:text-red-300">
                Failed
              </div>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {results.map((result) => (
              <div 
                key={result.recordId}
                className={`
                  px-3 py-2 rounded text-sm
                  ${result.status === 'success' 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                  }
                `}
              >
                <div className="font-mono text-xs">{result.recordId}</div>
                {result.status === 'success' ? (
                  <div className="text-xs mt-1">
                    Generated {result.successCount || 0}/3 images successfully
                    {result.errorCount && result.errorCount > 0 && (
                      <span className="text-orange-600 dark:text-orange-400">
                        {' '}({result.errorCount} failed)
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-xs mt-1">
                    Error: {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}