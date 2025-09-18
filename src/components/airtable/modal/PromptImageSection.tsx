'use client';

import EditableCell from '../EditableCell';

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

interface PromptImageSectionProps {
  record: AirtableRecord;
  type: 'initial' | 'edited';
  onSave: (recordId: string, fieldKey: string, newValue: string) => Promise<void>;
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
  onDownload?: (type: 'initial' | 'edited') => void;
}

export default function PromptImageSection({
  record,
  type,
  onSave,
  selectedModelInfo,
  availableModels,
  onEditingChange,
  onDownload
}: PromptImageSectionProps) {
  const promptField = type === 'initial' ? 'initial_prompt' : 'edited_prompt';
  const imageFieldPrefix = type === 'initial' ? 'initial_prompt_image' : 'edited_prompt_image';
  const title = type === 'initial' ? 'Initial Prompt Images' : 'Edited Prompt Images';
  
  // Get all possible image fields
  const allImageFields = [
    `${imageFieldPrefix}_1`,
    `${imageFieldPrefix}_2`, 
    `${imageFieldPrefix}_3`,
    `${imageFieldPrefix}_4`,
    `${imageFieldPrefix}_5`
  ];
  
  // Filter to only show image fields that have values
  const imageFields = allImageFields.filter(field => {
    const imageField = record.fields[field];
    return imageField && (
      (typeof imageField === 'string' && imageField.startsWith('http')) ||
      (Array.isArray(imageField) && imageField.length > 0 && imageField[0].url)
    );
  });

  // Always show section (removed the null return condition)
  // This ensures users can always input prompts even if no images exist yet

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
        {imageFields.length > 0 && onDownload && (
          <button
            onClick={() => onDownload(type)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              type === 'initial' 
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            Download
          </button>
        )}
      </div>
      
      {/* First Row: Reference Image + Generated Images (Only show if there are generated images) */}
      {imageFields.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Images</div>
          <div className="flex gap-4">
            {/* Reference Image (Fixed) */}
            <div className="flex-shrink-0">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reference</div>
              <EditableCell
                value={record.fields['reference_image_attached'] || ''}
                fieldKey="reference_image_attached"
                recordId={record.id}
                onSave={onSave}
                isEditable={false}
                recordFields={record.fields}
                selectedModelInfo={selectedModelInfo}
                availableModels={availableModels}
                onEditingChange={onEditingChange}
              />
            </div>
            
            {/* Generated Images (Scrollable) */}
            <div className="flex gap-4 overflow-x-auto pb-2 flex-1">
              {imageFields.map((fieldName, index) => (
                <div key={fieldName} className="flex-shrink-0">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Generated {index + 1}</div>
                  <EditableCell
                    value={record.fields[fieldName] || ''}
                    fieldKey={fieldName}
                    recordId={record.id}
                    onSave={onSave}
                    isEditable={false}
                    recordFields={record.fields}
                    selectedModelInfo={selectedModelInfo}
                    availableModels={availableModels}
                    onEditingChange={onEditingChange}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Second Row: Prompt */}
      <div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {type === 'initial' ? 'Initial Prompt' : 'Edited Prompt'}
        </div>
        <EditableCell
          value={record.fields[promptField] || ''}
          fieldKey={promptField}
          recordId={record.id}
          onSave={onSave}
          isEditable={true}
          recordFields={record.fields}
          selectedModelInfo={selectedModelInfo}
          availableModels={availableModels}
          onEditingChange={onEditingChange}
        />
      </div>
    </div>
  );
}