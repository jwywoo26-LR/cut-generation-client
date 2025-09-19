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

interface EditedPromptImageGenerationProps {
  currentTable?: string;
  onImagesGenerated?: () => void;
  records?: Array<{
    id: string;
    fields: Record<string, unknown>;
  }>;
}

export default function EditedPromptImageGeneration({ currentTable, onImagesGenerated, records = [] }: EditedPromptImageGenerationProps) {
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
      const imageFields = ['edited_prompt_image_1', 'edited_prompt_image_2', 'edited_prompt_image_3', 'edited_prompt_image_4', 'edited_prompt_image_5'];
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
            console.log(`Found image: ${referenceImage}_edited_v${imageNumber}.jpg`);
            images.push({
              url: imageUrl,
              filename: `${referenceImage}_edited_v${imageNumber}.jpg`
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
          zipName: `${currentTable}_edited_images.zip`
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to download images: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentTable}_edited_images.zip`;
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

  // Check if all records have result_status "initial_prompt_image_generated" (initial generation complete)
  const allRecordsComplete = records.length > 0 && records.every(record => {
    const resultStatus = String(record.fields.result_status || '');
    return resultStatus === 'initial_prompt_image_generated';
  });

  // Count records that have edited_prompt but no edited_prompt_images
  const recordsNeedingEditedImages = records.filter(record => {
    const hasEditedPrompt = record.fields.edited_prompt && 
                           String(record.fields.edited_prompt).trim() !== '';
    const resultStatus = String(record.fields.result_status || '');
    
    // Check if any edited_prompt_image fields are missing
    const missingEditedImages = ['edited_prompt_image_1', 'edited_prompt_image_2', 'edited_prompt_image_3', 'edited_prompt_image_4', 'edited_prompt_image_5']
      .slice(0, imageCount)
      .some(field => !record.fields[field]);
    
    return hasEditedPrompt && resultStatus === 'initial_prompt_image_generated' && missingEditedImages;
  });

  const handleRemoveAllImages = async () => {
    if (!currentTable || records.length === 0) {
      setError('No images to remove');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove ALL edited images from ${records.length} records? This action cannot be undone.`
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
          imageType: 'edited',
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

    if (!allRecordsComplete) {
      setError('Initial image generation must be complete (all records result_status: initial_prompt_image_generated) before edited prompt generation');
      return;
    }

    if (recordsNeedingEditedImages.length === 0) {
      setError('No records found that need edited prompt image generation');
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
          generationType: 'edited',
          imageCount: imageCount,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to generate edited prompt images (${response.status})`;
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
        setError('No records found that need edited prompt image generation');
      } else {
        // Trigger refresh of the AirtableRecords component
        onImagesGenerated?.();
      }

    } catch (error) {
      console.error('Error generating edited prompt images:', error);
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
          Edited Prompt Image Generation
        </h3>
        
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Generate images using edited_prompt and reference_image_attached.
            Images will be saved to numbered edited_prompt_image fields (1-5).
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
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
              <div className="text-purple-800 dark:text-purple-200 text-sm">
                <strong>Requirements:</strong> Your Airtable table must have numbered fields edited_prompt_image_1, edited_prompt_image_2, etc., and all initial generation must be complete.
              </div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="text-green-800 dark:text-green-200 text-sm">
                <strong>Status:</strong> {allRecordsComplete 
                  ? `Ready! ${recordsNeedingEditedImages.length} records need edited prompt images`
                  : 'Waiting for initial generation to complete'
                }
              </div>
              <div className="text-green-800 dark:text-green-200 text-xs mt-1">
                Debug: Total records: {records.length} | All complete: {allRecordsComplete ? 'YES' : 'NO'} | Need images: {recordsNeedingEditedImages.length}
              </div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="text-yellow-800 dark:text-yellow-200 text-sm">
                <strong>Note:</strong> Edited prompt image generation uses edited_prompt instead of initial_prompt. 
                The process will generate {imageCount} image{imageCount > 1 ? 's' : ''} per record with edited prompts.
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleGenerateImages}
              disabled={isGenerating || !currentTable || !allRecordsComplete}
              className={`
                px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2
                ${isGenerating || !currentTable || !allRecordsComplete
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
                }
              `}
            >
              {isGenerating && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {isGenerating 
                ? 'Generating Edited Prompt Images...' 
                : !currentTable 
                  ? 'Select a table first'
                  : !allRecordsComplete
                    ? 'Complete initial generation first'
                    : 'Generate Edited Prompt Images'
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
                  : 'Download All Edited Images'
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
                  : 'Remove All Edited Images'
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
            Edited Prompt Image Generation Results
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
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {totalGeneratedImages}
              </div>
              <div className="text-sm text-purple-800 dark:text-purple-300">
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
                    Generated {result.successCount || 0} edited prompt images successfully
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