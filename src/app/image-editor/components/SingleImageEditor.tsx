'use client';

import React from 'react';

interface SingleImageEditorProps {
  selectedFile: File | null;
  previewUrl: string;
  isProcessing: boolean;
  processedImageUrl: string;
  error: string;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenModal: (imageUrl: string, title: string) => void;
}

export function SingleImageEditor({
  selectedFile,
  previewUrl,
  isProcessing,
  processedImageUrl,
  error,
  onFileSelect,
  onOpenModal,
}: SingleImageEditorProps) {
  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Upload Image
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select an image file
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={onFileSelect}
            disabled={isProcessing}
            className="block w-full text-sm text-gray-900 dark:text-gray-100
                     border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer
                     bg-gray-50 dark:bg-gray-700
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            PNG, JPG, JPEG, or WEBP (Max 20MB)
          </p>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
      </div>

      {/* Results Section */}
      {(previewUrl || processedImageUrl || isProcessing) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Results
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Original Image */}
            {previewUrl && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Original
                </h3>
                <div
                  className="relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onOpenModal(previewUrl, 'Original Image')}
                >
                  <img
                    src={previewUrl}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                  Click to view full size
                </p>
              </div>
            )}

            {/* Processed Image */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Edited
              </h3>
              <div className="relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                {isProcessing ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <svg
                        className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Processing image...
                      </p>
                    </div>
                  </div>
                ) : processedImageUrl ? (
                  <>
                    <img
                      src={processedImageUrl}
                      alt="Edited"
                      className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => onOpenModal(processedImageUrl, 'Edited Image')}
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No processed image yet
                    </p>
                  </div>
                )}
              </div>
              {processedImageUrl && !isProcessing && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                  Click to view full size
                </p>
              )}
            </div>
          </div>

          {/* Download Button */}
          {processedImageUrl && !isProcessing && (
            <div className="mt-6">
              <a
                href={processedImageUrl}
                download="edited-image.png"
                className="block w-full text-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                Download Edited Image
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
