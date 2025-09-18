'use client';

import EditableCell from '../EditableCell';

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

interface ReferenceSectionProps {
  record: AirtableRecord;
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
}

export default function ReferenceSection({
  record,
  onSave,
  selectedModelInfo,
  availableModels,
  onEditingChange
}: ReferenceSectionProps) {
  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Reference Image</h3>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reference Image Attached
          </div>
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
        <div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Selected Characters
          </div>
          <EditableCell
            value={record.fields['selected_characters'] || ''}
            fieldKey="selected_characters"
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
    </div>
  );
}