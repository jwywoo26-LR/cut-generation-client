'use client';

import React from 'react';

interface UploadSectionProps {
  selectedFiles: File[];
  isUploading: boolean;
  uploadError: string;
  uploadSuccess: string;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onClearFiles: () => void;
}

export function UploadSection({
  selectedFiles,
  isUploading,
  uploadError,
  uploadSuccess,
  onFileSelect,
  onUpload,
  onClearFiles,
}: UploadSectionProps) {
  return (
    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
        Upload Reference Images
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Upload reference images as a ZIP file or select multiple PNG/JPG files
      </p>

      <div className="space-y-4">
        <div>
          <label className="block">
            <span className="sr-only">Choose files</span>
            <input
              type="file"
              multiple
              accept=".zip,.png,.jpg,.jpeg,.webp,application/zip,image/*"
              onChange={onFileSelect}
              disabled={isUploading}
              key={selectedFiles.length === 0 ? 'empty' : 'filled'}
              className="block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                dark:file:bg-blue-900 dark:file:text-blue-200
                dark:hover:file:bg-blue-800
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </label>

          {selectedFiles.length > 0 && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              <p className="font-medium">Selected files:</p>
              <ul className="list-disc list-inside ml-2 mt-1">
                {selectedFiles.map((file, index) => (
                  <li key={index}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onUpload}
            disabled={isUploading || selectedFiles.length === 0}
            className={`flex-1 py-2 px-4 rounded-md text-white font-medium ${
              isUploading || selectedFiles.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isUploading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </div>
            ) : (
              `Upload ${selectedFiles.length} file(s)`
            )}
          </button>

          <button
            onClick={onClearFiles}
            disabled={isUploading || selectedFiles.length === 0}
            className={`py-2 px-4 rounded-md font-medium ${
              isUploading || selectedFiles.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50'
            }`}
          >
            Clear
          </button>
        </div>

        {uploadError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-sm text-red-800 dark:text-red-200">
              {uploadError}
            </p>
          </div>
        )}

        {uploadSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
            <p className="text-sm text-green-800 dark:text-green-200">
              {uploadSuccess}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
