'use client';

import React from 'react';

interface MultiImageEditorProps {
  selectedFiles: File[];
  previewUrls: string[];
  isProcessing: boolean;
  processedImageUrls: string[];
  error: string;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onProcess: () => void;
  onReset: () => void;
  onRemoveImage: (index: number) => void;
  onOpenModal: (imageUrl: string, title: string) => void;
}

export function MultiImageEditor({
  selectedFiles,
  previewUrls,
  isProcessing,
  processedImageUrls,
  error,
  onFileSelect,
  onDrop,
  onDragOver,
  onProcess,
  onReset,
  onRemoveImage,
  onOpenModal
}: MultiImageEditorProps) {
  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Upload Multiple Images
        </h2>

        <div className="space-y-4">
          {/* Drag and Drop Zone */}
          <div
            onDragOver={onDragOver}
            onDrop={onDrop}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-gray-50 dark:bg-gray-800/50"
          >
            <div className="flex flex-col items-center">
              <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                <span className="font-semibold">Drag and drop images here</span>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                or click the button below to select files
              </p>
            </div>
          </div>

          {/* Buttons Row */}
          <div className="flex items-center gap-3">
            <label
              htmlFor="multi-file-upload"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg cursor-pointer transition-colors"
            >
              Select Images
            </label>
            <input
              id="multi-file-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={onFileSelect}
              className="hidden"
            />

            <button
              onClick={onProcess}
              disabled={selectedFiles.length === 0 || isProcessing}
              className={`
                px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2
                ${selectedFiles.length === 0 || isProcessing
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
                }
              `}
            >
              {isProcessing && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {isProcessing ? 'Processing...' : `Process ${selectedFiles.length} Image${selectedFiles.length > 1 ? 's' : ''}`}
            </button>

            <button
              onClick={onReset}
              disabled={selectedFiles.length === 0}
              className={`
                px-6 py-3 rounded-lg font-medium transition-colors
                ${selectedFiles.length === 0
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
                }
              `}
            >
              Reset All
            </button>

            {selectedFiles.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {selectedFiles.length} image{selectedFiles.length > 1 ? 's' : ''} selected
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({(selectedFiles.reduce((sum, file) => sum + file.size, 0) / 1024).toFixed(2)} KB total)
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="text-red-800 dark:text-red-200">
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Grid - Two Column Layout with Headers */}
      {previewUrls.length > 0 && (
        <div className="space-y-4">
          {/* Column Headers */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
                Input
              </h3>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
                Output
              </h3>
            </div>
          </div>

          {/* Image Rows */}
          {previewUrls.map((url, index) => (
            <div key={index}>
              {/* Row Header with Remove Button */}
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-md font-medium text-gray-700 dark:text-gray-300">
                  Image {index + 1}: {selectedFiles[index]?.name}
                </h4>
                <button
                  onClick={() => onRemoveImage(index)}
                  disabled={isProcessing}
                  className={`px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-opacity flex items-center gap-1 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Remove image"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Remove
                </button>
              </div>

              {/* Two Column Layout for Input and Output */}
              <div className="grid grid-cols-2 gap-6">
                {/* Input Column */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 h-64 flex items-center justify-center">
                    <img
                      src={url}
                      alt={`Original ${index + 1}`}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>

                {/* Output Column */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  {processedImageUrls[index] ? (
                    <>
                      <div className="border-2 border-green-500 dark:border-green-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 h-64 flex items-center justify-center relative group">
                        <img
                          src={processedImageUrls[index]}
                          alt={`Processed ${index + 1}`}
                          className="max-w-full max-h-full object-contain"
                        />
                        <button
                          onClick={() => onOpenModal(processedImageUrls[index], `Edited Image ${index + 1}: ${selectedFiles[index]?.name}`)}
                          className="absolute top-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Expand image"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        </button>
                      </div>
                      <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-xs text-green-800 dark:text-green-200 text-center">
                          Complete
                        </p>
                      </div>
                    </>
                  ) : isProcessing ? (
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-64 flex items-center justify-center bg-white dark:bg-gray-800">
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-sm">Processing...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-64 flex items-center justify-center bg-white dark:bg-gray-800">
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm">Pending</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {processedImageUrls.length > 0 && (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                Processing complete for {processedImageUrls.length} image{processedImageUrls.length > 1 ? 's' : ''}!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
