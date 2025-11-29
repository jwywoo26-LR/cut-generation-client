'use client';

import { RecordsTable, UploadSection } from './index';
import type { Character } from './AvailableCharacters';
import type { AirtableRecord } from '../types';

interface ManageRecordsTabProps {
  // Records state
  records: AirtableRecord[];
  isLoadingRecords: boolean;
  uploadingRecordId: string | null;
  deletingRecordId: string | null;
  updatingStatusRecordId: string | null;
  updatingGenerationTypeRecordId: string | null;
  characters: Character[];

  // New record state
  isCreatingRecord: boolean;

  // Upload state
  selectedFiles: File[];
  isUploading: boolean;
  uploadError: string;
  uploadSuccess: string;

  // Handlers
  onAddNewRecord: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onClearFiles: () => void;
  onRowClick: (record: AirtableRecord) => void;
  onRowImageUpload: (recordId: string, file: File) => void;
  onDeleteRecord: (recordId: string) => void;
  onStatusChange: (recordId: string, status: string) => void;
  onGenerationTypeChange: (recordId: string, newType: 'prompt' | 'reference') => void;
  onBulkGenerationTypeChange: (newType: 'prompt' | 'reference') => void;
}

export function ManageRecordsTab({
  records,
  isLoadingRecords,
  uploadingRecordId,
  deletingRecordId,
  updatingStatusRecordId,
  updatingGenerationTypeRecordId,
  characters,
  isCreatingRecord,
  selectedFiles,
  isUploading,
  uploadError,
  uploadSuccess,
  onAddNewRecord,
  onFileSelect,
  onUpload,
  onClearFiles,
  onRowClick,
  onRowImageUpload,
  onDeleteRecord,
  onStatusChange,
  onGenerationTypeChange,
  onBulkGenerationTypeChange,
}: ManageRecordsTabProps) {
  return (
    <>
      {/* Add New Record Button */}
      <div className="mb-6">
        <button
          onClick={onAddNewRecord}
          disabled={isCreatingRecord}
          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
        >
          {isCreatingRecord ? 'Creating...' : 'Add New Record'}
        </button>
      </div>

      {/* Bulk Generation Type Update Section */}
      {records.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Apply to all:
          </span>
          <button
            onClick={() => onBulkGenerationTypeChange('reference')}
            disabled={updatingGenerationTypeRecordId !== null}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reference
          </button>
          <button
            onClick={() => onBulkGenerationTypeChange('prompt')}
            disabled={updatingGenerationTypeRecordId !== null}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Prompt
          </button>
        </div>
      )}

      {/* Upload Reference Images Section */}
      <UploadSection
        selectedFiles={selectedFiles}
        isUploading={isUploading}
        uploadError={uploadError}
        uploadSuccess={uploadSuccess}
        onFileSelect={onFileSelect}
        onUpload={onUpload}
        onClearFiles={onClearFiles}
      />

      {/* Records Display */}
      <RecordsTable
        records={records}
        isLoadingRecords={isLoadingRecords}
        uploadingRecordId={uploadingRecordId}
        deletingRecordId={deletingRecordId}
        updatingStatusRecordId={updatingStatusRecordId}
        updatingGenerationTypeRecordId={updatingGenerationTypeRecordId}
        characters={characters}
        onRowClick={onRowClick}
        onRowImageUpload={onRowImageUpload}
        onDeleteRecord={onDeleteRecord}
        onStatusChange={onStatusChange}
        onGenerationTypeChange={onGenerationTypeChange}
      />
    </>
  );
}
