'use client';

import React from 'react';

interface ZipBatchTesterProps {
  selectedZipFile: File | null;
  isProcessing: boolean;
  progress: string;
  error: string;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProcess: () => void;
  onReset: () => void;
}

export function ZipBatchTester({
  selectedZipFile,
  isProcessing,
  progress,
  error,
  onFileSelect,
  onProcess,
  onReset,
}: ZipBatchTesterProps) {
  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Upload ZIP File
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select ZIP file containing images
            </label>
            <input
              type="file"
              accept=".zip"
              onChange={onFileSelect}
              disabled={isProcessing}
              className="block w-full text-sm text-gray-900 dark:text-gray-100
                       border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer
                       bg-gray-50 dark:bg-gray-700
                       focus:outline-none focus:ring-2 focus:ring-green-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              ZIP file should contain images in any folder structure. The structure will be preserved in the output.
            </p>
          </div>

          {selectedZipFile && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                📦 Selected: <span className="font-medium">{selectedZipFile.name}</span>
                <span className="text-xs ml-2">
                  ({(selectedZipFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {progress && !error && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">{progress}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onProcess}
              disabled={!selectedZipFile || isProcessing}
              className={`
                flex-1 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2
                ${!selectedZipFile || isProcessing
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
                }
              `}
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                'Process ZIP'
              )}
            </button>

            <button
              onClick={onReset}
              disabled={!selectedZipFile || isProcessing}
              className={`
                px-6 py-3 rounded-lg font-medium transition-colors
                ${!selectedZipFile || isProcessing
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
                }
              `}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-3">
          📋 How it works
        </h3>
        <ol className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200 list-decimal list-inside">
          <li>Upload a ZIP file containing images (any folder structure)</li>
          <li>The system will process all images through mosaic detection</li>
          <li>Download the result ZIP containing:
            <ul className="ml-6 mt-1 space-y-1 list-disc list-inside">
              <li><code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">inputs/</code> - Original images (structure preserved)</li>
              <li><code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">outputs/</code> - Processed images (structure preserved)</li>
              <li><code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">results.csv</code> - Processing metadata and tracking</li>
            </ul>
          </li>
          <li>Processing may take several minutes depending on the number of images</li>
        </ol>
      </div>
    </div>
  );
}
