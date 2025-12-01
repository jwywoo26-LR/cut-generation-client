'use client';

import { StyleRulesConfig, RestyleRulesConfig } from './index';
import type { StyleRule } from './StyleRulesConfig';
import type { RestyleRule } from './RestyleRulesConfig';

interface PromptGenerationTabProps {
  // Style rules state
  styleRules: StyleRule[];
  onStyleRulesChange: (rules: StyleRule[]) => void;
  maxRows: number;

  // Range filtering state for initial prompt generation
  initialPromptRangeStart: number;
  initialPromptRangeEnd: number | null;
  onInitialPromptRangeStartChange: (value: number) => void;
  onInitialPromptRangeEndChange: (value: number | null) => void;

  // Prompt generation state
  isGeneratingInitialPrompts: boolean;
  initialPromptProgress: { current: number; total: number } | null;
  initialPromptError: string;

  // Restyle state
  restyleRules: RestyleRule[];
  onRestyleRulesChange: (rules: RestyleRule[]) => void;
  restyleFromColumn: string;
  restyleToColumn: string;
  onRestyleFromColumnChange: (column: string) => void;
  onRestyleToColumnChange: (column: string) => void;
  isRestyling: boolean;
  restyleProgress: { current: number; total: number } | null;
  restyleError: string;

  // Random prompt generation state
  isGeneratingRandomPrompts: boolean;
  randomPromptProgress: { current: number; total: number } | null;
  randomPromptError: string;
  randomPromptColumn: string;
  randomPromptTheme: string;
  randomPromptDefaultTags: string;
  onRandomPromptColumnChange: (column: string) => void;
  onRandomPromptThemeChange: (theme: string) => void;
  onRandomPromptDefaultTagsChange: (tags: string) => void;
  onGenerateRandomPrompts: () => void;

  // Handlers
  onGenerateInitialPrompts: () => void;
  onRestylePrompts: () => void;

  // Misc
  selectedTable: string;
}

