'use client';

import React from 'react';
import { AirtableRecord, AirtableAttachment } from '../types';

interface RecordsTableProps {
  records: AirtableRecord[];
  isLoadingRecords: boolean;
  uploadingRecordId: string | null;
  deletingRecordId: string | null;
  onRowClick: (record: AirtableRecord) => void;
  onRowImageUpload: (recordId: string, file: File) => void;
  onDeleteRecord: (recordId: string) => void;
}

export function RecordsTable({
  records,
  isLoadingRecords,
  uploadingRecordId,
  deletingRecordId,
  onRowClick,
  onRowImageUpload,
  onDeleteRecord,
}: RecordsTableProps) {
  if (isLoadingRecords) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading records...</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
          No records found
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          This table is empty. Add records in Airtable to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="max-h-[600px] overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Character ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Reference Image
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Generated Image
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {records.map((record) => (
              <tr
                key={record.id}
                onClick={() => onRowClick(record)}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                {/* Character ID */}
                <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                  {record.fields.character_id as string || '-'}
                </td>

                {/* Reference Image Preview */}
                <td className="px-4 py-4 text-sm" onClick={(e) => e.stopPropagation()}>
                  <ReferenceImageCell
                    record={record}
                    uploadingRecordId={uploadingRecordId}
                    onRowImageUpload={onRowImageUpload}
                  />
                </td>

                {/* Status */}
                <td className="px-4 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    record.fields.regenerate_status === 'true'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {(record.fields.regenerate_status as string) || '-'}
                  </span>
                </td>

                {/* First Generated Image Preview */}
                <td className="px-4 py-4 text-sm" onClick={(e) => e.stopPropagation()}>
                  <GeneratedImageCell record={record} />
                </td>

                {/* Delete Button */}
                <td className="px-4 py-4 text-sm" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onDeleteRecord(record.id)}
                    disabled={deletingRecordId === record.id}
                    className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                      deletingRecordId === record.id
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800'
                    }`}
                  >
                    {deletingRecordId === record.id ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting
                      </>
                    ) : (
                      <>
                        <svg className="-ml-0.5 mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface ReferenceImageCellProps {
  record: AirtableRecord;
  uploadingRecordId: string | null;
  onRowImageUpload: (recordId: string, file: File) => void;
}

function ReferenceImageCell({ record, uploadingRecordId, onRowImageUpload }: ReferenceImageCellProps) {
  const hasImage = record.fields.reference_image_attached &&
    Array.isArray(record.fields.reference_image_attached) &&
    record.fields.reference_image_attached.length > 0;

  if (hasImage) {
    return (
      <div className="flex items-center gap-3">
        <img
          src={(record.fields.reference_image_attached as AirtableAttachment[])[0]?.url}
          alt="Reference"
          className="w-16 h-16 object-cover rounded border border-gray-300 dark:border-gray-600"
        />
        <label className="cursor-pointer">
          <input
            key={`upload-${record.id}-${uploadingRecordId === record.id ? 'uploading' : 'ready'}`}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onRowImageUpload(record.id, file);
                e.target.value = '';
              }
            }}
            disabled={uploadingRecordId === record.id}
            className="hidden"
          />
          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
            uploadingRecordId === record.id
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:hover:bg-yellow-800'
          }`}>
            {uploadingRecordId === record.id ? (
              <>
                <svg className="animate-spin -ml-1 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading
              </>
            ) : (
              'Reupload'
            )}
          </span>
        </label>
      </div>
    );
  }

  return (
    <label className="cursor-pointer flex items-center gap-2">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <input
        key={`upload-${record.id}-${uploadingRecordId === record.id ? 'uploading' : 'ready'}`}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onRowImageUpload(record.id, file);
            e.target.value = '';
          }
        }}
        disabled={uploadingRecordId === record.id}
        className="hidden"
      />
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
        uploadingRecordId === record.id
          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
          : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800'
      }`}>
        {uploadingRecordId === record.id ? (
          <>
            <svg className="animate-spin -ml-1 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading
          </>
        ) : (
          'Upload'
        )}
      </span>
    </label>
  );
}

interface GeneratedImageCellProps {
  record: AirtableRecord;
}

function GeneratedImageCell({ record }: GeneratedImageCellProps) {
  const image1 = record.fields.image_1;

  if (image1 && Array.isArray(image1) && image1.length > 0) {
    return (
      <a
        href={(image1[0] as AirtableAttachment)?.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          src={(image1[0] as AirtableAttachment)?.url}
          alt="Generated"
          className="w-16 h-16 object-cover rounded border border-gray-300 dark:border-gray-600 hover:opacity-80 transition-opacity"
        />
      </a>
    );
  }

  return (
    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center">
      <span className="text-xs text-gray-400">-</span>
    </div>
  );
}
