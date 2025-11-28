'use client';

import { useState, useEffect } from 'react';

interface PromptGenResult {
  recordId: string;
  status: 'success' | 'error';
  initialPrompt?: string;
  enhancedPrompt?: string;
  error?: string;
}

interface PromptGenerationProps {
  currentTable?: string;
  onPromptGenerated?: () => void;
}

export default function PromptGeneration({ currentTable, onPromptGenerated }: PromptGenerationProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<PromptGenResult[]>([]);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleGeneratePrompts = async () => {
    if (!currentTable) {
      setError('Please select a table from the Airtable Records section first');
      return;
    }

    setIsGenerating(true);
    setError('');
    setResults([]);
    setProgress({ current: 0, total: 0 });

    try {
      const response = await fetch('/api/prompt-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableName: currentTable,
        }),
      });

      if (!response.ok) {
        // Check if response is JSON or text
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate prompts');
        } else {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to generate prompts');
        }
      }

      // Check if response is JSON (no records case) or SSE stream
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        // Handle JSON response (no records to process)
        const data = await response.json();
        if (data.processedCount === 0) {
          setError('No records found that need prompt generation');
        }
        return;
      }

      // Read the SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'start') {
              setProgress({ current: 0, total: data.total });
            } else if (data.type === 'progress') {
              setProgress({ current: data.current, total: data.total });

              // Add result to the list
              setResults(prev => [...prev, {
                recordId: data.recordId,
                status: data.status === 'success' ? 'success' : 'error',
                error: data.error,
              }]);
            } else if (data.type === 'complete') {
              setProgress({ current: data.processedCount, total: data.processedCount });

              if (data.processedCount === 0) {
                setError('No records found that need prompt generation');
              } else {
                // Trigger refresh of the AirtableRecords component
                onPromptGenerated?.();
              }
            }
          }
        }
      }

    } catch (error) {
      console.error('Error generating prompts:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  // Prevent hydration mismatch by not rendering dynamic content until mounted
  if (!isMounted) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Prompt Generation
          </h3>
          <div className="flex gap-6">
            <div className="flex-1">
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Generate initial and enhanced prompts for records that only have reference images filled.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Generate Button */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Prompt Generation
        </h3>

        <div className="flex gap-6">
          {/* Left column - Text */}
          <div className="flex-1">
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Generate initial and enhanced prompts for records that only have reference images filled.
              {currentTable && (
                <span className="block mt-1 text-blue-600 dark:text-blue-400 font-medium">
                  Working with table: {currentTable}
                </span>
              )}
            </p>
          </div>

          {/* Right column - Button */}
          <div className="flex-shrink-0">
            <button
              onClick={handleGeneratePrompts}
              disabled={isGenerating || !currentTable}
              className={`
                px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2
                ${isGenerating || !currentTable
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                }
              `}
            >
              {isGenerating && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {isGenerating
                ? 'Generating Prompts...'
                : !currentTable
                  ? 'Select a table first'
                  : 'Generate Prompts'
              }
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {isGenerating && progress.total > 0 && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Processing prompts...
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {progress.current} / {progress.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {progressPercentage.toFixed(0)}% complete
            </p>
          </div>
        )}
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
            Generation Results
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {successCount}
              </div>
              <div className="text-sm text-green-800 dark:text-green-300">
                Successful
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
                    Prompts generated successfully
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