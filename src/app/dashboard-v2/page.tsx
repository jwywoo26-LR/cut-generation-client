'use client';

import { useState, useEffect } from 'react';
import {
  LoginScreen,
  Header,
  TableManagement,
  RecordsTable,
  UploadSection,
  RecordDetailModal,
  ImageViewer,
} from './components';
import { AirtableTable, AirtableRecord, AirtableAttachment, TabType, PromptType } from './types';

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
  const [activeTab, setActiveTab] = useState<TabType>('manage');

  // Image generation state
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isGeneratingReference, setIsGeneratingReference] = useState(false);
  const [promptGeneratedImage, setPromptGeneratedImage] = useState<string | null>(null);
  const [referenceGeneratedImage, setReferenceGeneratedImage] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string>('');
  const [selectedPromptType, setSelectedPromptType] = useState<PromptType>('initial_prompt');
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

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

  // ===== Authentication Handlers =====
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');

    try {
      const response = await fetch('/api/auth/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // ===== Table Management Handlers =====
  const loadTables = async () => {
    setIsLoadingTables(true);
    try {
      const response = await fetch('/api/airtable/list-tables');
      if (response.ok) {
        const data = await response.json();

        const requiredFields = [
          'id', 'reference_image', 'character_id', 'reference_image_attached',
          'initial_prompt', 'restyled_prompt', 'edit_prompt', 'regenerate_status',
          'image_1', 'image_2', 'image_3'
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
        headers: { 'Content-Type': 'application/json' },
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

  // ===== Records Handlers =====
  const loadRecords = async () => {
    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) return;

    setIsLoadingRecords(true);
    try {
      const response = await fetch('/api/airtable/get-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableName: selectedTableObj.name }),
      });

      if (response.ok) {
        const data = await response.json();
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

  const handleAddNewRecord = async () => {
    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) return;

    setIsCreatingRecord(true);

    try {
      const response = await fetch('/api/airtable/create-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleDeleteRecord = async (recordId: string) => {
    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) return;

    if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
      return;
    }

    setDeletingRecordId(recordId);

    try {
      const response = await fetch('/api/airtable/delete-record', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: selectedTableObj.name,
          recordId: recordId,
        }),
      });

      if (response.ok) {
        await loadRecords();
      } else {
        const data = await response.json();
        alert(`Failed to delete record: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to delete record:', error);
      alert(`Failed to delete record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingRecordId(null);
    }
  };

  // ===== Upload Handlers =====
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const validFiles: File[] = [];

    for (const file of fileList) {
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

  const handleRowImageUpload = async (recordId: string, file: File) => {
    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) return;

    setUploadingRecordId(recordId);

    try {
      const formData = new FormData();
      formData.append('tableName', selectedTableObj.name);
      formData.append('recordId', recordId);
      formData.append('file', file);

      const response = await fetch('/api/airtable/update-record-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setTimeout(async () => {
          await loadRecords();
        }, 1000);
      } else {
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

  // ===== Detail Modal Handlers =====
  const handleRowClick = (record: AirtableRecord) => {
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
    setEditedFields(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSaveRecord = async () => {
    if (!selectedRecord) return;

    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) return;

    setIsSavingRecord(true);

    try {
      const response = await fetch('/api/airtable/update-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: selectedTableObj.name,
          recordId: selectedRecord.id,
          fields: editedFields,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedRecord(data.record);
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
      handleRowClick(records[currentIndex - 1]);
    }
  };

  const handleNextRecord = () => {
    if (!selectedRecord) return;
    const currentIndex = records.findIndex(r => r.id === selectedRecord.id);
    if (currentIndex < records.length - 1) {
      handleRowClick(records[currentIndex + 1]);
    }
  };

  // ===== Image Generation Handlers =====
  const imageUrlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64 = base64String.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleGeneratePromptOnly = async () => {
    if (!selectedRecord) return;

    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) return;

    const prompt = editedFields[selectedPromptType] || selectedRecord.fields[selectedPromptType] as string;
    if (!prompt) {
      setGenerationError(`No ${selectedPromptType.replace('_', ' ')} available. Please add it first.`);
      return;
    }

    const characterId = editedFields.character_id || selectedRecord.fields.character_id as string;
    if (!characterId) {
      setGenerationError('No character ID available. Please add a character ID first.');
      return;
    }

    setIsGeneratingPrompt(true);
    setGenerationError('');
    setPromptGeneratedImage(null);

    try {
      const generationResponse = await fetch('/api/single-image-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationType: 'prompt_only',
          prompt: prompt,
          bodyModelId: characterId,
          width: 1024,
          height: 1024,
        }),
      });

      if (!generationResponse.ok) {
        const errorData = await generationResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Failed to create image generation task: ${errorData.error || generationResponse.statusText}`);
      }

      const generationData = await generationResponse.json();
      const synthId = generationData.synth_id;
      const imageUrl = generationData.image_url;

      if (!imageUrl) {
        throw new Error('No image URL returned from generation');
      }

      const currentIndex = records.findIndex(r => r.id === selectedRecord.id);
      const logResponse = await fetch('/api/generation-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: selectedTableObj.name,
          rowIndex: currentIndex,
          generationType: 'prompt_only',
          usedPrompt: prompt,
          synthId: synthId,
        }),
      });

      const logData = await logResponse.json();
      const logId = logData.log_id;

      if (logId) {
        await fetch('/api/generation-logs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            logId: logId,
            generatedImageUrl: imageUrl,
          }),
        });
      }

      setPromptGeneratedImage(imageUrl);
    } catch (error) {
      console.error('Error generating prompt-only image:', error);
      setGenerationError(error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleGenerateWithReference = async () => {
    if (!selectedRecord) return;

    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) return;

    const prompt = editedFields[selectedPromptType] || selectedRecord.fields[selectedPromptType] as string;
    if (!prompt) {
      setGenerationError(`No ${selectedPromptType.replace('_', ' ')} available. Please add it first.`);
      return;
    }

    const characterId = editedFields.character_id || selectedRecord.fields.character_id as string;
    if (!characterId) {
      setGenerationError('No character ID available. Please add a character ID first.');
      return;
    }

    const referenceImageField = selectedRecord.fields.reference_image_attached;
    if (!referenceImageField || !Array.isArray(referenceImageField) || referenceImageField.length === 0) {
      setGenerationError('No reference image available. Please upload a reference image first.');
      return;
    }

    const referenceImageUrl = (referenceImageField[0] as AirtableAttachment).url;

    setIsGeneratingReference(true);
    setGenerationError('');
    setReferenceGeneratedImage(null);

    try {
      const referenceBase64 = await imageUrlToBase64(referenceImageUrl);

      const generationResponse = await fetch('/api/single-image-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationType: 'reference',
          prompt: prompt,
          bodyModelId: characterId,
          referenceImageBase64: referenceBase64,
          width: 1024,
          height: 1024,
          fastMode: false,
        }),
      });

      if (!generationResponse.ok) {
        const errorData = await generationResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Failed to create image generation task: ${errorData.error || generationResponse.statusText}`);
      }

      const generationData = await generationResponse.json();
      const synthId = generationData.synth_id;
      const imageUrl = generationData.image_url;

      if (!imageUrl) {
        throw new Error('No image URL returned from generation');
      }

      const currentIndex = records.findIndex(r => r.id === selectedRecord.id);
      const logResponse = await fetch('/api/generation-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: selectedTableObj.name,
          rowIndex: currentIndex,
          generationType: 'reference',
          usedPrompt: prompt,
          synthId: synthId,
        }),
      });

      const logData = await logResponse.json();
      const logId = logData.log_id;

      if (logId) {
        await fetch('/api/generation-logs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            logId: logId,
            generatedImageUrl: imageUrl,
          }),
        });
      }

      setReferenceGeneratedImage(imageUrl);
    } catch (error) {
      console.error('Error generating reference-based image:', error);
      setGenerationError(error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setIsGeneratingReference(false);
    }
  };

  // ===== Render =====
  if (!isAuthenticated) {
    return (
      <LoginScreen
        password={password}
        setPassword={setPassword}
        authError={authError}
        isAuthLoading={isAuthLoading}
        onLogin={handleLogin}
      />
    );
  }

  const selectedTableObj = tables.find(t => t.id === selectedTable);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header onLogout={handleLogout} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Table Management */}
          <TableManagement
            tables={tables}
            selectedTable={selectedTable}
            setSelectedTable={setSelectedTable}
            isLoadingTables={isLoadingTables}
            newTableName={newTableName}
            setNewTableName={setNewTableName}
            isCreatingTable={isCreatingTable}
            createTableError={createTableError}
            createTableSuccess={createTableSuccess}
            onCreateTable={handleCreateTable}
            onRefreshTables={loadTables}
          />

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
                        {selectedTableObj?.name} - {records.length} records
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
                      <UploadSection
                        selectedFiles={selectedFiles}
                        isUploading={isUploading}
                        uploadError={uploadError}
                        uploadSuccess={uploadSuccess}
                        onFileSelect={handleFileSelect}
                        onUpload={handleUpload}
                      />
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
                  <RecordsTable
                    records={records}
                    isLoadingRecords={isLoadingRecords}
                    uploadingRecordId={uploadingRecordId}
                    deletingRecordId={deletingRecordId}
                    onRowClick={handleRowClick}
                    onRowImageUpload={handleRowImageUpload}
                    onDeleteRecord={handleDeleteRecord}
                  />
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
      {showDetailModal && selectedRecord && (
        <RecordDetailModal
          selectedRecord={selectedRecord}
          records={records}
          editedFields={editedFields}
          isSavingRecord={isSavingRecord}
          isGeneratingPrompt={isGeneratingPrompt}
          isGeneratingReference={isGeneratingReference}
          promptGeneratedImage={promptGeneratedImage}
          referenceGeneratedImage={referenceGeneratedImage}
          generationError={generationError}
          selectedPromptType={selectedPromptType}
          onClose={handleCloseModal}
          onFieldChange={handleFieldChange}
          onSave={handleSaveRecord}
          onPrevious={handlePreviousRecord}
          onNext={handleNextRecord}
          onGeneratePromptOnly={handleGeneratePromptOnly}
          onGenerateWithReference={handleGenerateWithReference}
          onPromptTypeChange={setSelectedPromptType}
          onExpandImage={setExpandedImage}
        />
      )}

      {/* Fullscreen Image Viewer */}
      <ImageViewer imageUrl={expandedImage} onClose={() => setExpandedImage(null)} />
    </div>
  );
}
