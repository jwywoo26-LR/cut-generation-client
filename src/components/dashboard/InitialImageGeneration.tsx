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
  records?: Array<{
    id: string;
    fields: Record<string, unknown>;
  }>;
}

export default function InitialImageGeneration({ currentTable, onImagesGenerated, records = [] }: InitialImageGenerationProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<ImageGenResult[]>([]);
  const [error, setError] = useState<string>('');
  const [imageCount, setImageCount] = useState<number>(3);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleDownloadAll = async () => {
    console.log('Download button clicked');
    console.log('Current table:', currentTable);
    console.log('Records length:', records.length);
    console.log('Records:', records);
    
    if (!currentTable || records.length === 0) {
      setError('No images to download');
      return;
    }

    setIsDownloading(true);
    try {
      const imageFields = ['initial_prompt_image_1', 'initial_prompt_image_2', 'initial_prompt_image_3', 'initial_prompt_image_4', 'initial_prompt_image_5'];
      const images: Array<{url: string, filename: string}> = [];
      
      for (const record of records) {
        const referenceImage = String(record.fields.reference_image || '');
        console.log(`Processing record ${record.id}, reference: ${referenceImage}`);
        console.log('Record fields:', Object.keys(record.fields));
        
        for (const field of imageFields) {
          const imageField = record.fields[field];
          console.log(`Checking field ${field}:`, imageField);
          
          // Handle both string URLs and Airtable attachment arrays
          let imageUrl = '';
          if (typeof imageField === 'string' && imageField.startsWith('http')) {
            imageUrl = imageField;
          } else if (Array.isArray(imageField) && imageField.length > 0 && imageField[0].url) {
            imageUrl = imageField[0].url;
          }
          
          if (imageUrl) {
            const imageNumber = field.split('_').pop(); // Extract number from field name
            console.log(`Found image: ${referenceImage}_initial_v${imageNumber}.jpg`);
            images.push({
              url: imageUrl,
              filename: `${referenceImage}_initial_v${imageNumber}.jpg`
            });
          }
        }
      }

      console.log('Total images found:', images.length);
      if (images.length === 0) {
        setError('No images found to download');
        return;
      }

      console.log(`Downloading ${images.length} images...`);
      
      const response = await fetch('/api/download-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images,
          zipName: `${currentTable}_initial_images.zip`
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to download images: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentTable}_initial_images.zip`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('Successfully downloaded all images as zip');
    } catch (error) {
      console.error('Error downloading images:', error);
      setError('Failed to download images');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRemoveAllImages = async () => {
    if (!currentTable || records.length === 0) {
      setError('No images to remove');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove ALL initial images from ${records.length} records? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    setIsRemoving(true);
    setError('');

    try {
      const response = await fetch('/api/airtable/clear-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableName: currentTable,
          imageType: 'initial',
          recordIds: records.map(r => r.id)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove images');
      }

      const data = await response.json();
      console.log('Successfully removed images:', data);
      
      // Trigger refresh of the AirtableRecords component
      onImagesGenerated?.();
      
    } catch (error) {
      console.error('Error removing images:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove images');
    } finally {
      setIsRemoving(false);
    }
  };

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
          imageCount: imageCount,
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
        
        <div className="flex gap-6">
          {/* Left column - Text and controls */}
          <div className="flex-1 space-y-4">
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Generate images for each record using the initial_prompt and reference_image_attached.
              Images will be saved to numbered initial_prompt_image fields (1-5).
              {currentTable && (
                <span className="block mt-1 text-blue-600 dark:text-blue-400 font-medium">
                  Working with table: {currentTable}
                </span>
              )}
            </p>

            <div className="space-y-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Number of images per record:
              </label>

              <select
                value={imageCount}
                onChange={(e) => setImageCount(Number(e.target.value))}
                disabled={isGenerating}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value={1}>1 image</option>
                <option value={2}>2 images</option>
                <option value={3}>3 images</option>
                <option value={4}>4 images</option>
                <option value={5}>5 images</option>
              </select>
            </div>

            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="text-blue-800 dark:text-blue-200 text-sm">
                  <strong>Required Columns:</strong> Your Airtable table must have numbered fields initial_prompt_image_1, initial_prompt_image_2, etc., up to the number you select.
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div className="text-yellow-800 dark:text-yellow-200 text-sm">
                  <strong>Note:</strong> Image generation can take several minutes per image.
                  The process will generate {imageCount} image{imageCount > 1 ? 's' : ''} per record using your selected model and reference images.
                </div>
              </div>
            </div>
          </div>

          {/* Right column - Buttons */}
          <div className="flex-shrink-0 flex flex-col gap-3">
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

            <button
              onClick={handleDownloadAll}
              disabled={isDownloading || !currentTable || records.length === 0}
              className={`
                px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2
                ${isDownloading || !currentTable || records.length === 0
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                }
              `}
            >
              {isDownloading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {isDownloading 
                ? 'Downloading...' 
                : !currentTable 
                  ? 'Select a table first'
                  : 'Download All Initial Images'
              }
            </button>

            <button
              onClick={handleRemoveAllImages}
              disabled={isRemoving || !currentTable || records.length === 0}
              className={`
                px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2
                ${isRemoving || !currentTable || records.length === 0
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white'
                }
              `}
            >
              {isRemoving && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {isRemoving 
                ? 'Removing...' 
                : !currentTable 
                  ? 'Select a table first'
                  : 'Remove All Initial Images'
              }
            </button>
          </div>
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