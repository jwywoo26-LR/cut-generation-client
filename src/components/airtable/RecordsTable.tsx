'use client';

import EditableCell from './EditableCell';

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

interface RecordsTableProps {
  records: AirtableRecord[];
  isLoading: boolean;
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
}

// Required columns for the application - should match the schema
const REQUIRED_COLUMNS = [
  'reference_image',
  'initial_prompt',
  'edited_prompt',
  'reference_image_attached',
  'selected_characters',
  'status',
  'initial_prompt_image_1',
  'initial_prompt_image_2',
  'initial_prompt_image_3',
  'initial_prompt_image_4',
  'initial_prompt_image_5',
  'edited_prompt_image_1',
  'edited_prompt_image_2',
  'edited_prompt_image_3',
  'edited_prompt_image_4',
  'edited_prompt_image_5'
];

export default function RecordsTable({ 
  records, 
  isLoading, 
  tableName,
  onRecordUpdate,
  selectedModelInfo,
  availableModels,
  onEditingChange
}: RecordsTableProps) {
  // Filter out empty image columns for display
  const getVisibleColumns = () => {
    const imageColumns = [
      'initial_prompt_image_1', 'initial_prompt_image_2', 'initial_prompt_image_3', 
      'initial_prompt_image_4', 'initial_prompt_image_5',
      'edited_prompt_image_1', 'edited_prompt_image_2', 'edited_prompt_image_3',
      'edited_prompt_image_4', 'edited_prompt_image_5'
    ];
    
    const nonImageColumns = REQUIRED_COLUMNS.filter(col => !imageColumns.includes(col));
    
    // Check which image columns have content in any record
    const visibleImageColumns = imageColumns.filter(col => 
      records.some(record => 
        record.fields[col] && 
        (typeof record.fields[col] === 'string' && record.fields[col].startsWith('http') ||
         Array.isArray(record.fields[col]) && record.fields[col].length > 0)
      )
    );
    
    return [...nonImageColumns, ...visibleImageColumns];
  };
  
  const allFieldNames = getVisibleColumns();

  // Sort records by reference_image field
  const sortedRecords = [...records].sort((a, b) => {
    const aRef = String(a.fields['reference_image'] || '').toLowerCase();
    const bRef = String(b.fields['reference_image'] || '').toLowerCase();
    
    // Natural sort to handle reference-01, reference-02, etc.
    return aRef.localeCompare(bRef, undefined, {
      numeric: true,
      sensitivity: 'base'
    });
  });

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
      
      // Update the record in the parent component
      onRecordUpdate(result.record);
      
    } catch (error) {
      console.error('Error updating record:', error);
      throw error; // Re-throw so EditableCell can handle the error
    }
  };
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-300">Loading records...</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">
          No records found in this table.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            {allFieldNames.map((fieldName) => (
              <th
                key={fieldName}
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-80"
              >
                {fieldName.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {sortedRecords.map((record) => (
            <tr key={record.id}>
              {allFieldNames.map((fieldName) => (
                <td key={`${record.id}-${fieldName}`} className="px-3 py-8 align-top min-w-80">
                  <EditableCell
                    value={record.fields[fieldName] || ''}
                    fieldKey={fieldName}
                    recordId={record.id}
                    onSave={handleCellSave}
                    isEditable={true}
                    recordFields={record.fields}
                    selectedModelInfo={selectedModelInfo}
                    availableModels={availableModels}
                    onEditingChange={onEditingChange}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}