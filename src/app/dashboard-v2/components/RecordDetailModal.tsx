'use client';

import React from 'react';
import { AirtableRecord, AirtableAttachment, PromptType } from '../types';

interface RecordDetailModalProps {
  selectedRecord: AirtableRecord;
  records: AirtableRecord[];
  editedFields: Record<string, string>;
  isSavingRecord: boolean;
  isGeneratingPrompt: boolean;
  isGeneratingReference: boolean;
  promptGeneratedImage: string | null;
  referenceGeneratedImage: string | null;
  generationError: string;
  selectedPromptType: PromptType;
  onClose: () => void;
  onFieldChange: (fieldName: string, value: string) => void;
  onSave: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onGeneratePromptOnly: () => void;
  onGenerateWithReference: () => void;
  onPromptTypeChange: (type: PromptType) => void;
  onExpandImage: (imageUrl: string) => void;
}

export function RecordDetailModal({
  selectedRecord,
  records,
  editedFields,
  isSavingRecord,
  isGeneratingPrompt,
  isGeneratingReference,
  promptGeneratedImage,
  referenceGeneratedImage,
  generationError,
  selectedPromptType,
  onClose,
  onFieldChange,
  onSave,
  onPrevious,
  onNext,
  onGeneratePromptOnly,
  onGenerateWithReference,
  onPromptTypeChange,
  onExpandImage,
}: RecordDetailModalProps) {
  const currentIndex = records.findIndex(r => r.id === selectedRecord.id);

  return (
    <div className="fixed right-0 top-0 h-full z-[9999] w-full max-w-7xl pointer-events-none">
      {/* Modal panel */}
      <div className="h-full bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto border-l border-gray-200 dark:border-gray-700 pointer-events-auto">
        {/* Modal Header */}
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Record Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body - Three Column Layout */}
        <div className="px-6 py-4 max-h-[calc(100vh-140px)] overflow-y-auto">
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - New Generated Images */}
            <GeneratedImagesColumn
              isGeneratingPrompt={isGeneratingPrompt}
              isGeneratingReference={isGeneratingReference}
              promptGeneratedImage={promptGeneratedImage}
              referenceGeneratedImage={referenceGeneratedImage}
              onExpandImage={onExpandImage}
            />

            {/* Middle Column - Reference + Existing Generated Images */}
            <ReferenceAndStoredImagesColumn selectedRecord={selectedRecord} />

            {/* Right Column - Record Information */}
            <RecordInfoColumn
              selectedRecord={selectedRecord}
              editedFields={editedFields}
              isGeneratingPrompt={isGeneratingPrompt}
              isGeneratingReference={isGeneratingReference}
              generationError={generationError}
              selectedPromptType={selectedPromptType}
              onFieldChange={onFieldChange}
              onGeneratePromptOnly={onGeneratePromptOnly}
              onGenerateWithReference={onGenerateWithReference}
              onPromptTypeChange={onPromptTypeChange}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            {/* Navigation buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={onPrevious}
                disabled={currentIndex === 0}
                className={`p-2 rounded ${
                  currentIndex === 0
                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title="Previous record"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400 px-2">
                {currentIndex + 1} / {records.length}
              </span>
              <button
                onClick={onNext}
                disabled={currentIndex === records.length - 1}
                className={`p-2 rounded ${
                  currentIndex === records.length - 1
                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title="Next record"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium"
              >
                Close
              </button>
              <button
                onClick={onSave}
                disabled={isSavingRecord}
                className={`px-4 py-2 rounded-md text-white text-sm font-medium ${
                  isSavingRecord
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSavingRecord ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface GeneratedImagesColumnProps {
  isGeneratingPrompt: boolean;
  isGeneratingReference: boolean;
  promptGeneratedImage: string | null;
  referenceGeneratedImage: string | null;
  onExpandImage: (imageUrl: string) => void;
}

function GeneratedImagesColumn({
  isGeneratingPrompt,
  isGeneratingReference,
  promptGeneratedImage,
  referenceGeneratedImage,
  onExpandImage,
}: GeneratedImagesColumnProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-md font-semibold text-gray-900 dark:text-white">
        New Generations
      </h3>

      {/* Prompt-Only Generated */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Generated (Prompt Only)
        </label>
        {isGeneratingPrompt ? (
          <GeneratingPlaceholder />
        ) : promptGeneratedImage ? (
          <ImageWithExpand imageUrl={promptGeneratedImage} alt="Prompt Only Generated" onExpand={onExpandImage} />
        ) : (
          <EmptyImagePlaceholder />
        )}
      </div>

      {/* Reference-Based Generated */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Generated (Reference)
        </label>
        {isGeneratingReference ? (
          <GeneratingPlaceholder />
        ) : referenceGeneratedImage ? (
          <ImageWithExpand imageUrl={referenceGeneratedImage} alt="Reference Generated" onExpand={onExpandImage} />
        ) : (
          <EmptyImagePlaceholder />
        )}
      </div>
    </div>
  );
}

function GeneratingPlaceholder() {
  return (
    <div className="w-full h-96 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
      <div className="text-center text-gray-400">
        <svg className="animate-spin mx-auto h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-xs">Generating...</p>
      </div>
    </div>
  );
}

