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

interface PromptOnlyImageGenerationProps {
  currentTable?: string;
  onImagesGenerated?: () => void;
  records?: Array<{
    id: string;
    fields: Record<string, unknown>;
  }>;
}

export default function PromptOnlyImageGeneration({ currentTable, onImagesGenerated, records = [] }: PromptOnlyImageGenerationProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<ImageGenResult[]>([]);
  const [error, setError] = useState<string>('');
  const [imageCount, setImageCount] = useState<number>(3);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedPromptType, setSelectedPromptType] = useState<'initial' | 'edited'>('initial');

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
      const imageFields = ['prompt_only_image_1', 'prompt_only_image_2', 'prompt_only_image_3'];
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
            console.log(`Found image: ${referenceImage}_prompt_only_v${imageNumber}.jpg`);
            images.push({
              url: imageUrl,
              filename: `${referenceImage}_prompt_only_v${imageNumber}.jpg`
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
          zipName: `${currentTable}_prompt_only_images.zip`
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to download images: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentTable}_prompt_only_images.zip`;
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
          generationType: 'prompt-only',
          imageCount: imageCount,
          promptType: selectedPromptType,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to generate prompt-only images (${response.status})`;
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
        setError('No records found that need prompt-only image generation');
      } else {
        // Trigger refresh of the AirtableRecords component
        onImagesGenerated?.();
      }

    } catch (error) {
      console.error('Error generating prompt-only images:', error);
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
          Prompt-Only Image Generation
        </h3>
        
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Generate images using only text prompts (initial_prompt or edited_prompt). Reference images are used only for optimal dimensions.
            Images will be saved to numbered prompt_only_image fields (1-3).
            {currentTable && (
              <span className="block mt-1 text-blue-600 dark:text-blue-400 font-medium">
                Working with table: {currentTable}
              </span>
            )}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Number of images per record:
              </label>
              
              <select
                value={imageCount}
                onChange={(e) => setImageCount(Number(e.target.value))}
                disabled={isGenerating}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-full"
              >
                <option value={1}>1 image</option>
                <option value={2}>2 images</option>
                <option value={3}>3 images</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Prompt to use for generation:
              </label>
              
              <select
                value={selectedPromptType}
                onChange={(e) => setSelectedPromptType(e.target.value as 'initial' | 'edited')}
                disabled={isGenerating}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-full"
              >
                <option value="initial">Initial Prompt</option>
                <option value="edited">Edited Prompt</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
              <div className="text-purple-800 dark:text-purple-200 text-sm">
                <strong>Required Columns:</strong> Your Airtable table must have numbered fields prompt_only_image_1, prompt_only_image_2, and prompt_only_image_3.
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="text-blue-800 dark:text-blue-200 text-sm">
                <strong>How it works:</strong> This generates images purely from text prompts without using reference images for content. 
                Reference images are only used to determine optimal dimensions if available.
              </div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="text-yellow-800 dark:text-yellow-200 text-sm">
                <strong>Note:</strong> Image generation can take several minutes per image. 
                The process will generate {imageCount} image{imageCount > 1 ? 's' : ''} per record using your selected model and text prompts only.
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleGenerateImages}
              disabled={isGenerating || !currentTable}
              className={`
                px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2
                ${isGenerating || !currentTable
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
                }
              `}
            >
              {isGenerating && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {isGenerating 
                ? 'Generating Prompt-Only Images...' 
                : !currentTable 
                  ? 'Select a table first'
                  : 'Generate Prompt-Only Images'
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
                  : 'Download All Prompt-Only Images'
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
            Prompt-Only Image Generation Results
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