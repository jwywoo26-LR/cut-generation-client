'use client';

import React from 'react';

interface SingleImageTesterProps {
  selectedFile: File | null;
  previewUrl: string;
  isProcessing: boolean;
  processedImageUrl: string;
  error: string;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
  onOpenModal: (imageUrl: string, title: string) => void;
}

export function SingleImageTester({
  selectedFile,
  previewUrl,
  isProcessing,
  processedImageUrl,
  error,
  onFileSelect,
  onReset,
  onOpenModal
}: SingleImageTesterProps) {
  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if it's an image URL from examples
    const imageUrl = e.dataTransfer.getData('imageUrl');
    const imageName = e.dataTransfer.getData('imageName');

    if (imageUrl && imageName) {
      // Handle dropped example image
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], imageName, { type: blob.type });

        const input = document.getElementById('single-file-upload') as HTMLInputElement;
        if (input) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          input.files = dataTransfer.files;

          const event = new Event('change', { bubbles: true });
          input.dispatchEvent(event);
        }
      } catch (error) {
        console.error('Failed to load example image:', error);
      }
      return;
    }

    // Handle regular file drop
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Only take the first file
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Create a synthetic event to trigger onFileSelect
    const input = document.getElementById('single-file-upload') as HTMLInputElement;
    if (input) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;

      const event = new Event('change', { bubbles: true });
      input.dispatchEvent(event);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Buttons */}
      <div className="flex items-center gap-3">
        <input
          id="single-file-upload"
          type="file"
          accept="image/*"
          onChange={onFileSelect}
          className="hidden"
        />

        <button
          onClick={onReset}
          disabled={!selectedFile}
          className={`
            px-6 py-3 rounded-lg font-medium transition-colors
            ${!selectedFile
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-gray-600 hover:bg-gray-700 text-white'
            }
          `}
        >
          Reset
        </button>

        {selectedFile && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-600 dark:text-gray-300">{selectedFile.name}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({(selectedFile.size / 1024).toFixed(2)} KB)
            </span>
          </div>
        )}
      </div>

      {isProcessing && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-blue-800 dark:text-blue-200">Processing image...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="text-red-800 dark:text-red-200">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Input and Output Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Input Column */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Input
          </h3>
          {previewUrl ? (
            <>
              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 h-72 flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Original"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                {selectedFile?.name}
              </div>
            </>
          ) : (
            <label
              htmlFor="single-file-upload"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-72 flex items-center justify-center bg-white dark:bg-gray-800 cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
            >
              <div className="text-center text-gray-500 dark:text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-semibold mb-1">Click to upload or drag and drop</p>
                <p className="text-xs">PNG, JPG, WebP</p>
              </div>
            </label>
          )}
        </div>

        {/* Output Column */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Output
            </h3>
          </div>

          {processedImageUrl ? (
            <>
              <div className="border-2 border-green-500 dark:border-green-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 h-72 flex items-center justify-center relative group">
                <img
                  src={processedImageUrl}
                  alt="Processed"
                  className="max-w-full max-h-full object-contain"
                />
                <button
                  onClick={() => onOpenModal(processedImageUrl, 'Processed Image')}
                  className="absolute top-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Expand image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✓ Processing complete
                </p>
              </div>
            </>
          ) : (
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-72 flex items-center justify-center bg-white dark:bg-gray-800">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">Processed image will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
