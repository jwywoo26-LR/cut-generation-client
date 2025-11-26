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
  onRowClick: (record: AirtableRecord) => void;
  onRowImageUpload: (recordId: string, file: File) => void;
  onDeleteRecord: (recordId: string) => void;
  onStatusChange: (recordId: string, status: string) => void;
}

export function ManageRecordsTab({
  records,
  isLoadingRecords,
  uploadingRecordId,
  deletingRecordId,
  updatingStatusRecordId,
  characters,
  isCreatingRecord,
  selectedFiles,
  isUploading,
  uploadError,
  uploadSuccess,
  onAddNewRecord,
  onFileSelect,
  onUpload,
  onRowClick,
  onRowImageUpload,
  onDeleteRecord,
  onStatusChange,
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

      {/* Upload Reference Images Section */}
      <UploadSection
        selectedFiles={selectedFiles}
        isUploading={isUploading}
        uploadError={uploadError}
        uploadSuccess={uploadSuccess}
        onFileSelect={onFileSelect}
        onUpload={onUpload}
      />

      {/* Records Display */}
      <RecordsTable
        records={records}
        isLoadingRecords={isLoadingRecords}
        uploadingRecordId={uploadingRecordId}
        deletingRecordId={deletingRecordId}
        updatingStatusRecordId={updatingStatusRecordId}
        characters={characters}
        onRowClick={onRowClick}
        onRowImageUpload={onRowImageUpload}
        onDeleteRecord={onDeleteRecord}
        onStatusChange={onStatusChange}
      />
    </>
  );
}
