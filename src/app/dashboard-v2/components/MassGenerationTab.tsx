'use client';

import { useState } from 'react';

// Timing settings interface
export interface TimingSettings {
  statusCheckInterval: number; // ms between status check rounds
  statusCheckDelay: number; // ms between individual task checks
  maxStatusChecks: number; // max checks before timeout
  taskCreationDelay: number; // ms between creating new tasks
}

// Default timing values
export const DEFAULT_TIMING_SETTINGS: TimingSettings = {
  statusCheckInterval: 3000,
  statusCheckDelay: 500,
  maxStatusChecks: 60,
  taskCreationDelay: 500,
};

interface MassGenerationTabProps {
  // Draft generation state
  isGeneratingDraft: boolean;
  draftGenerationProgress: { current: number; total: number } | null;
  draftGenerationError: string;
  draftQueueSize: number;
  onDraftQueueSizeChange: (size: number) => void;
  onDraftGeneration: () => void;
  onFillEmptyImages: () => void;
  isFillingEmptyImages: boolean;

  // Range filtering state for draft generation
  draftRangeStart: number;
  draftRangeEnd: number | null;
  onDraftRangeStartChange: (value: number) => void;
  onDraftRangeEndChange: (value: number | null) => void;
  maxRows: number;

  // Miro generation state
  isGeneratingWithMiro: boolean;
  miroGenerationProgress: { current: number; total: number } | null;
  miroGenerationError: string;
  activeMiroBoardUrl: string | null;

  // Miro configuration
  isMiroConfigured: boolean;
  miroBoardId: string;
  miroBoardName: string;
  onMiroBoardIdChange: (id: string) => void;
  onMiroBoardNameChange: (name: string) => void;

  // Generation settings
  massGenerationPromptType: 'initial_prompt' | 'restyled_prompt' | 'edit_prompt';
  variations: number;
  queueSize: number;
  followReferenceRatio: boolean;
  onPromptTypeChange: (type: 'initial_prompt' | 'restyled_prompt' | 'edit_prompt') => void;
  onVariationsChange: (count: number) => void;
  onQueueSizeChange: (size: number) => void;
  onFollowReferenceRatioChange: (follow: boolean) => void;

  // Timing settings
  timingSettings: TimingSettings;
  onTimingSettingsChange: (settings: TimingSettings) => void;

  // Handlers
  onGenerateAndUploadToMiro: () => void;

  // Misc
  selectedTable: string;
}

