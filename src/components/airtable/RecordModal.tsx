'use client';

import React, { useState } from 'react';
import PromptImageSection from './modal/PromptImageSection';
import PromptOnlyImageSection from './modal/PromptOnlyImageSection';
import StatusSection from './modal/StatusSection';
import EditableCell from './EditableCell';

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

interface RecordModalProps {
  record: AirtableRecord | null;
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  onRecordUpdate: (updatedRecord: AirtableRecord) => void;
  selectedModelInfo?: {
    id: string;
    name: string;
    thumbnail?: string;
  };
  availableModels?: Array<{
    id: string;
    name: string;
    thumbnail?: string;
  }>;
  onEditingChange?: (isEditing: boolean) => void;
  allRecords?: AirtableRecord[];
  currentRecordIndex?: number;
  onNavigateRecord?: (direction: 'prev' | 'next') => void;
}


export default function RecordModal({
  record,
  isOpen,
  onClose,
  tableName,
  onRecordUpdate,
  selectedModelInfo,
  availableModels,
  onEditingChange,
  allRecords = [],
  currentRecordIndex = 0,
  onNavigateRecord
}: RecordModalProps) {
  const [localEditingState, setLocalEditingState] = useState(false);

  // Always call hooks before any early returns
  const referenceName = record ? String(record.fields['reference_image'] || 'Unknown') : 'Unknown';
  const canNavigatePrev = currentRecordIndex > 0;
  const canNavigateNext = currentRecordIndex < allRecords.length - 1;

  const handleKeyDown = React.useCallback((e: KeyboardEvent) => {
    // Check if user is currently editing a text field
    const activeElement = document.activeElement as HTMLElement;
    const isEditingText = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable ||
      activeElement.classList.contains('editable')
    );
    
    // Disable navigation when editing text or when there are active edits
    if (isEditingText || localEditingState) {
      return;
    }
    
    if (e.key === 'ArrowLeft' && canNavigatePrev) {
      onNavigateRecord?.('prev');
    } else if (e.key === 'ArrowRight' && canNavigateNext) {
      onNavigateRecord?.('next');
    }
  }, [canNavigatePrev, canNavigateNext, onNavigateRecord, localEditingState]);

  // Add keyboard navigation and disable browser back
  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      
      // Disable browser back button
      const handlePopState = (e: PopStateEvent) => {
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
      };
      
      // Push a dummy state to prevent back navigation
      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', handlePopState);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('popstate', handlePopState);
        // Remove the dummy state when modal closes
        window.history.back();
      };
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !record) return null;

  const handleCellSave = async (recordId: string, fieldKey: string, newValue: string) => {
    try {
      const response = await fetch('/api/airtable/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableName,
          recordId,
          fieldKey,
          value: newValue,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update record');
      }

      const result = await response.json();
      onRecordUpdate(result.record);
    } catch (error) {
      console.error('Error updating record:', error);
      throw error;
    }
  };

  const handleEditingChange = (isEditing: boolean) => {
    setLocalEditingState(isEditing);
    onEditingChange?.(isEditing);
  };

  const downloadImages = async (type: 'initial' | 'edited' | 'prompt-only') => {
    if (!record) return;

    let imageFieldPrefix: string;
    let imageFieldNumbers: number[];
    
    if (type === 'prompt-only') {
      imageFieldPrefix = 'prompt_only_image';
      imageFieldNumbers = [1, 2, 3]; // Only 3 images for prompt-only
    } else {
      imageFieldPrefix = type === 'initial' ? 'initial_prompt_image' : 'edited_prompt_image';
      imageFieldNumbers = [1, 2, 3, 4, 5]; // 5 images for initial/edited
    }
    
    const referenceImage = String(record.fields['reference_image'] || 'unknown');
    
    // Get all image fields for this type
    const imageFields = imageFieldNumbers.map(i => `${imageFieldPrefix}_${i}`);
    
    // Filter to only include fields with actual images
    const imageUrls: Array<{ url: string; filename: string }> = [];
    
    imageFields.forEach((field, index) => {
      const imageField = record.fields[field];
      let imageUrl = '';
      
      if (typeof imageField === 'string' && imageField.startsWith('http')) {
        imageUrl = imageField;
      } else if (Array.isArray(imageField) && imageField.length > 0 && imageField[0].url) {
        imageUrl = imageField[0].url;
      }
      
      if (imageUrl) {
        const filename = `${referenceImage}_${type}_v${index + 1}.jpg`;
        imageUrls.push({ url: imageUrl, filename });
      }
    });
    
    if (imageUrls.length === 0) {
      alert(`No ${type} images found for this record.`);
      return;
    }
    
    try {
      const response = await fetch('/api/download-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images: imageUrls }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create download package');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${referenceImage}_${type}_images.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading images:', error);
      alert(`Failed to download ${type} images. Please try again.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header - Fixed */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Record Details: {referenceName}
                  </h2>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {currentRecordIndex + 1} of {allRecords.length}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                {/* Navigation Buttons */}
                <button
                  onClick={() => onNavigateRecord?.('prev')}
                  disabled={!canNavigatePrev}
                  className={`p-2 rounded-md transition-colors ${
                    canNavigatePrev 
                      ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700'
                      : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  }`}
                  title="Previous record (←)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <button
                  onClick={() => onNavigateRecord?.('next')}
                  disabled={!canNavigateNext}
                  className={`p-2 rounded-md transition-colors ${
                    canNavigateNext 
                      ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700'
                      : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  }`}
                  title="Next record (→)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
                
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                </div>
              </div>
              
              {/* Reference fields in header */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reference Image Attached
                  </div>
                  <EditableCell
                    value={record.fields['reference_image_attached'] || ''}
                    fieldKey="reference_image_attached"
                    recordId={record.id}
                    onSave={handleCellSave}
                    isEditable={false}
                    recordFields={record.fields}
                    selectedModelInfo={selectedModelInfo}
                    availableModels={availableModels}
                    onEditingChange={handleEditingChange}
                  />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Selected Characters
                  </div>
                  <EditableCell
                    value={record.fields['selected_characters'] || ''}
                    fieldKey="selected_characters"
                    recordId={record.id}
                    onSave={handleCellSave}
                    isEditable={true}
                    recordFields={record.fields}
                    selectedModelInfo={selectedModelInfo}
                    availableModels={availableModels}
                    onEditingChange={handleEditingChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-8">
            {/* Prompt-Only Section */}
            <PromptOnlyImageSection
              record={record}
              onSave={handleCellSave}
              selectedModelInfo={selectedModelInfo}
              onEditingChange={handleEditingChange}
              onDownload={() => downloadImages('prompt-only')}
            />

            {/* Initial Prompt Section */}
            <PromptImageSection
              record={record}
              type="initial"
              onSave={handleCellSave}
              selectedModelInfo={selectedModelInfo}
              availableModels={availableModels}
              onEditingChange={handleEditingChange}
              onDownload={(type) => downloadImages(type)}
            />

            {/* Edited Prompt Section */}
            <PromptImageSection
              record={record}
              type="edited"
              onSave={handleCellSave}
              selectedModelInfo={selectedModelInfo}
              availableModels={availableModels}
              onEditingChange={handleEditingChange}
              onDownload={(type) => downloadImages(type)}
            />

            {/* Status Section */}
            <StatusSection
              record={record}
              onSave={handleCellSave}
            />
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}