'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrainingUploadSection } from './components/TrainingUploadSection';
import { CharactersList } from './components/CharactersList';

interface Character {
  id: string;
  fields: {
    character_id?: string;
    task_id?: number;
    character_name?: string;
    character_image?: Array<{ url: string }>;
    status?: 'training' | 'active' | 'inactive';
    training_mode?: string;
    style_type?: string;
  };
  createdTime: string;
}

type TrainingMode = 'single' | 'nsfw';
type FilterMode = 'all' | 'single' | 'nsfw';

export default function TrainingPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TrainingMode>('single');

  // State
  const [characters, setCharacters] = useState<Character[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [characterName, setCharacterName] = useState('');
  const [styleType, setStyleType] = useState('anime');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  const TABLE_NAME = 'dmm_characters';

  // Load characters on mount
  useEffect(() => {
    loadCharacters();
  }, []);

  const loadCharacters = async () => {
    setIsLoadingCharacters(true);
    try {
      const response = await fetch(`/api/airtable/get-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableName: TABLE_NAME }),
      });

      const data = await response.json();

      if (response.ok) {
        setCharacters(data.records || []);
      } else {
        console.error('Failed to load characters:', data);
      }
    } catch (error) {
      console.error('Failed to load characters:', error);
    } finally {
      setIsLoadingCharacters(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCreateError('');
      setCreateSuccess('');
    }
  };

  const handleCreateTraining = async () => {
    if (!selectedFile || !characterName.trim()) {
      setCreateError('Please select an image and enter a character name');
      return;
    }

    setIsCreating(true);
    setCreateError('');
    setCreateSuccess('');

    try {
      const formData = new FormData();
      formData.append('tableName', TABLE_NAME);
      formData.append('characterName', characterName.trim());
      formData.append('styleType', styleType);
      formData.append('trainingMode', activeTab);
      formData.append('image', selectedFile);

      const response = await fetch('/api/training/create', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setCreateSuccess(`Training started for ${characterName}!`);
        setSelectedFile(null);
        setCharacterName('');
        // Reload characters
        await loadCharacters();
      } else {
        setCreateError(data.error || 'Failed to create training task');
      }
    } catch (error) {
      setCreateError('Failed to create training task');
      console.error('Create training error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setCreateError('');
    setCreateSuccess('');
  };

  // Filter characters based on selected filter mode
  const filteredCharacters = characters.filter((character) => {
    if (filterMode === 'all') return true;
    // Handle cases where training_mode might be undefined (old records)
    return character.fields.training_mode === filterMode;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-4">
              <Link
                href="/main"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mt-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Character Training Management
                </h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Upload character images and manage AI training tasks
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Upload Section */}
        <TrainingUploadSection
          selectedFile={selectedFile}
          characterName={characterName}
          styleType={styleType}
          trainingMode={activeTab}
          isCreating={isCreating}
          createError={createError}
          createSuccess={createSuccess}
          onFileSelect={handleFileSelect}
          onCharacterNameChange={setCharacterName}
          onStyleTypeChange={setStyleType}
          onTrainingModeChange={setActiveTab}
          onCreateTraining={handleCreateTraining}
          onClearFile={handleClearFile}
        />

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setFilterMode('all')}
                className={`${
                  filterMode === 'all'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                All Characters
              </button>
              <button
                onClick={() => setFilterMode('single')}
                className={`${
                  filterMode === 'single'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Single Image
              </button>
              <button
                onClick={() => setFilterMode('nsfw')}
                className={`${
                  filterMode === 'nsfw'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                NSFW
              </button>
            </nav>
          </div>
        </div>

        {/* Characters List */}
        <CharactersList
          characters={filteredCharacters}
          isLoading={isLoadingCharacters}
          onRefresh={loadCharacters}
          tableName={TABLE_NAME}
        />
      </div>
    </div>
  );
}