function EmptyImagePlaceholder() {
  return (
    <div className="w-full h-96 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
      <div className="text-center text-gray-400">
        <svg className="mx-auto h-8 w-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-xs">No image yet</p>
      </div>
    </div>
  );
}

interface ImageWithExpandProps {
  imageUrl: string;
  alt: string;
  onExpand: (imageUrl: string) => void;
}

function ImageWithExpand({ imageUrl, alt, onExpand }: ImageWithExpandProps) {
  return (
    <div className="relative group">
      <img
        src={imageUrl}
        alt={alt}
        className="w-full h-96 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
      />
      <button
        onClick={() => onExpand(imageUrl)}
        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
        title="Expand image"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
    </div>
  );
}

interface ReferenceAndStoredImagesColumnProps {
  selectedRecord: AirtableRecord;
}

function ReferenceAndStoredImagesColumn({ selectedRecord }: ReferenceAndStoredImagesColumnProps) {
  const hasReferenceImage = selectedRecord.fields.reference_image_attached &&
    Array.isArray(selectedRecord.fields.reference_image_attached) &&
    selectedRecord.fields.reference_image_attached.length > 0;

  return (
    <div className="space-y-6">
      {/* Reference Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Reference Image
        </label>
        {hasReferenceImage ? (
          <div>
            <img
              src={(selectedRecord.fields.reference_image_attached as AirtableAttachment[])[0]?.url}
              alt="Reference"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {selectedRecord.fields.reference_image as string}
            </p>
          </div>
        ) : (
          <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-300 dark:border-gray-600">
            <p className="text-sm text-gray-400">No reference image</p>
          </div>
        )}
      </div>

      {/* Existing Generated Images - Horizontal Layout */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Stored Images
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((num) => {
            const imageField = selectedRecord.fields[`image_${num}`];
            if (imageField && Array.isArray(imageField) && imageField.length > 0) {
              return (
                <div key={num} className="space-y-1">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center">#{num}</p>
                  <img
                    src={(imageField[0] as AirtableAttachment)?.url}
                    alt={`Generated ${num}`}
                    className="w-full h-48 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                </div>
              );
            }
            return (
              <div key={num} className="space-y-1">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center">#{num}</p>
                <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-300 dark:border-gray-600">
                  <p className="text-xs text-gray-400">Empty</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface RecordInfoColumnProps {
  selectedRecord: AirtableRecord;
  editedFields: Record<string, string>;
  isGeneratingPrompt: boolean;
  isGeneratingReference: boolean;
  generationError: string;
  selectedPromptType: PromptType;
  onFieldChange: (fieldName: string, value: string) => void;
  onGeneratePromptOnly: () => void;
  onGenerateWithReference: () => void;
  onPromptTypeChange: (type: PromptType) => void;
}

function RecordInfoColumn({
  editedFields,
  isGeneratingPrompt,
  isGeneratingReference,
  generationError,
  selectedPromptType,
  onFieldChange,
  onGeneratePromptOnly,
  onGenerateWithReference,
  onPromptTypeChange,
}: RecordInfoColumnProps) {
  return (
    <div className="space-y-6">
      {/* Character ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Character ID
        </label>
        <input
          type="text"
          value={editedFields.character_id || ''}
          onChange={(e) => onFieldChange('character_id', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Initial Prompt */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Initial Prompt
        </label>
        <textarea
          value={editedFields.initial_prompt || ''}
          onChange={(e) => onFieldChange('initial_prompt', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Restyled Prompt */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Restyled Prompt
        </label>
        <textarea
          value={editedFields.restyled_prompt || ''}
          onChange={(e) => onFieldChange('restyled_prompt', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Edit Prompt */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Edit Prompt
        </label>
        <textarea
          value={editedFields.edit_prompt || ''}
          onChange={(e) => onFieldChange('edit_prompt', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Regenerate Status
        </label>
        <select
          value={editedFields.regenerate_status || ''}
          onChange={(e) => onFieldChange('regenerate_status', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-</option>
          <option value="false">false</option>
          <option value="true">true</option>
        </select>
      </div>

      {/* Image Generation Buttons */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
          Generate Images
        </h4>

        {/* Prompt Type Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Prompt to Use
          </label>
          <select
            value={selectedPromptType}
            onChange={(e) => onPromptTypeChange(e.target.value as PromptType)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="initial_prompt">Initial Prompt</option>
            <option value="restyled_prompt">Restyled Prompt</option>
            <option value="edit_prompt">Edit Prompt</option>
          </select>
        </div>

        {generationError && (
          <div className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-sm text-red-800 dark:text-red-200">
              {generationError}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={onGeneratePromptOnly}
            disabled={isGeneratingReference || isGeneratingPrompt}
            className={`w-full px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              isGeneratingReference || isGeneratingPrompt
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isGeneratingPrompt ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </span>
            ) : (
              'Generate from Prompt Only'
            )}
          </button>
          <button
            onClick={onGenerateWithReference}
            disabled={isGeneratingReference || isGeneratingPrompt}
            className={`w-full px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              isGeneratingReference || isGeneratingPrompt
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isGeneratingReference ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </span>
            ) : (
              'Generate with Reference'
            )}
          </button>
        </div>

        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
          Generated images will appear in the left column
        </p>
      </div>
    </div>
  );
}
