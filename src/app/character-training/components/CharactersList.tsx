'use client';

import React, { useState } from 'react';
import { CharacterCard } from './CharacterCard';

interface Character {
  id: string;
  fields: {
    character_id?: string;
    task_id?: number;
    character_name?: string;
    character_image?: Array<{ url: string }>;
    status?: 'training' | 'active' | 'inactive';
  };
  createdTime: string;
}

interface CharactersListProps {
  characters: Character[];
  isLoading: boolean;
  onRefresh: () => void;
  tableName: string;
}

export function CharactersList({
  characters,
  isLoading,
  onRefresh,
  tableName,
}: CharactersListProps) {
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCheckStatus = async (recordId: string) => {
    setCheckingStatusId(recordId);
    try {
      const response = await fetch('/api/training/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName,
          recordId,
        }),
      });

      if (response.ok) {
        // Refresh the list to show updated status
        await onRefresh();
      } else {
        const data = await response.json();
        console.error('Failed to check status:', data.error);
      }
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setCheckingStatusId(null);
    }
  };

  const handleStartEditName = (character: Character) => {
    setEditingNameId(character.id);
    setEditingName(character.fields.character_name || '');
  };

  const handleCancelEditName = () => {
    setEditingNameId(null);
    setEditingName('');
  };

  const handleSaveName = async (recordId: string) => {
    if (!editingName.trim()) {
      return;
    }

    try {
      const response = await fetch('/api/training/update-name', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName,
          recordId,
          characterName: editingName.trim(),
        }),
      });

      if (response.ok) {
        setEditingNameId(null);
        setEditingName('');
        // Refresh the list
        await onRefresh();
      } else {
        const data = await response.json();
        console.error('Failed to update name:', data.error);
      }
    } catch (error) {
      console.error('Error updating name:', error);
    }
  };

  const handleToggleStatus = async (recordId: string, currentStatus: string) => {
    // Only allow toggling between active and inactive (not training)
    if (currentStatus === 'training') {
      return;
    }

    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    try {
      const response = await fetch('/api/airtable/update-record', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName,
          recordId,
          fields: {
            status: newStatus,
          },
        }),
      });

      if (response.ok) {
        // Refresh the list
        await onRefresh();
      } else {
        const data = await response.json();
        console.error('Failed to toggle status:', data.error);
      }
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleDelete = async (recordId: string) => {
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this character? This action cannot be undone.')) {
      return;
    }

    setDeletingId(recordId);
    try {
      const response = await fetch('/api/training/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName,
          recordId,
        }),
      });

      if (response.ok) {
        // Refresh the list
        await onRefresh();
      } else {
        const data = await response.json();
        console.error('Failed to delete character:', data.error);
        alert('Failed to delete character. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting character:', error);
      alert('Failed to delete character. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Characters ({characters.length})
        </h2>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Characters Grid */}
      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading characters...</p>
          </div>
        ) : characters.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">No characters yet. Create your first one above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {characters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                isCheckingStatus={checkingStatusId === character.id}
                isEditingName={editingNameId === character.id}
                editingName={editingName}
                onCheckStatus={() => handleCheckStatus(character.id)}
                onStartEditName={() => handleStartEditName(character)}
                onCancelEditName={handleCancelEditName}
                onSaveName={() => handleSaveName(character.id)}
                onEditingNameChange={setEditingName}
                onToggleStatus={() => handleToggleStatus(character.id, character.fields.status || 'inactive')}
                onDelete={() => handleDelete(character.id)}
                isDeleting={deletingId === character.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