export function PromptGenerationTab({
  styleRules,
  onStyleRulesChange,
  maxRows,
  initialPromptRangeStart,
  initialPromptRangeEnd,
  onInitialPromptRangeStartChange,
  onInitialPromptRangeEndChange,
  isGeneratingInitialPrompts,
  initialPromptProgress,
  initialPromptError,
  restyleRules,
  onRestyleRulesChange,
  restyleFromColumn,
  restyleToColumn,
  onRestyleFromColumnChange,
  onRestyleToColumnChange,
  isRestyling,
  restyleProgress,
  restyleError,
  isGeneratingRandomPrompts,
  randomPromptProgress,
  randomPromptError,
  randomPromptColumn,
  randomPromptTheme,
  randomPromptDefaultTags,
  onRandomPromptColumnChange,
  onRandomPromptThemeChange,
  onRandomPromptDefaultTagsChange,
  onGenerateRandomPrompts,
  onGenerateInitialPrompts,
  onRestylePrompts,
  selectedTable,
}: PromptGenerationTabProps) {
  return (
    <div className="space-y-6">
      {/* Style Rules Configuration */}
      <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Style Rules Configuration
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Configure style rules to customize how tags are generated for specific row ranges.
          Rules will be applied during initial prompt generation.
        </p>
        <StyleRulesConfig
          styleRules={styleRules}
          onStyleRulesChange={onStyleRulesChange}
          maxRows={maxRows}
        />
      </div>

      {/* Initial Prompt Generation */}
      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Generate Initial Prompts
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Analyze reference images using vision AI to generate structured tags.
          Style rules configured above will be applied during generation.
          Results are saved to <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">initial_prompt</code> and <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">applied_style_rules</code> fields.
        </p>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Requires: reference_image_attached</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Categories: subject, facial_expression, clothing, nudity, angle, action, objects, background</span>
          </div>
          {styleRules.length > 0 && (
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs">
              {styleRules.length} style rule(s) will be applied during generation
            </div>
          )}

          {/* Range Filter */}
          <div className="flex items-center gap-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">From Row:</label>
              <input
                type="number"
                min={1}
                max={maxRows}
                value={initialPromptRangeStart}
                onChange={(e) => onInitialPromptRangeStartChange(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">To Row:</label>
              <input
                type="number"
                min={1}
                max={maxRows}
                value={initialPromptRangeEnd || ''}
                placeholder="All"
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  onInitialPromptRangeEndChange(isNaN(value) ? null : Math.min(value, maxRows));
                }}
                className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Total: {maxRows} records
            </span>
          </div>

          {initialPromptError && (
            <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs">
              {initialPromptError}
            </div>
          )}
          {initialPromptProgress && (
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
              Processing: {initialPromptProgress.current} / {initialPromptProgress.total}
            </div>
          )}
          <button
            onClick={onGenerateInitialPrompts}
            disabled={isGeneratingInitialPrompts || !selectedTable}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingInitialPrompts ? (
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Generate Initial Prompts
              </>
            )}
          </button>
        </div>
      </div>

      {/* Prompt Restyle Section */}
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Prompt Restyle
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Apply AI-powered tag adjustments to existing prompts. Configure rules with suggested tags,
          tags to remove, and natural language context for intelligent restyling.
        </p>

        <RestyleRulesConfig
          restyleRules={restyleRules}
          onRestyleRulesChange={onRestyleRulesChange}
          fromColumn={restyleFromColumn}
          toColumn={restyleToColumn}
          onFromColumnChange={onRestyleFromColumnChange}
          onToColumnChange={onRestyleToColumnChange}
          maxRows={maxRows}
        />

        {/* Restyle Action */}
        <div className="mt-4 space-y-3">
          {restyleError && (
            <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs">
              {restyleError}
            </div>
          )}
          {restyleProgress && (
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs">
              Processing: {restyleProgress.current} / {restyleProgress.total}
            </div>
          )}
          <button
            onClick={onRestylePrompts}
            disabled={isRestyling || !selectedTable || restyleRules.length === 0}
            className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRestyling ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Restyling...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Restyle Prompts ({restyleRules.length} rule{restyleRules.length !== 1 ? 's' : ''})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Random Prompt Generation Section */}
      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Random Prompt Generation
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Generate creative random prompts for all records using AI. Perfect for generating diverse, imaginative content.
        </p>

        {/* Target Column Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Column
          </label>
          <select
            value={randomPromptColumn}
            onChange={(e) => onRandomPromptColumnChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="initial_prompt">Initial Prompt</option>
            <option value="restyled_prompt">Restyled Prompt</option>
            <option value="edit_prompt">Edit Prompt</option>
          </select>
        </div>

        {/* Theme Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Theme / Direction (optional)
          </label>
          <input
            type="text"
            value={randomPromptTheme}
            onChange={(e) => onRandomPromptThemeChange(e.target.value)}
            placeholder="e.g., fantasy adventure, cyberpunk city, peaceful nature..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm placeholder-gray-400"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Leave empty for completely random prompts, or provide a theme to guide generation
          </p>
        </div>

        {/* Default Tags Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Default Tags (required in all prompts)
          </label>
          <input
            type="text"
            value={randomPromptDefaultTags}
            onChange={(e) => onRandomPromptDefaultTagsChange(e.target.value)}
            placeholder="e.g., 1girl, solo, high quality, masterpiece..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm placeholder-gray-400"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            These tags will be included in every generated prompt. Separate with commas.
          </p>
        </div>

        {/* Status Messages */}
        <div className="space-y-3">
          {randomPromptError && (
            <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs">
              {randomPromptError}
            </div>
          )}
          {randomPromptProgress && (
            <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
              Processing: {randomPromptProgress.current} / {randomPromptProgress.total}
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={onGenerateRandomPrompts}
            disabled={isGeneratingRandomPrompts || !selectedTable}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingRandomPrompts ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Random Prompts...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Random Prompts
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <p className="font-medium mb-1">Workflow:</p>
            <p>1. Upload reference images in Manage Records tab</p>
            <p>2. Configure style rules (optional - for customizing tag generation)</p>
            <p>3. Generate initial prompts (analyzes images with vision AI + applies rules)</p>
            <p>4. <span className="text-amber-600 dark:text-amber-400">Use Prompt Restyle to modify existing prompts with AI</span></p>
            <p>5. Use Mass Generation tab to generate images</p>
          </div>
        </div>
      </div>
    </div>
  );
}
