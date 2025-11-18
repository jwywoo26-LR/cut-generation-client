'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AirtableTable {
  id: string;
  name: string;
  primaryFieldId: string;
  fields: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

interface AirtableAttachment {
  url: string;
  filename?: string;
  size?: number;
  type?: string;
}

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

export default function DashboardV2Page() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Table management state
  const [tables, setTables] = useState<AirtableTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [isCreatingTable, setIsCreatingTable] = useState(false);
  const [createTableError, setCreateTableError] = useState('');
  const [createTableSuccess, setCreateTableSuccess] = useState('');

  // Records state
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // Upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // New record state
  const [isCreatingRecord, setIsCreatingRecord] = useState(false);

  // Per-row upload state
  const [uploadingRecordId, setUploadingRecordId] = useState<string | null>(null);

  // Per-row delete state
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  // Detail modal state
  const [selectedRecord, setSelectedRecord] = useState<AirtableRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [isSavingRecord, setIsSavingRecord] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'manage' | 'generate'>('manage');

  // Check if user is already authenticated
  useEffect(() => {
    const authStatus = sessionStorage.getItem('dashboardV2Auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Load tables when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadTables();
    }
  }, [isAuthenticated]);

  // Load records when table is selected
  useEffect(() => {
    if (selectedTable) {
      loadRecords();
    } else {
      setRecords([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTable]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');

    try {
      const response = await fetch('/api/auth/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setIsAuthenticated(true);
        sessionStorage.setItem('dashboardV2Auth', 'true');
        setPassword('');
      } else {
        const data = await response.json();
        setAuthError(data.error || 'Invalid password');
      }
    } catch {
      setAuthError('Authentication failed. Please try again.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('dashboardV2Auth');
    setPassword('');
    setAuthError('');
  };

  const loadTables = async () => {
    setIsLoadingTables(true);
    try {
      const response = await fetch('/api/airtable/list-tables');
      if (response.ok) {
        const data = await response.json();

        // Filter tables to only show those with matching schema
        const requiredFields = [
          'id',
          'reference_image',
          'character_id',
          'reference_image_attached',
          'initial_prompt',
          'restyled_prompt',
          'edit_prompt',
          'regenerate_status',
          'image_1',
          'image_2',
          'image_3'
        ];

        const matchingTables = (data.tables || []).filter((table: AirtableTable) => {
          const tableFieldNames = table.fields.map(f => f.name);
          return requiredFields.every(fieldName => tableFieldNames.includes(fieldName));
        });

        setTables(matchingTables);
      }
    } catch (error) {
      console.error('Failed to load tables:', error);
    } finally {
      setIsLoadingTables(false);
    }
  };

  const loadRecords = async () => {
    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) return;

    setIsLoadingRecords(true);
    try {
      const response = await fetch('/api/airtable/get-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tableName: selectedTableObj.name }),
      });

      if (response.ok) {
        const data = await response.json();
        // Sort records by reference_image field name
        const sortedRecords = (data.records || []).sort((a: AirtableRecord, b: AirtableRecord) => {
          const aName = (a.fields.reference_image as string) || '';
          const bName = (b.fields.reference_image as string) || '';
          return aName.localeCompare(bName);
        });
        setRecords(sortedRecords);
      }
    } catch (error) {
      console.error('Failed to load records:', error);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const validFiles: File[] = [];

    for (const file of fileList) {
      // Check if it's a ZIP file or image file
      if (file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
        validFiles.push(file);
      } else if (file.type.startsWith('image/')) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      setUploadError('Please select valid image files (PNG, JPG, JPEG, WEBP) or a ZIP file');
      return;
    }

    setSelectedFiles(validFiles);
    setUploadError('');
    setUploadSuccess('');
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadError('Please select files to upload');
      return;
    }

    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) {
      setUploadError('No table selected');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const formData = new FormData();
      formData.append('tableName', selectedTableObj.name);

      for (const file of selectedFiles) {
        formData.append('files', file);
      }

      const response = await fetch('/api/airtable/upload-references', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadSuccess(`Successfully uploaded ${data.count} reference image(s)!`);
        setSelectedFiles([]);
        // Refresh records after a short delay to ensure Airtable has processed them
        setTimeout(async () => {
          await loadRecords();
        }, 1000);
      } else {
        setUploadError(data.error || 'Failed to upload files');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) {
      setCreateTableError('Table name is required');
      return;
    }

    setIsCreatingTable(true);
    setCreateTableError('');
    setCreateTableSuccess('');

    try {
      const response = await fetch('/api/airtable/create-table', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tableName: newTableName }),
      });

      const data = await response.json();

      if (response.ok) {
        setCreateTableSuccess(`Table "${newTableName}" created successfully!`);
        setNewTableName('');
        await loadTables();
      } else {
        setCreateTableError(data.error || 'Failed to create table');
      }
    } catch {
      setCreateTableError('Failed to create table. Please try again.');
    } finally {
      setIsCreatingTable(false);
    }
  };

  const handleAddNewRecord = async () => {
    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) return;

    setIsCreatingRecord(true);

    try {
      const response = await fetch('/api/airtable/create-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tableName: selectedTableObj.name }),
      });

      if (response.ok) {
        setTimeout(async () => {
          await loadRecords();
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to create record:', error);
    } finally {
      setIsCreatingRecord(false);
    }
  };

  const handleRowImageUpload = async (recordId: string, file: File) => {
    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) return;

    setUploadingRecordId(recordId);

    try {
      console.log('Uploading image for record:', recordId);
      console.log('Table name:', selectedTableObj.name);
      console.log('File:', file.name, file.type, file.size);

      const formData = new FormData();
      formData.append('tableName', selectedTableObj.name);
      formData.append('recordId', recordId);
      formData.append('file', file);

      const response = await fetch('/api/airtable/update-record-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log('Upload response:', data);

      if (response.ok) {
        console.log('Image uploaded successfully');
        setTimeout(async () => {
          await loadRecords();
        }, 1000);
      } else {
        console.error('Upload failed:', data);
        const errorDetails = data.details ? `\nDetails: ${data.details}` : '';
        alert(`Failed to upload image: ${data.error || 'Unknown error'}${errorDetails}`);
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploadingRecordId(null);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) return;

    // Confirm deletion
    if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
      return;
    }

    setDeletingRecordId(recordId);

    try {
      console.log('Deleting record:', recordId);

      const response = await fetch('/api/airtable/delete-record', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableName: selectedTableObj.name,
          recordId: recordId,
        }),
      });

      const data = await response.json();
      console.log('Delete response:', data);

      if (response.ok) {
        console.log('Record deleted successfully');
        await loadRecords();
      } else {
        console.error('Delete failed:', data);
        const errorDetails = data.details ? `\nDetails: ${data.details}` : '';
        alert(`Failed to delete record: ${data.error || 'Unknown error'}${errorDetails}`);
      }
    } catch (error) {
      console.error('Failed to delete record:', error);
      alert(`Failed to delete record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingRecordId(null);
    }
  };

  const handleRowClick = (record: AirtableRecord) => {
    console.log('Row clicked:', record);
    setSelectedRecord(record);
    setEditedFields({
      character_id: (record.fields.character_id as string) || '',
      initial_prompt: (record.fields.initial_prompt as string) || '',
      restyled_prompt: (record.fields.restyled_prompt as string) || '',
      edit_prompt: (record.fields.edit_prompt as string) || '',
      regenerate_status: (record.fields.regenerate_status as string) || '',
    });
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedRecord(null);
    setEditedFields({});
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setEditedFields(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSaveRecord = async () => {
    if (!selectedRecord) return;

    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) return;

    setIsSavingRecord(true);

    try {
      const response = await fetch('/api/airtable/update-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableName: selectedTableObj.name,
          recordId: selectedRecord.id,
          fields: editedFields,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update the selected record with the new data
        setSelectedRecord(data.record);
        // Update the records list in the background (silently)
        // This updates the table but doesn't affect the modal
        setRecords(prevRecords =>
          prevRecords.map(r => r.id === data.record.id ? data.record : r)
        );
      }
    } catch (error) {
      console.error('Failed to save record:', error);
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handlePreviousRecord = () => {
    if (!selectedRecord) return;
    const currentIndex = records.findIndex(r => r.id === selectedRecord.id);
    if (currentIndex > 0) {
      const prevRecord = records[currentIndex - 1];
      handleRowClick(prevRecord);
    }
  };

  const handleNextRecord = () => {
    if (!selectedRecord) return;
    const currentIndex = records.findIndex(r => r.id === selectedRecord.id);
    if (currentIndex < records.length - 1) {
      const nextRecord = records[currentIndex + 1];
      handleRowClick(nextRecord);
    }
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              Dashboard V2
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Please enter the password to access the dashboard
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter password"
                disabled={isAuthLoading}
              />
            </div>

            {authError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                <div className="text-red-800 dark:text-red-200 text-sm">
                  {authError}
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isAuthLoading || !password.trim()}
                className={`
                  group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                  ${isAuthLoading || !password.trim()
                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                  }
                `}
              >
                {isAuthLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Authenticating...
                  </div>
                ) : (
                  'Access Dashboard'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Link
                href="/main"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Dashboard V2 - Character Reference Management
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Table Management */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Table Management
              </h2>

              {/* Create New Table Form */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Create New Table
                </h3>
                <form onSubmit={handleCreateTable} className="space-y-3">
                  <input
                    type="text"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    placeholder="Enter table name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isCreatingTable}
                  />
                  <button
                    type="submit"
                    disabled={isCreatingTable || !newTableName.trim()}
                    className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                      isCreatingTable || !newTableName.trim()
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isCreatingTable ? 'Creating...' : 'Create Table'}
                  </button>
                </form>

                {createTableError && (
                  <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      {createTableError}
                    </p>
                  </div>
                )}

                {createTableSuccess && (
                  <div className="mt-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      {createTableSuccess}
                    </p>
                  </div>
                )}
              </div>

              {/* Table Selection */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Table
                </h3>
                {isLoadingTables ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tables.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No tables found. Create one to get started.
                      </p>
                    ) : (
                      tables.map((table) => (
                        <button
                          key={table.id}
                          onClick={() => setSelectedTable(table.id)}
                          className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                            selectedTable === table.id
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {table.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
                <button
                  onClick={loadTables}
                  className="mt-3 w-full py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Refresh Tables
                </button>
              </div>
            </div>

            {/* Table Schema Info */}
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Table Schema
              </h3>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p><strong>Created tables include:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>id (text)</li>
                  <li>reference_image (text)</li>
                  <li>character_id (text)</li>
                  <li>reference_image_attached (file)</li>
                  <li>initial_prompt (long text)</li>
                  <li>restyled_prompt (long text)</li>
                  <li>edit_prompt (long text)</li>
                  <li>regenerate_status (text)</li>
                  <li>image_1 (file)</li>
                  <li>image_2 (file)</li>
                  <li>image_3 (file)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right Content Area - Records Display */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              {selectedTable ? (
                <div>
                  {/* Header with Title and Refresh */}
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Table Records
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {tables.find(t => t.id === selectedTable)?.name} - {records.length} records
                      </p>
                    </div>
                    <button
                      onClick={loadRecords}
                      disabled={isLoadingRecords}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                    >
                      {isLoadingRecords ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex gap-4">
                      <button
                        onClick={() => setActiveTab('manage')}
                        className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'manage'
                            ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        Manage Records
                      </button>
                      <button
                        onClick={() => setActiveTab('generate')}
                        className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'generate'
                            ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        Generate Content
                      </button>
                    </div>
                  </div>

                  {/* Tab Content: Manage Records */}
                  {activeTab === 'manage' && (
                    <>
                      {/* Add New Record Button */}
                      <div className="mb-6">
                        <button
                          onClick={handleAddNewRecord}
                          disabled={isCreatingRecord}
                          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                        >
                          {isCreatingRecord ? 'Creating...' : 'Add New Record'}
                        </button>
                      </div>

                      {/* Upload Reference Images Section */}
                  <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Upload Reference Images
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Upload reference images as a ZIP file or select multiple PNG/JPG files
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block">
                          <span className="sr-only">Choose files</span>
                          <input
                            type="file"
                            multiple
                            accept=".zip,.png,.jpg,.jpeg,.webp,application/zip,image/*"
                            onChange={handleFileSelect}
                            disabled={isUploading}
                            key={selectedFiles.length === 0 ? 'empty' : 'filled'}
                            className="block w-full text-sm text-gray-500 dark:text-gray-400
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-md file:border-0
                              file:text-sm file:font-semibold
                              file:bg-blue-50 file:text-blue-700
                              hover:file:bg-blue-100
                              dark:file:bg-blue-900 dark:file:text-blue-200
                              dark:hover:file:bg-blue-800
                              disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </label>

                        {selectedFiles.length > 0 && (
                          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            <p className="font-medium">Selected files:</p>
                            <ul className="list-disc list-inside ml-2 mt-1">
                              {selectedFiles.map((file, index) => (
                                <li key={index}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleUpload}
                        disabled={isUploading || selectedFiles.length === 0}
                        className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                          isUploading || selectedFiles.length === 0
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {isUploading ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Uploading...
                          </div>
                        ) : (
                          `Upload ${selectedFiles.length} file(s)`
                        )}
                      </button>

                      {uploadError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                          <p className="text-sm text-red-800 dark:text-red-200">
                            {uploadError}
                          </p>
                        </div>
                      )}

                      {uploadSuccess && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
                          <p className="text-sm text-green-800 dark:text-green-200">
                            {uploadSuccess}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                    </>
                  )}

                  {/* Tab Content: Generate Content */}
                  {activeTab === 'generate' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                          Prompt Generation
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Generate prompts for selected records
                        </p>
                        <button className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium">
                          Generate Prompts
                        </button>
                      </div>

                      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                          Image Generation
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Generate images based on prompts
                        </p>
                        <button className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium">
                          Generate Images
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Records Display */}
                  {isLoadingRecords ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600 dark:text-gray-400">Loading records...</p>
                    </div>
                  ) : records.length === 0 ? (
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
                  ) : (
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
                                onClick={() => handleRowClick(record)}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                              >
                                {/* Character ID */}
                                <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                                  {record.fields.character_id as string || '-'}
                                </td>

                                {/* Reference Image Preview */}
                                <td className="px-4 py-4 text-sm" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-3">
                                    {record.fields.reference_image_attached && Array.isArray(record.fields.reference_image_attached) && record.fields.reference_image_attached.length > 0 ? (
                                      <>
                                        <img
                                          src={(record.fields.reference_image_attached[0] as AirtableAttachment)?.url}
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
                                                handleRowImageUpload(record.id, file);
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
                                      </>
                                    ) : (
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
                                              handleRowImageUpload(record.id, file);
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
                                    )}
                                  </div>
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
                                  {(() => {
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
                                  })()}
                                </td>

                                {/* Delete Button */}
                                <td className="px-4 py-4 text-sm" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => handleDeleteRecord(record.id)}
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
                  )}
                </div>
              ) : (
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
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    No table selected
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Select or create a table to get started
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal - Side Panel */}
      {showDetailModal && selectedRecord ? (
        <div className="fixed right-0 top-0 h-full z-[9999] w-full max-w-4xl pointer-events-none">
          {/* Modal panel */}
          <div className="h-full bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto border-l border-gray-200 dark:border-gray-700 pointer-events-auto">
              {/* Modal Header */}
              <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Record Details
                  </h3>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body - Two Column Layout */}
              <div className="px-6 py-4 max-h-[calc(100vh-140px)] overflow-y-auto">
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column - Images */}
                  <div className="space-y-6">
                    {/* Reference Image */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Reference Image
                      </label>
                      {selectedRecord.fields.reference_image_attached && Array.isArray(selectedRecord.fields.reference_image_attached) && selectedRecord.fields.reference_image_attached.length > 0 ? (
                        <div>
                          <img
                            src={(selectedRecord.fields.reference_image_attached[0] as AirtableAttachment)?.url}
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

                    {/* Generated Images */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Generated Images
                      </label>
                      <div className="space-y-3">
                        {[1, 2, 3].map((num) => {
                          const imageField = selectedRecord.fields[`image_${num}`];
                          if (imageField && Array.isArray(imageField) && imageField.length > 0) {
                            return (
                              <div key={num} className="space-y-1">
                                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Image #{num}</p>
                                <img
                                  src={(imageField[0] as AirtableAttachment)?.url}
                                  alt={`Generated ${num}`}
                                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600"
                                />
                              </div>
                            );
                          }
                          return (
                            <div key={num} className="space-y-1">
                              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Image #{num}</p>
                              <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-300 dark:border-gray-600">
                                <p className="text-xs text-gray-400">No image</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Record Information */}
                  <div className="space-y-6">
                    {/* Character ID */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Character ID
                      </label>
                      <input
                        type="text"
                        value={editedFields.character_id || ''}
                        onChange={(e) => handleFieldChange('character_id', e.target.value)}
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
                        onChange={(e) => handleFieldChange('initial_prompt', e.target.value)}
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
                        onChange={(e) => handleFieldChange('restyled_prompt', e.target.value)}
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
                        onChange={(e) => handleFieldChange('edit_prompt', e.target.value)}
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
                        onChange={(e) => handleFieldChange('regenerate_status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-</option>
                        <option value="false">false</option>
                        <option value="true">true</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  {/* Navigation buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handlePreviousRecord}
                      disabled={records.findIndex(r => r.id === selectedRecord.id) === 0}
                      className={`p-2 rounded ${
                        records.findIndex(r => r.id === selectedRecord.id) === 0
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
                      {records.findIndex(r => r.id === selectedRecord.id) + 1} / {records.length}
                    </span>
                    <button
                      onClick={handleNextRecord}
                      disabled={records.findIndex(r => r.id === selectedRecord.id) === records.length - 1}
                      className={`p-2 rounded ${
                        records.findIndex(r => r.id === selectedRecord.id) === records.length - 1
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
                      onClick={handleCloseModal}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleSaveRecord}
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
      ) : null}
    </div>
  );
}
