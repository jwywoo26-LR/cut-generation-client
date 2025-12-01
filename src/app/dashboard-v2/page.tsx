'use client';

import { useState, useEffect } from 'react';
import {
  LoginScreen,
  Header,
  TableManagement,
  RecordDetailModal,
  ImageViewer,
  AvailableCharacters,
  ManageRecordsTab,
  PromptGenerationTab,
  MassGenerationTab,
  DEFAULT_TIMING_SETTINGS,
} from './components';
import type { Character, StyleRule, RestyleRule, TimingSettings } from './components';
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

  // Per-row status update state
  const [updatingStatusRecordId, setUpdatingStatusRecordId] = useState<string | null>(null);

  // Per-row generation type update state
  const [updatingGenerationTypeRecordId, setUpdatingGenerationTypeRecordId] = useState<string | null>(null);

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

  // Available characters state
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);
  const [applyingCharacterId, setApplyingCharacterId] = useState<string | null>(null);

  // Prompt generation state
  const [isGeneratingInitialPrompts, setIsGeneratingInitialPrompts] = useState(false);
  const [initialPromptProgress, setInitialPromptProgress] = useState<{ current: number; total: number } | null>(null);
  const [initialPromptError, setInitialPromptError] = useState<string>('');

  // Style rules state
  const [styleRules, setStyleRules] = useState<StyleRule[]>([]);

  // Miro integration state
  const [miroBoardId, setMiroBoardId] = useState('');
  const [miroBoardName, setMiroBoardName] = useState('');
  const [isMiroConfigured, setIsMiroConfigured] = useState(false);
  const [isGeneratingWithMiro, setIsGeneratingWithMiro] = useState(false);
  const [miroGenerationProgress, setMiroGenerationProgress] = useState<{current: number; total: number} | null>(null);
  const [miroGenerationError, setMiroGenerationError] = useState('');
  const [activeMiroBoardUrl, setActiveMiroBoardUrl] = useState<string | null>(null);
  const [variations, setVariations] = useState(1);
  const [queueSize, setQueueSize] = useState(25);
  const [massGenerationPromptType, setMassGenerationPromptType] = useState<'initial_prompt' | 'restyled_prompt' | 'edit_prompt'>('initial_prompt');
  const [followReferenceRatio, setFollowReferenceRatio] = useState(false);

  // Draft generation state
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftGenerationProgress, setDraftGenerationProgress] = useState<{current: number; total: number} | null>(null);
  const [draftGenerationError, setDraftGenerationError] = useState('');
  const [draftQueueSize, setDraftQueueSize] = useState(25);
  const [isFillingEmptyImages, setIsFillingEmptyImages] = useState(false);

  // Range filtering state for Initial Prompt Generation
  const [initialPromptRangeStart, setInitialPromptRangeStart] = useState<number>(1);
  const [initialPromptRangeEnd, setInitialPromptRangeEnd] = useState<number | null>(null);

  // Range filtering state for Draft Generation
  const [draftRangeStart, setDraftRangeStart] = useState<number>(1);
  const [draftRangeEnd, setDraftRangeEnd] = useState<number | null>(null);

  // Restyle state
  const [restyleRules, setRestyleRules] = useState<RestyleRule[]>([]);
  const [restyleFromColumn, setRestyleFromColumn] = useState('initial_prompt');
  const [restyleToColumn, setRestyleToColumn] = useState('restyled_prompt');
  const [isRestyling, setIsRestyling] = useState(false);
  const [restyleProgress, setRestyleProgress] = useState<{current: number; total: number} | null>(null);
  const [restyleError, setRestyleError] = useState('');

  // Random prompt generation state
  const [isGeneratingRandomPrompts, setIsGeneratingRandomPrompts] = useState(false);
  const [randomPromptProgress, setRandomPromptProgress] = useState<{ current: number; total: number } | null>(null);
  const [randomPromptError, setRandomPromptError] = useState<string>('');
  const [randomPromptColumn, setRandomPromptColumn] = useState<'initial_prompt' | 'restyled_prompt' | 'edit_prompt'>('initial_prompt');
  const [randomPromptTheme, setRandomPromptTheme] = useState<string>('');
  const [randomPromptDefaultTags, setRandomPromptDefaultTags] = useState<string>('1girl, solo, high quality, masterpiece');

  // Timing settings state (shared between Draft Generation and Mass Generation)
  const [timingSettings, setTimingSettings] = useState<TimingSettings>(DEFAULT_TIMING_SETTINGS);

  // Bulk image resize state
  const [isResizingImages, setIsResizingImages] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    const authStatus = sessionStorage.getItem('dashboardV2Auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Load tables and characters when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadTables();
      loadCharacters();
      checkMiroConfiguration();
    }
  }, [isAuthenticated]);

  // Check Miro configuration
  const checkMiroConfiguration = async () => {
    try {
      const response = await fetch('/api/miro/upload');
      if (response.ok) {
        const data = await response.json();
        setIsMiroConfigured(data.configured);
      }
    } catch (error) {
      console.error('Failed to check Miro configuration:', error);
      setIsMiroConfigured(false);
    }
  };

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

  // ===== Characters Handlers =====
  const loadCharacters = async () => {
    setIsLoadingCharacters(true);
    try {
      const response = await fetch('/api/airtable/get-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableName: 'dmm_characters' }),
      });

      if (response.ok) {
        const data = await response.json();
        const activeCharacters = (data.records || [])
          .filter((record: AirtableRecord) => record.fields.status === 'active')
          .map((record: AirtableRecord) => {
            // Handle character_image as either attachment array or plain string URL
            let imageUrl = '';
            const imageField = record.fields.character_image;
            if (Array.isArray(imageField) && imageField.length > 0) {
              // It's an attachment field
              imageUrl = (imageField[0] as AirtableAttachment).url || '';
            } else if (typeof imageField === 'string') {
              // It's a plain URL string
              imageUrl = imageField;
            }

            return {
              id: record.id,
              character_id: (record.fields.character_id as string) || '',
              character_name: (record.fields.character_name as string) || '',
              character_image: imageUrl,
              status: (record.fields.status as string) || '',
              training_mode: (record.fields.training_mode as string) || undefined,
            };
          });
        setCharacters(activeCharacters);
      }
    } catch (error) {
      console.error('Failed to load characters:', error);
    } finally {
      setIsLoadingCharacters(false);
    }
  };

  const handleApplyCharacter = async (character: Character) => {
    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) return;

    if (!confirm(`Apply character "${character.character_name || character.character_id}" to all ${records.length} records in "${selectedTableObj.name}"?`)) {
      return;
    }

    setApplyingCharacterId(character.character_id);

    try {
      const response = await fetch('/api/airtable/apply-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: selectedTableObj.name,
          characterId: character.character_id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Successfully applied character to ${data.updatedCount} records!`);
        await loadRecords();
      } else {
        alert(`Failed to apply character: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to apply character:', error);
      alert(`Failed to apply character: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setApplyingCharacterId(null);
    }
  };

  // ===== Initial Prompt Generation Handler =====
  const handleGenerateInitialPrompts = async () => {
    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) {
      setInitialPromptError('No table selected');
      return;
    }

    // Validate range
    const rangeStart = initialPromptRangeStart;
    const rangeEnd = initialPromptRangeEnd || records.length;

    if (rangeStart > rangeEnd) {
      alert('Invalid range: "From Row" cannot be greater than "To Row"');
      return;
    }

    // Count records that need prompts (for confirmation message)
    const recordsNeedingPrompts = records.filter((record, index) => {
      const rowNumber = index + 1;
      if (rowNumber < rangeStart || rowNumber > rangeEnd) {
        return false;
      }
      const hasReference = record.fields.reference_image_attached &&
                          Array.isArray(record.fields.reference_image_attached) &&
                          (record.fields.reference_image_attached as unknown[]).length > 0;
      const hasInitialPrompt = record.fields.initial_prompt &&
                              String(record.fields.initial_prompt).trim() !== '';
      return hasReference && !hasInitialPrompt;
    });

    const rulesMessage = styleRules.length > 0
      ? `\n\nStyle rules configured: ${styleRules.length} rule(s) will be applied.`
      : '\n\nNo style rules configured (default tag generation).';

    const rangeMessage = `(rows ${rangeStart}-${rangeEnd})`;
    const estimatedCount = recordsNeedingPrompts.length > 0
      ? `${recordsNeedingPrompts.length} records`
      : 'records';

    if (!confirm(`Generate initial prompts for ${estimatedCount} ${rangeMessage}? This will analyze reference images using vision AI.${rulesMessage}`)) {
      return;
    }

    setIsGeneratingInitialPrompts(true);
    setInitialPromptError('');
    setInitialPromptProgress({ current: 0, total: recordsNeedingPrompts.length || 1 });

    // Convert StyleRule[] to API format (remove the 'id' field used for React keys)
    const apiStyleRules = styleRules.map(rule => {
      const { id, ...ruleWithoutId } = rule;
      // Filter out undefined category values
      const cleanedRule: Record<string, unknown> = {
        rowStart: ruleWithoutId.rowStart,
        rowEnd: ruleWithoutId.rowEnd,
      };

      const categories = ['subject', 'facial_expression', 'clothing', 'nudity', 'angle', 'action', 'objects', 'background'] as const;
      for (const cat of categories) {
        if (ruleWithoutId[cat]) {
          cleanedRule[cat] = ruleWithoutId[cat];
        }
      }

      return cleanedRule;
    });

    try {
      const response = await fetch('/api/prompt-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: selectedTableObj.name,
          styleRules: apiStyleRules,
          rangeStart: initialPromptRangeStart,
          rangeEnd: initialPromptRangeEnd || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start prompt generation');
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let successCount = 0;
      let errorCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'progress') {
                setInitialPromptProgress({ current: data.current, total: data.total });
              } else if (data.type === 'complete') {
                successCount = data.successCount || 0;
                errorCount = data.errorCount || 0;
              } else if (data.type === 'error') {
                setInitialPromptError(data.message);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      alert(`Initial prompt generation complete!\n\nSuccessful: ${successCount}\nFailed: ${errorCount}`);
      await loadRecords();
    } catch (error) {
      console.error('Failed to generate initial prompts:', error);
      setInitialPromptError(error instanceof Error ? error.message : 'Unknown error');
      alert(`Failed to generate prompts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingInitialPrompts(false);
      setInitialPromptProgress(null);
    }
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
        console.log(`📊 Loaded ${data.records?.length || 0} records from Airtable`);
        const sortedRecords = (data.records || []).sort((a: AirtableRecord, b: AirtableRecord) => {
          const aName = (a.fields.reference_image as string) || '';
          const bName = (b.fields.reference_image as string) || '';
          return aName.localeCompare(bName);
        });
        setRecords(sortedRecords);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch records:', errorData);
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

  const handleStatusChange = async (recordId: string, status: string) => {
    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) return;

    setUpdatingStatusRecordId(recordId);

    try {
      const response = await fetch('/api/airtable/update-record', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: selectedTableObj.name,
          recordId: recordId,
          fields: { regenerate_status: status },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecords(prevRecords =>
          prevRecords.map(r => r.id === data.record.id ? data.record : r)
        );
      } else {
        const data = await response.json();
        alert(`Failed to update status: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      alert(`Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUpdatingStatusRecordId(null);
    }
  };

  const handleGenerationTypeChange = async (recordId: string, newType: 'prompt' | 'reference') => {
    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) return;

    setUpdatingGenerationTypeRecordId(recordId);

    try {
      const response = await fetch('/api/airtable/update-record', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: selectedTableObj.name,
          recordId: recordId,
          fields: { generation_type: newType },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecords(prevRecords =>
          prevRecords.map(r => r.id === data.record.id ? data.record : r)
        );
      } else {
        const data = await response.json();
        alert(`Failed to update generation type: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to update generation type:', error);
      alert(`Failed to update generation type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUpdatingGenerationTypeRecordId(null);
    }
  };

  const handleBulkGenerationTypeChange = async (newType: 'prompt' | 'reference') => {
    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) return;

    if (!confirm(`Apply "${newType}" generation type to all ${records.length} records?\n\nThis will update all records in the current table.`)) {
      return;
    }

    setUpdatingGenerationTypeRecordId('bulk'); // Use 'bulk' as a special indicator

    try {
      const response = await fetch('/api/airtable/bulk-update-generation-type', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: selectedTableObj.name,
          generationType: newType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Successfully updated ${data.updatedCount} records to "${newType}"`);
        await loadRecords(); // Reload all records to reflect changes
      } else {
        const data = await response.json();
        alert(`Failed to bulk update generation type: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to bulk update generation type:', error);
      alert(`Failed to bulk update generation type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUpdatingGenerationTypeRecordId(null);
    }
  };

  // ===== Bulk Copy Prompts Handler =====
  const handleBulkCopyPrompts = async (copyMode: 'initial_to_restyle' | 'restyle_to_edit') => {
    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) return;

    const sourceField = copyMode === 'initial_to_restyle' ? 'initial_prompt' : 'restyled_prompt';
    const destField = copyMode === 'initial_to_restyle' ? 'restyled_prompt' : 'edit_prompt';

    if (!confirm(`Copy all "${sourceField}" to "${destField}" for all records?\n\nThis will overwrite existing values in ${destField}.`)) {
      return;
    }

    setUpdatingGenerationTypeRecordId('bulk-copy'); // Reuse as a loading indicator

    try {
      const response = await fetch('/api/airtable/bulk-copy-prompts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: selectedTableObj.name,
          copyMode,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Successfully copied ${data.updatedCount} records from "${sourceField}" to "${destField}"`);
        await loadRecords();
      } else {
        const data = await response.json();
        alert(`Failed to copy prompts: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to bulk copy prompts:', error);
      alert(`Failed to copy prompts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUpdatingGenerationTypeRecordId(null);
    }
  };

  // Bulk resize images handler
  const handleBulkResizeImages = async () => {
    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) return;

    if (!confirm('Resize all oversized reference images?\n\nThis will:\n• Keep original aspect ratio\n• Fit images to ~1024px (based on orientation)\n• Skip images already small enough\n• Update Airtable with resized images')) {
      return;
    }

    setIsResizingImages(true);

    try {
      const response = await fetch('/api/airtable/bulk-resize-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: selectedTableObj.name,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Resized ${data.resizedCount} images (${data.skippedCount} skipped - already small enough)`);
        await loadRecords();
      } else {
        const data = await response.json();
        alert(`Failed to resize images: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to bulk resize images:', error);
      alert(`Failed to resize images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsResizingImages(false);
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

  const handleClearFiles = () => {
    setSelectedFiles([]);
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
      generation_type: (record.fields.generation_type as string) || 'reference',
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
        method: 'PATCH',
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
      } else {
        const errorData = await response.json();
        alert(`Failed to save record: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to save record:', error);
      alert(`Failed to save record: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  // ===== Miro Generation Handler =====
  const handleGenerateAndUploadToMiro = async () => {
    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) {
      setMiroGenerationError('No table selected');
      return;
    }

    // Count records ready for generation based on selected prompt type
    // Only include records where regenerate_status is true or empty/undefined
    const recordsReadyForGeneration = records.filter(record => {
      const hasPrompt = record.fields[massGenerationPromptType] &&
                        String(record.fields[massGenerationPromptType]).trim() !== '';
      const hasReference = record.fields.reference_image_attached &&
                          Array.isArray(record.fields.reference_image_attached) &&
                          (record.fields.reference_image_attached as unknown[]).length > 0;

      // Check regenerate_status: 'true' means regenerate, undefined/null means initial generation
      // Empty string '' means already generated (skip)
      const regenerateStatus = record.fields.regenerate_status;
      const shouldGenerate =
        regenerateStatus === true ||
        regenerateStatus === 'true' ||
        regenerateStatus === undefined ||
        regenerateStatus === null;

      return hasPrompt && hasReference && shouldGenerate;
    });

    if (recordsReadyForGeneration.length === 0) {
      setMiroGenerationError(`No records found ready for generation. Records need ${massGenerationPromptType.replace('_', ' ')}, reference images, and regenerate_status must be 'true' or empty (not yet set).`);
      return;
    }

    const totalGenerations = recordsReadyForGeneration.length * variations;
    const hasMiroConfig = isMiroConfigured && (miroBoardId.trim() || miroBoardName.trim());
    const miroMessage = hasMiroConfig ? ' and upload to Miro' : '';

    if (!confirm(`Generate ${variations} variation(s) for ${recordsReadyForGeneration.length} records (${totalGenerations} total images)${miroMessage}?\n\nThis may take several minutes.`)) {
      return;
    }

    setIsGeneratingWithMiro(true);
    setMiroGenerationError('');
    setMiroGenerationProgress({ current: 0, total: totalGenerations });

    try {
      // Build Miro config - use boardId if provided, otherwise boardName to create new board
      let miroConfigPayload = undefined;
      const isCreatingNewBoard = !miroBoardId.trim() && miroBoardName.trim();

      if (isMiroConfigured && (miroBoardId.trim() || miroBoardName.trim())) {
        miroConfigPayload = {
          boardId: miroBoardId.trim() || undefined,
          boardName: isCreatingNewBoard ? miroBoardName.trim() : undefined,
          imageWidth: 300,
          imageHeight: 450,
          columns: variations,
        };

        // Show Miro board URL immediately if using existing board
        if (miroBoardId.trim()) {
          setActiveMiroBoardUrl(`https://miro.com/app/board/${miroBoardId.trim()}/`);
        }
      }

      // Use streaming response when creating a new board to get URL immediately
      if (isCreatingNewBoard && miroConfigPayload) {
        const response = await fetch('/api/generate-and-upload-miro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableName: selectedTableObj.name,
            variations,
            queueSize,
            promptType: massGenerationPromptType,
            followReferenceRatio,
            streamResponse: true,
            miroConfig: miroConfigPayload,
            timingSettings,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to start generation');
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('event: ')) {
              const eventType = line.slice(7);
              const dataLine = lines[i + 1];
              if (dataLine && dataLine.startsWith('data: ')) {
                const data = JSON.parse(dataLine.slice(6));

                if (eventType === 'miro_board') {
                  // Set Miro board URL immediately when received
                  setActiveMiroBoardUrl(data.miroBoardUrl);
                } else if (eventType === 'progress') {
                  setMiroGenerationProgress({ current: data.current, total: data.total });
                } else if (eventType === 'complete') {
                  let miroInfo = '';
                  if (data.miroEnabled) {
                    miroInfo = `\nUploaded to Miro: ${data.miroUploadCount}`;
                    if (data.miroBoardUrl) {
                      miroInfo += `\nMiro Board: ${data.miroBoardUrl}`;
                    }
                  }
                  alert(`Generation complete!\n\nRecords processed: ${data.processedCount}\nTotal generations: ${data.totalGenerations}\nSuccessful: ${data.successCount}${miroInfo}`);
                  await loadRecords();
                } else if (eventType === 'error') {
                  setMiroGenerationError(data.error || 'Failed to generate and upload');
                }
                i++; // Skip the data line we just processed
              }
            }
          }
        }
      } else {
        // Non-streaming request for existing boards or no Miro
        const response = await fetch('/api/generate-and-upload-miro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableName: selectedTableObj.name,
            variations,
            queueSize,
            promptType: massGenerationPromptType,
            followReferenceRatio,
            miroConfig: miroConfigPayload,
            timingSettings,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          // Update Miro board URL from response (especially for newly created boards)
          if (data.miroBoardUrl) {
            setActiveMiroBoardUrl(data.miroBoardUrl);
          }

          let miroInfo = '';
          if (data.miroEnabled) {
            miroInfo = `\nUploaded to Miro: ${data.miroUploadCount}`;
            if (data.miroBoardUrl) {
              miroInfo += `\nMiro Board: ${data.miroBoardUrl}`;
            }
          }
          alert(`Generation complete!\n\nRecords processed: ${data.processedCount}\nTotal generations: ${data.totalGenerations}\nSuccessful: ${data.successCount}${miroInfo}`);
          await loadRecords();
        } else {
          setMiroGenerationError(data.error || 'Failed to generate and upload');
        }
      }
    } catch (error) {
      console.error('Failed to generate and upload to Miro:', error);
      setMiroGenerationError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsGeneratingWithMiro(false);
      setMiroGenerationProgress(null);
    }
  };

  // ===== Draft Generation Handler =====
  const handleDraftGeneration = async () => {
    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) {
      setDraftGenerationError('No table selected');
      return;
    }

    // Validate range
    const rangeStart = draftRangeStart;
    const rangeEnd = draftRangeEnd || records.length;

    if (rangeStart > rangeEnd) {
      alert('Invalid range: "From Row" cannot be greater than "To Row"');
      return;
    }

    // Count records ready for draft generation (has initial_prompt and reference_image_attached) within range
    const recordsReadyForDraft = records.filter((record, index) => {
      const rowNumber = index + 1;
      if (rowNumber < rangeStart || rowNumber > rangeEnd) {
        return false;
      }
      const hasPrompt = record.fields.initial_prompt &&
                        String(record.fields.initial_prompt).trim() !== '';
      const hasReference = record.fields.reference_image_attached &&
                          Array.isArray(record.fields.reference_image_attached) &&
                          (record.fields.reference_image_attached as unknown[]).length > 0;
      return hasPrompt && hasReference;
    });

    if (recordsReadyForDraft.length === 0) {
      setDraftGenerationError(`No records found in range ${rangeStart}-${rangeEnd} ready for draft generation. Records need initial_prompt and reference_image_attached.`);
      return;
    }

    const totalGenerations = recordsReadyForDraft.length * 3; // 3 variations per record
    const rangeMessage = `(rows ${rangeStart}-${rangeEnd})`;

    if (!confirm(`Generate draft images for ${recordsReadyForDraft.length} records ${rangeMessage} (${totalGenerations} total images)?\n\nThis will fill image_1, image_2, image_3 columns.\n\nNote: This ignores regenerate_status and always regenerates.`)) {
      return;
    }

    setIsGeneratingDraft(true);
    setDraftGenerationError('');
    setDraftGenerationProgress({ current: 0, total: totalGenerations });

    try {
      const response = await fetch('/api/draft-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: selectedTableObj.name,
          queueSize: draftQueueSize,
          followReferenceRatio: true, // Always follow reference ratio for draft generation
          timingSettings,
          rangeStart,
          rangeEnd: draftRangeEnd || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start draft generation');
      }

      // Handle SSE streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let lastProgressTime = Date.now();
      const CONNECTION_TIMEOUT = 60000; // 60 seconds without updates = connection lost

      // Monitor connection health
      const connectionMonitor = setInterval(() => {
        const timeSinceLastProgress = Date.now() - lastProgressTime;
        if (timeSinceLastProgress > CONNECTION_TIMEOUT) {
          console.warn('⚠️ No updates for 60 seconds - connection may be lost');
          setDraftGenerationError('⚠️ Live updates paused. Generation is still running on server! Refresh the page to see progress.');
          clearInterval(connectionMonitor);
          reader.cancel();
          // Auto-reload records every 10 seconds to show progress
          const autoRefresh = setInterval(async () => {
            await loadRecords();
          }, 10000);
          // Store interval ID to clear it later if needed
          (window as Window & { draftAutoRefresh?: NodeJS.Timeout }).draftAutoRefresh = autoRefresh;
        }
      }, 10000); // Check every 10 seconds

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          lastProgressTime = Date.now(); // Update last activity time

          // Parse SSE events
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('event: ')) {
              const eventType = line.slice(7);
              const dataLine = lines[i + 1];
              if (dataLine && dataLine.startsWith('data: ')) {
                try {
                  const data = JSON.parse(dataLine.slice(6));

                  if (eventType === 'heartbeat') {
                    // Keep-alive heartbeat - just log it
                    console.log(`💓 Heartbeat: ${data.activeTasks} active, ${data.queueRemaining} queued`);
                  } else if (eventType === 'progress') {
                    setDraftGenerationProgress({ current: data.current, total: data.total });
                  } else if (eventType === 'record_updated') {
                    console.log(`✅ Record ${data.recordIndex + 1} updated:`, data.recordId);
                  } else if (eventType === 'complete') {
                    alert(`Draft generation complete!\n\nRecords processed: ${data.processedCount}\nTotal generations: ${data.totalGenerations}\nSuccessful: ${data.successCount}\nAirtable updates: ${data.updateSuccessCount} success, ${data.updateErrorCount} errors`);
                    await loadRecords();
                  } else if (eventType === 'error') {
                    setDraftGenerationError(data.error || 'Failed to generate draft images');
                  }
                } catch (parseError) {
                  console.error('Failed to parse SSE event:', parseError);
                }
                i++; // Skip the data line we just processed
              }
            }
          }
        }
      } finally {
        clearInterval(connectionMonitor);
      }
    } catch (error) {
      console.error('Failed to generate draft images:', error);
      setDraftGenerationError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsGeneratingDraft(false);
      setDraftGenerationProgress(null);
    }
  };

  // Fill Empty Images handler - only generates for records missing image_1, image_2, or image_3
  const handleFillEmptyImages = async () => {
    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) {
      setDraftGenerationError('No table selected');
      return;
    }

    // Validate range
    const rangeStart = draftRangeStart;
    const rangeEnd = draftRangeEnd || records.length;

    if (rangeStart > rangeEnd) {
      alert('Invalid range: "From Row" cannot be greater than "To Row"');
      return;
    }

    // Count records that have prompt + reference but are missing at least one image
    const recordsWithEmptyImages = records.filter((record, index) => {
      const rowNumber = index + 1;
      if (rowNumber < rangeStart || rowNumber > rangeEnd) {
        return false;
      }
      const hasPrompt = record.fields.initial_prompt &&
                        String(record.fields.initial_prompt).trim() !== '';
      const hasReference = record.fields.reference_image_attached &&
                          Array.isArray(record.fields.reference_image_attached) &&
                          (record.fields.reference_image_attached as unknown[]).length > 0;

      // Check if any of image_1, image_2, image_3 are empty
      const hasImage1 = record.fields.image_1 &&
                        Array.isArray(record.fields.image_1) &&
                        (record.fields.image_1 as unknown[]).length > 0;
      const hasImage2 = record.fields.image_2 &&
                        Array.isArray(record.fields.image_2) &&
                        (record.fields.image_2 as unknown[]).length > 0;
      const hasImage3 = record.fields.image_3 &&
                        Array.isArray(record.fields.image_3) &&
                        (record.fields.image_3 as unknown[]).length > 0;

      const hasMissingImages = !hasImage1 || !hasImage2 || !hasImage3;

      return hasPrompt && hasReference && hasMissingImages;
    });

    if (recordsWithEmptyImages.length === 0) {
      alert(`No records found in range ${rangeStart}-${rangeEnd} with empty images.\n\nAll records either:\n• Already have all 3 images, or\n• Are missing initial_prompt/reference_image`);
      return;
    }

    const totalGenerations = recordsWithEmptyImages.length * 3;
    const rangeMessage = `(rows ${rangeStart}-${rangeEnd})`;

    if (!confirm(`Fill empty images for ${recordsWithEmptyImages.length} records ${rangeMessage}?\n\nThis will only generate for records missing image_1, image_2, or image_3.\n\nTotal generations: up to ${totalGenerations}`)) {
      return;
    }

    setIsFillingEmptyImages(true);
    setDraftGenerationError('');
    setDraftGenerationProgress({ current: 0, total: totalGenerations });

    try {
      const response = await fetch('/api/draft-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: selectedTableObj.name,
          queueSize: draftQueueSize,
          rangeStart,
          rangeEnd,
          fillEmptyOnly: true, // New flag to only fill empty slots
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start fill empty images');
      }

      // Handle SSE stream (same as draft generation)
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let lastProgressTime = Date.now();
      const CONNECTION_TIMEOUT = 60000;

      const connectionMonitor = setInterval(() => {
        const timeSinceLastProgress = Date.now() - lastProgressTime;
        if (timeSinceLastProgress > CONNECTION_TIMEOUT) {
          console.warn('⚠️ No updates for 60 seconds - connection may be lost');
          setDraftGenerationError('⚠️ Live updates paused. Generation is still running on server! Refresh the page to see progress.');
          clearInterval(connectionMonitor);
          reader.cancel();
        }
      }, 10000);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          lastProgressTime = Date.now();

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('event: ')) {
              const eventType = line.slice(7);
              const dataLine = lines[i + 1];
              if (dataLine && dataLine.startsWith('data: ')) {
                try {
                  const data = JSON.parse(dataLine.slice(6));

                  if (eventType === 'progress') {
                    setDraftGenerationProgress({ current: data.current, total: data.total });
                  } else if (eventType === 'complete') {
                    alert(`Fill empty images complete!\n\nRecords processed: ${data.processedCount}\nTotal generations: ${data.totalGenerations}\nSuccessful: ${data.successCount}`);
                    await loadRecords();
                  } else if (eventType === 'error') {
                    setDraftGenerationError(data.message);
                  }
                } catch {
                  // Ignore parse errors
                }
                i++; // Skip data line
              }
            }
          }
        }
      } finally {
        clearInterval(connectionMonitor);
      }
    } catch (error) {
      console.error('Failed to fill empty images:', error);
      setDraftGenerationError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsFillingEmptyImages(false);
      setDraftGenerationProgress(null);
    }
  };

  // ===== Restyle Handler =====
  const handleRestylePrompts = async () => {
    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) {
      setRestyleError('No table selected');
      return;
    }

    if (restyleRules.length === 0) {
      setRestyleError('Please add at least one restyle rule');
      return;
    }

    const recordsWithPrompt = records.filter(record => {
      const prompt = record.fields[restyleFromColumn];
      return prompt && String(prompt).trim() !== '';
    });

    if (recordsWithPrompt.length === 0) {
      setRestyleError(`No records found with content in ${restyleFromColumn}`);
      return;
    }

    if (!confirm(`Restyle ${recordsWithPrompt.length} prompts?\n\nFrom: ${restyleFromColumn}\nTo: ${restyleToColumn}\nRules: ${restyleRules.length}`)) {
      return;
    }

    setIsRestyling(true);
    setRestyleError('');
    setRestyleProgress({ current: 0, total: recordsWithPrompt.length });

    try {
      const response = await fetch('/api/restyle-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: selectedTableObj.name,
          fromColumn: restyleFromColumn,
          toColumn: restyleToColumn,
          rules: restyleRules,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start restyle');
      }

      // Handle SSE streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7);
            const dataLine = lines[i + 1];
            if (dataLine && dataLine.startsWith('data: ')) {
              try {
                const data = JSON.parse(dataLine.slice(6));

                if (eventType === 'progress') {
                  setRestyleProgress({ current: data.current, total: data.total });
                } else if (eventType === 'complete') {
                  alert(`Restyle complete!\n\nProcessed: ${data.processedCount}\nSuccess: ${data.successCount}\nErrors: ${data.errorCount}`);
                  await loadRecords();
                } else if (eventType === 'error') {
                  setRestyleError(data.error || 'Failed to restyle prompts');
                }
              } catch {
                // Skip invalid JSON
              }
              i++; // Skip the data line we just processed
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to restyle prompts:', error);
      setRestyleError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsRestyling(false);
      setRestyleProgress(null);
    }
  };

  // ===== Random Prompt Generation Handlers =====
  const handleRandomPromptColumnChange = (column: string) => {
    setRandomPromptColumn(column as 'initial_prompt' | 'restyled_prompt' | 'edit_prompt');
  };

  const handleGenerateRandomPrompts = async () => {
    const selectedTableObj = tables.find(t => t.id === selectedTable);
    if (!selectedTableObj) {
      setRandomPromptError('No table selected');
      return;
    }

    if (records.length === 0) {
      setRandomPromptError('No records found in table');
      return;
    }

    const themeMessage = randomPromptTheme ? `\nTheme: ${randomPromptTheme}` : '\nTheme: Random (no specific theme)';
    const tagsMessage = randomPromptDefaultTags ? `\nDefault tags: ${randomPromptDefaultTags}` : '';

    if (!confirm(`Generate random prompts for ${records.length} records?${themeMessage}${tagsMessage}\n\nTarget column: ${randomPromptColumn}`)) {
      return;
    }

    setIsGeneratingRandomPrompts(true);
    setRandomPromptError('');
    setRandomPromptProgress({ current: 0, total: records.length });

    try {
      const response = await fetch('/api/random-prompt-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: selectedTableObj.name,
          targetColumn: randomPromptColumn,
          theme: randomPromptTheme || undefined,
          defaultTags: randomPromptDefaultTags || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start random prompt generation');
      }

      // Handle SSE streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7);
            const dataLine = lines[i + 1];
            if (dataLine && dataLine.startsWith('data: ')) {
              try {
                const data = JSON.parse(dataLine.slice(6));

                if (eventType === 'progress') {
                  setRandomPromptProgress({ current: data.current, total: data.total });
                } else if (eventType === 'complete') {
                  alert(`Random prompt generation complete!\n\nProcessed: ${data.processedCount}\nSuccess: ${data.successCount}\nErrors: ${data.errorCount}`);
                  await loadRecords();
                } else if (eventType === 'error') {
                  setRandomPromptError(data.error || 'Failed to generate random prompts');
                }
              } catch {
                // Skip invalid JSON
              }
              i++; // Skip the data line we just processed
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to generate random prompts:', error);
      setRandomPromptError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsGeneratingRandomPrompts(false);
      setRandomPromptProgress(null);
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
          {/* Left Sidebar - Table Management & Characters */}
          <div className="lg:col-span-1 space-y-0">
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
            <AvailableCharacters
              characters={characters}
              isLoading={isLoadingCharacters}
              applyingCharacterId={applyingCharacterId}
              selectedTable={selectedTable}
              onApplyCharacter={handleApplyCharacter}
              onRefresh={loadCharacters}
            />
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
                        onClick={() => setActiveTab('prompt_generation')}
                        className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'prompt_generation'
                            ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        Prompt Generation
                      </button>
                      <button
                        onClick={() => setActiveTab('mass_generation')}
                        className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'mass_generation'
                            ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        Mass Generation
                      </button>
                    </div>
                  </div>

                  {/* Tab Content: Manage Records */}
                  {activeTab === 'manage' && (
                    <ManageRecordsTab
                      records={records}
                      isLoadingRecords={isLoadingRecords}
                      uploadingRecordId={uploadingRecordId}
                      deletingRecordId={deletingRecordId}
                      updatingStatusRecordId={updatingStatusRecordId}
                      updatingGenerationTypeRecordId={updatingGenerationTypeRecordId}
                      characters={characters}
                      isCreatingRecord={isCreatingRecord}
                      selectedFiles={selectedFiles}
                      isUploading={isUploading}
                      uploadError={uploadError}
                      uploadSuccess={uploadSuccess}
                      onAddNewRecord={handleAddNewRecord}
                      onFileSelect={handleFileSelect}
                      onUpload={handleUpload}
                      onClearFiles={handleClearFiles}
                      onRowClick={handleRowClick}
                      onRowImageUpload={handleRowImageUpload}
                      onDeleteRecord={handleDeleteRecord}
                      onStatusChange={handleStatusChange}
                      onGenerationTypeChange={handleGenerationTypeChange}
                      onBulkGenerationTypeChange={handleBulkGenerationTypeChange}
                      onBulkCopyPrompts={handleBulkCopyPrompts}
                      onBulkResizeImages={handleBulkResizeImages}
                      isResizingImages={isResizingImages}
                    />
                  )}

                  {/* Tab Content: Prompt Generation */}
                  {activeTab === 'prompt_generation' && (
                    <PromptGenerationTab
                      styleRules={styleRules}
                      onStyleRulesChange={setStyleRules}
                      maxRows={records.length || 100}
                      initialPromptRangeStart={initialPromptRangeStart}
                      initialPromptRangeEnd={initialPromptRangeEnd}
                      onInitialPromptRangeStartChange={setInitialPromptRangeStart}
                      onInitialPromptRangeEndChange={setInitialPromptRangeEnd}
                      isGeneratingInitialPrompts={isGeneratingInitialPrompts}
                      initialPromptProgress={initialPromptProgress}
                      initialPromptError={initialPromptError}
                      onGenerateInitialPrompts={handleGenerateInitialPrompts}
                      selectedTable={selectedTable}
                      restyleRules={restyleRules}
                      onRestyleRulesChange={setRestyleRules}
                      restyleFromColumn={restyleFromColumn}
                      restyleToColumn={restyleToColumn}
                      onRestyleFromColumnChange={setRestyleFromColumn}
                      onRestyleToColumnChange={setRestyleToColumn}
                      isRestyling={isRestyling}
                      restyleProgress={restyleProgress}
                      restyleError={restyleError}
                      onRestylePrompts={handleRestylePrompts}
                      isGeneratingRandomPrompts={isGeneratingRandomPrompts}
                      randomPromptProgress={randomPromptProgress}
                      randomPromptError={randomPromptError}
                      randomPromptColumn={randomPromptColumn}
                      randomPromptTheme={randomPromptTheme}
                      randomPromptDefaultTags={randomPromptDefaultTags}
                      onRandomPromptColumnChange={handleRandomPromptColumnChange}
                      onRandomPromptThemeChange={setRandomPromptTheme}
                      onRandomPromptDefaultTagsChange={setRandomPromptDefaultTags}
                      onGenerateRandomPrompts={handleGenerateRandomPrompts}
                    />
                  )}

                  {/* Tab Content: Mass Generation */}
                  {activeTab === 'mass_generation' && (
                    <MassGenerationTab
                      isGeneratingDraft={isGeneratingDraft}
                      draftGenerationProgress={draftGenerationProgress}
                      draftGenerationError={draftGenerationError}
                      draftQueueSize={draftQueueSize}
                      onDraftQueueSizeChange={setDraftQueueSize}
                      onDraftGeneration={handleDraftGeneration}
                      onFillEmptyImages={handleFillEmptyImages}
                      isFillingEmptyImages={isFillingEmptyImages}
                      draftRangeStart={draftRangeStart}
                      draftRangeEnd={draftRangeEnd}
                      onDraftRangeStartChange={setDraftRangeStart}
                      onDraftRangeEndChange={setDraftRangeEnd}
                      maxRows={records.length || 100}
                      isGeneratingWithMiro={isGeneratingWithMiro}
                      miroGenerationProgress={miroGenerationProgress}
                      miroGenerationError={miroGenerationError}
                      activeMiroBoardUrl={activeMiroBoardUrl}
                      isMiroConfigured={isMiroConfigured}
                      miroBoardId={miroBoardId}
                      miroBoardName={miroBoardName}
                      onMiroBoardIdChange={setMiroBoardId}
                      onMiroBoardNameChange={setMiroBoardName}
                      massGenerationPromptType={massGenerationPromptType}
                      variations={variations}
                      queueSize={queueSize}
                      followReferenceRatio={followReferenceRatio}
                      onPromptTypeChange={setMassGenerationPromptType}
                      onVariationsChange={setVariations}
                      onQueueSizeChange={setQueueSize}
                      onFollowReferenceRatioChange={setFollowReferenceRatio}
                      timingSettings={timingSettings}
                      onTimingSettingsChange={setTimingSettings}
                      onGenerateAndUploadToMiro={handleGenerateAndUploadToMiro}
                      selectedTable={selectedTable}
                    />
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
          characters={characters}
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