export function MassGenerationTab({
  isGeneratingDraft,
  draftGenerationProgress,
  draftGenerationError,
  draftQueueSize,
  onDraftQueueSizeChange,
  onDraftGeneration,
  onFillEmptyImages,
  isFillingEmptyImages,
  draftRangeStart,
  draftRangeEnd,
  onDraftRangeStartChange,
  onDraftRangeEndChange,
  maxRows,
  isGeneratingWithMiro,
  miroGenerationProgress,
  miroGenerationError,
  activeMiroBoardUrl,
  isMiroConfigured,
  miroBoardId,
  miroBoardName,
  onMiroBoardIdChange,
  onMiroBoardNameChange,
  massGenerationPromptType,
  variations,
  queueSize,
  followReferenceRatio,
  onPromptTypeChange,
  onVariationsChange,
  onQueueSizeChange,
  onFollowReferenceRatioChange,
  timingSettings,
  onTimingSettingsChange,
  onGenerateAndUploadToMiro,
  selectedTable,
}: MassGenerationTabProps) {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  return (
    <div className="space-y-4">
      {/* Draft Generation Section - At the top */}
      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Draft Generation
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Generate 3 draft images per record using <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">initial_prompt</code>.
          Images are saved directly to Airtable columns <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">image_1</code>, <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">image_2</code>, <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">image_3</code>.
        </p>

        <div className="space-y-4">
          {/* Queue Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Queue Size (Concurrent Tasks)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={draftQueueSize}
              onChange={(e) => onDraftQueueSizeChange(Math.max(1, Math.min(30, parseInt(e.target.value) || 5)))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Requirements info */}
          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Records need: initial_prompt + reference_image_attached</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Generates 3 variations per record (image_1, image_2, image_3)</span>
            </div>
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Ignores regenerate_status - always regenerates</span>
            </div>
          </div>

          {/* Range Filter */}
          <div className="flex items-center gap-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">From Row:</label>
              <input
                type="number"
                min={1}
                max={maxRows}
                value={draftRangeStart}
                onChange={(e) => onDraftRangeStartChange(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">To Row:</label>
              <input
                type="number"
                min={1}
                max={maxRows}
                value={draftRangeEnd || ''}
                placeholder="All"
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  onDraftRangeEndChange(isNaN(value) ? null : Math.min(value, maxRows));
                }}
                className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Total: {maxRows} records
            </span>
          </div>

          {/* Error display */}
          {draftGenerationError && (
            <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm">
              {draftGenerationError}
            </div>
          )}

          {/* Progress display */}
          {draftGenerationProgress && (
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-sm">
              Processing: {draftGenerationProgress.current} / {draftGenerationProgress.total}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onDraftGeneration}
              disabled={isGeneratingDraft || isFillingEmptyImages || !selectedTable}
              className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingDraft ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Generate All
                </>
              )}
            </button>
            <button
              onClick={onFillEmptyImages}
              disabled={isGeneratingDraft || isFillingEmptyImages || !selectedTable}
              className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFillingEmptyImages ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Filling...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Fill Empty
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-300 dark:border-gray-600 my-2"></div>

      {/* Generation Settings */}
      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Generation Settings
        </h3>
        <div className="space-y-4">
          {/* Prompt Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prompt Type to Use
            </label>
            <select
              value={massGenerationPromptType}
              onChange={(e) => onPromptTypeChange(e.target.value as 'initial_prompt' | 'restyled_prompt' | 'edit_prompt')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="initial_prompt">Initial Prompt</option>
              <option value="restyled_prompt">Restyled Prompt</option>
              <option value="edit_prompt">Edit Prompt</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Select which prompt field to use for image generation
            </p>
          </div>

          {/* Variations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Variations per Record
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={variations}
              onChange={(e) => onVariationsChange(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Generate multiple variations (1-10) for each record to compare different outputs
            </p>
          </div>

          {/* Queue Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Queue Size (Concurrent Tasks)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={queueSize}
              onChange={(e) => onQueueSizeChange(Math.max(1, Math.min(30, parseInt(e.target.value) || 5)))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Number of concurrent generation tasks (1-30). Higher = faster but uses more resources.
            </p>
          </div>

          {/* Follow Reference Ratio */}
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Follow Reference Ratio
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Match output dimensions to reference image aspect ratio (Square, Portrait, or Landscape)
              </p>
            </div>
            <button
              type="button"
              onClick={() => onFollowReferenceRatioChange(!followReferenceRatio)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                followReferenceRatio ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  followReferenceRatio ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Timing Settings */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Advanced Timing Settings
            </h3>
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvancedSettings && (
          <div className="mt-4 space-y-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Fine-tune timing parameters for status polling. Applies to both Draft Generation and Mass Generation.
            </p>

            {/* Status Check Interval */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status Check Interval (ms)
              </label>
              <input
                type="number"
                min="1000"
                max="10000"
                step="500"
                value={timingSettings.statusCheckInterval}
                onChange={(e) => onTimingSettingsChange({
                  ...timingSettings,
                  statusCheckInterval: Math.max(1000, Math.min(10000, parseInt(e.target.value) || 3000))
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Time between polling rounds (default: 3000ms). Lower = faster updates, higher = less API load.
              </p>
            </div>

            {/* Status Check Delay */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status Check Delay (ms)
              </label>
              <input
                type="number"
                min="100"
                max="2000"
                step="100"
                value={timingSettings.statusCheckDelay}
                onChange={(e) => onTimingSettingsChange({
                  ...timingSettings,
                  statusCheckDelay: Math.max(100, Math.min(2000, parseInt(e.target.value) || 500))
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Delay between checking individual tasks (default: 500ms).
              </p>
            </div>

            {/* Max Status Checks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Status Checks
              </label>
              <input
                type="number"
                min="10"
                max="200"
                step="10"
                value={timingSettings.maxStatusChecks}
                onChange={(e) => onTimingSettingsChange({
                  ...timingSettings,
                  maxStatusChecks: Math.max(10, Math.min(200, parseInt(e.target.value) || 60))
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Max polling attempts before timeout (default: 60). At 3s interval = ~3 min timeout.
              </p>
            </div>

            {/* Task Creation Delay */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Task Creation Delay (ms)
              </label>
              <input
                type="number"
                min="100"
                max="2000"
                step="100"
                value={timingSettings.taskCreationDelay}
                onChange={(e) => onTimingSettingsChange({
                  ...timingSettings,
                  taskCreationDelay: Math.max(100, Math.min(2000, parseInt(e.target.value) || 500))
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Delay between creating new generation tasks (default: 500ms).
              </p>
            </div>

            {/* Reset Button */}
            <button
              type="button"
              onClick={() => onTimingSettingsChange(DEFAULT_TIMING_SETTINGS)}
              className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        )}
      </div>

      {/* Miro Configuration Section */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Miro Board Configuration
        </h3>
        <div className="space-y-4">
          {/* Miro Status */}
          <div className={`p-2 rounded text-sm ${isMiroConfigured ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'}`}>
            {isMiroConfigured
              ? '✓ Miro integration is configured'
              : '⚠ MIRO_TOKEN not set - Miro upload disabled'}
          </div>

          {isMiroConfigured && (
            <>
              {/* Board Name Input (for creating new board) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Board Name
                </label>
                <input
                  type="text"
                  value={miroBoardName}
                  onChange={(e) => {
                    onMiroBoardNameChange(e.target.value);
                    if (e.target.value.trim()) onMiroBoardIdChange(''); // Clear board ID if setting name
                  }}
                  placeholder="Enter name to create a new board"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!!miroBoardId.trim()}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  A new Miro board will be created with this name
                </p>
              </div>

              <div className="text-center text-sm text-gray-500 dark:text-gray-400">— or —</div>

              {/* Board ID Input (for existing board) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Existing Board ID
                </label>
                <input
                  type="text"
                  value={miroBoardId}
                  onChange={(e) => {
                    onMiroBoardIdChange(e.target.value);
                    if (e.target.value.trim()) onMiroBoardNameChange(''); // Clear name if setting ID
                  }}
                  placeholder="Enter existing board ID"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!!miroBoardName.trim()}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Find the board ID in your Miro board URL: miro.com/app/board/<strong>BOARD_ID</strong>/
                </p>
              </div>

            </>
          )}
        </div>
      </div>

      {/* Generation Section */}
      <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Generate Images
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Generate images for all records with prompts. Images are saved to S3{(miroBoardId.trim() || miroBoardName.trim()) ? ' and uploaded to Miro' : ''}.
        </p>

        {/* Requirements info */}
        <div className="mb-4 space-y-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Records need: reference_image_attached + {massGenerationPromptType.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Will generate {variations} variation(s) per record</span>
          </div>
          {miroBoardName.trim() && (
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Will create new Miro board: &quot;{miroBoardName}&quot;</span>
            </div>
          )}
        </div>

        {/* Error display */}
        {miroGenerationError && (
          <div className="mb-4 p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm">
            {miroGenerationError}
          </div>
        )}

        {/* Progress display */}
        {miroGenerationProgress && (
          <div className="mb-4 p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-sm">
            Processing: {miroGenerationProgress.current} / {miroGenerationProgress.total}
          </div>
        )}

        <button
          onClick={onGenerateAndUploadToMiro}
          disabled={isGeneratingWithMiro || !selectedTable || (!isMiroConfigured && !(miroBoardId.trim() || miroBoardName.trim()))}
          className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGeneratingWithMiro ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Generate Images{(miroBoardId.trim() || miroBoardName.trim()) ? ' & Upload to Miro' : ''}
            </>
          )}
        </button>

        {/* Miro Board Link - shown during and after generation */}
        {activeMiroBoardUrl && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(activeMiroBoardUrl);
                alert('Miro board URL copied to clipboard!');
              }}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy URL
            </button>
            <a
              href={activeMiroBoardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-3 bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 rounded-md text-sm font-medium flex items-center justify-center gap-2 border border-yellow-300 dark:border-yellow-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Miro
            </a>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <p className="font-medium mb-1">How it works:</p>
            <p>1. Each record with a prompt and reference image will be processed</p>
            <p>2. AI generates {variations} image variation(s) per record</p>
            <p>3. Generated images are uploaded to S3 for permanent storage</p>
            {(miroBoardId.trim() || miroBoardName.trim()) && <p>4. Images are uploaded to your Miro board for visual review</p>}
            <p className="mt-2 text-yellow-600 dark:text-yellow-400">Note: This process may take several minutes depending on the number of records and variations.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
