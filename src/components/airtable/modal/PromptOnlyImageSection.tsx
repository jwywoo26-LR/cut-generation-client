'use client';

import Image from 'next/image';
import EditableCell from '../EditableCell';

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

interface PromptOnlyImageSectionProps {
  record: AirtableRecord;
  onSave: (recordId: string, fieldKey: string, newValue: string) => Promise<void>;
  selectedModelInfo?: {
    id: string;
    name: string;
    thumbnail?: string;
  };
  onEditingChange?: (isEditing: boolean) => void;
  onDownload?: () => void;
}

export default function PromptOnlyImageSection({
  record,
  onSave,
  selectedModelInfo,
  onEditingChange,
  onDownload
}: PromptOnlyImageSectionProps) {
  const promptValue = String(record.fields['initial_prompt'] || '');
  
  // Get prompt-only image fields
  const imageFields = ['prompt_only_image_1', 'prompt_only_image_2', 'prompt_only_image_3'];
  const hasAnyImages = imageFields.some(field => {
    const fieldValue = record.fields[field];
    return fieldValue && (
      (typeof fieldValue === 'string' && fieldValue.trim() !== '') ||
      (Array.isArray(fieldValue) && fieldValue.length > 0)
    );
  });

  const handleDownload = () => {
    onDownload?.();
  };

  return (
    <div className="border border-purple-200 dark:border-purple-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <span className="text-purple-600">💭</span>
          Prompt-Only Images
        </h3>
        {hasAnyImages && (
          <button
            onClick={handleDownload}
            className="px-3 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
          >
            Download
          </button>
        )}
      </div>
      
      <div className="space-y-4">
        {/* Prompt Display */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Text Prompt (used for generation)
          </label>
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded border text-sm text-gray-600 dark:text-gray-300">
            {promptValue || 'No prompt available'}
          </div>
        </div>

        {/* Model Information */}
        {selectedModelInfo && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Selected Model
            </label>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded border">
              {selectedModelInfo.thumbnail && (
                <Image 
                  src={selectedModelInfo.thumbnail} 
                  alt={selectedModelInfo.name}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded object-cover"
                />
              )}
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedModelInfo.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  ID: {selectedModelInfo.id}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generated Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Generated Prompt-Only Images (Max 3)
          </label>
          <div className="grid grid-cols-3 gap-3">
            {imageFields.map((field, index) => (
              <div key={field} className="space-y-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Image {index + 1}
                </label>
                <EditableCell
                  recordId={record.id}
                  fieldKey={field}
                  value={record.fields[field]}
                  onSave={onSave}
                  onEditingChange={onEditingChange}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded p-3">
          <div className="text-purple-800 dark:text-purple-200 text-sm">
            <strong>How Prompt-Only Generation Works:</strong>
            <ul className="mt-2 text-xs space-y-1 list-disc list-inside">
              <li>Images are generated purely from the text prompt above</li>
              <li>Reference images are only used for optimal dimensions (if available)</li>
              <li>Maximum of 3 images can be generated per record</li>
              <li>No reference image content is used in the generation process</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}