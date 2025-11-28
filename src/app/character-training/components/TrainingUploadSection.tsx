'use client';

import React from 'react';

interface TrainingUploadSectionProps {
  selectedFile: File | null;
  characterName: string;
  styleType: string;
  trainingMode: 'single' | 'nsfw';
  isCreating: boolean;
  createError: string;
  createSuccess: string;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCharacterNameChange: (name: string) => void;
  onStyleTypeChange: (styleType: string) => void;
  onTrainingModeChange: (mode: 'single' | 'nsfw') => void;
  onCreateTraining: () => void;
  onClearFile: () => void;
}

export function TrainingUploadSection({
  selectedFile,
  characterName,
  styleType,
  trainingMode,
  isCreating,
  createError,
  createSuccess,
  onFileSelect,
  onCharacterNameChange,
  onStyleTypeChange,
  onTrainingModeChange,
  onCreateTraining,
  onClearFile,
}: TrainingUploadSectionProps) {
  return (
    <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Create New Character Training
        </h2>

        {/* Training Mode Toggle */}
        <div className="relative inline-flex items-center p-1 rounded-lg bg-gray-100 dark:bg-gray-700/50">
          <button
            type="button"
            onClick={() => onTrainingModeChange('single')}
            disabled={isCreating}
            className={`relative px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
              trainingMode === 'single'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Single Image
          </button>
          <button
            type="button"
            onClick={() => onTrainingModeChange('nsfw')}
            disabled={isCreating}
            className={`relative px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
              trainingMode === 'nsfw'
                ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            NSFW
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Character Name Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Character Name
          </label>
          <input
            type="text"
            value={characterName}
            onChange={(e) => onCharacterNameChange(e.target.value)}
            disabled={isCreating}
            placeholder="Enter character name..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Style Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Style Type
          </label>
          <select
            value={styleType}
            onChange={(e) => onStyleTypeChange(e.target.value)}
            disabled={isCreating}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="anime">Anime</option>
            <option value="semi_realism">Semi Realism</option>
          </select>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Character Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={onFileSelect}
            disabled={isCreating}
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
          {selectedFile && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCreateTraining}
            disabled={isCreating || !selectedFile || !characterName.trim()}
            className={`flex-1 py-2 px-4 rounded-md text-white font-medium ${
              isCreating || !selectedFile || !characterName.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isCreating ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Training...
              </div>
            ) : (
              'Start Training'
            )}
          </button>

          {selectedFile && (
            <button
              onClick={onClearFile}
              disabled={isCreating}
              className="py-2 px-4 rounded-md font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
            </button>
          )}
        </div>

        {/* Error Message */}
        {createError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-sm text-red-800 dark:text-red-200">
              {createError}
            </p>
          </div>
        )}

        {/* Success Message */}
        {createSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
            <p className="text-sm text-green-800 dark:text-green-200">
              {createSuccess}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
