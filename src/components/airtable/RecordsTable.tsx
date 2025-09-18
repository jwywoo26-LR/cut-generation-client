'use client';

import { useState } from 'react';
import EditableCell from './EditableCell';
import RecordModal from './RecordModal';

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


export default function RecordsTable({ 
  records, 
  isLoading, 
  tableName,
  onRecordUpdate,
  selectedModelInfo,
  availableModels,
  onEditingChange
}: RecordsTableProps) {
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  
  // Essential columns for compact view
  const compactColumns = [
    'reference_image',
    'reference_image_attached', 
    'selected_characters',
    'result_status'
  ];

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

  const currentRecordIndex = expandedRecord ? sortedRecords.findIndex(r => r.id === expandedRecord) : -1;

  const handleNavigateRecord = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentRecordIndex > 0) {
      setExpandedRecord(sortedRecords[currentRecordIndex - 1].id);
    } else if (direction === 'next' && currentRecordIndex < sortedRecords.length - 1) {
      setExpandedRecord(sortedRecords[currentRecordIndex + 1].id);
    }
  };

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

  const handleRecordUpdate = (updatedRecord: AirtableRecord) => {
    onRecordUpdate(updatedRecord);
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
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {compactColumns.map((fieldName) => (
                <th
                  key={fieldName}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  {fieldName.replace(/_/g, ' ')}
                </th>
              ))}
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedRecords.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                {compactColumns.map((fieldName) => (
                  <td key={`${record.id}-${fieldName}`} className="px-3 py-4 align-top">
                    <EditableCell
                      value={record.fields[fieldName] || ''}
                      fieldKey={fieldName}
                      recordId={record.id}
                      onSave={handleCellSave}
                      isEditable={fieldName === 'selected_characters'}
                      recordFields={record.fields}
                      selectedModelInfo={selectedModelInfo}
                      availableModels={availableModels}
                      onEditingChange={onEditingChange}
                    />
                  </td>
                ))}
                <td className="px-3 py-4 align-top">
                  <button
                    onClick={() => setExpandedRecord(record.id)}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <RecordModal
        record={sortedRecords.find(r => r.id === expandedRecord) || null}
        isOpen={expandedRecord !== null}
        onClose={() => setExpandedRecord(null)}
        tableName={tableName}
        onRecordUpdate={handleRecordUpdate}
        selectedModelInfo={selectedModelInfo}
        availableModels={availableModels}
        onEditingChange={onEditingChange}
        allRecords={sortedRecords}
        currentRecordIndex={currentRecordIndex >= 0 ? currentRecordIndex : 0}
        onNavigateRecord={handleNavigateRecord}
      />
    </>
  );
}