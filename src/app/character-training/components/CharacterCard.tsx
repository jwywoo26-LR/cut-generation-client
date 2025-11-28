'use client';

import React from 'react';
import Image from 'next/image';

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

interface CharacterCardProps {
  character: Character;
  isCheckingStatus: boolean;
  isEditingName: boolean;
  editingName: string;
  onCheckStatus: () => void;
  onStartEditName: () => void;
  onCancelEditName: () => void;
  onSaveName: () => void;
  onEditingNameChange: (name: string) => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export function CharacterCard({
  character,
  isCheckingStatus,
  isEditingName,
  editingName,
  onCheckStatus,
  onStartEditName,
  onCancelEditName,
  onSaveName,
  onEditingNameChange,
  onToggleStatus,
  onDelete,
  isDeleting,
}: CharacterCardProps) {
  const imageUrl = character.fields.character_image?.[0]?.url;
  const status = character.fields.status || 'inactive';

  // Status badge colors
  const statusColors = {
    training: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
      {/* Image */}
      <div className="aspect-square relative mb-4 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-600">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={character.fields.character_name || 'Character'}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Image
          </div>
        )}
      </div>

      {/* Character Name */}
      <div className="mb-3">
        {isEditingName ? (
          <div className="space-y-2">
            <input
              type="text"
              value={editingName}
              onChange={(e) => onEditingNameChange(e.target.value)}
              className="w-full px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={onSaveName}
                className="flex-1 px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={onCancelEditName}
                className="flex-1 px-3 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {character.fields.character_name || 'Unnamed'}
            </h3>
            <button
              onClick={onStartEditName}
              className="ml-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="mb-3">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      {/* Character ID */}
      <div className="mb-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          ID: {character.fields.character_id || 'N/A'}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {/* Check Status Button */}
        {status === 'training' && (
          <button
            onClick={onCheckStatus}
            disabled={isCheckingStatus}
            className="w-full px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCheckingStatus ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Checking...
              </div>
            ) : (
              'Check Training Status'
            )}
          </button>
        )}

        {/* Toggle Active/Inactive Button */}
        {status !== 'training' && (
          <button
            onClick={onToggleStatus}
            className={`w-full px-4 py-2 text-sm font-medium rounded ${
              status === 'active'
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {status === 'active' ? 'Set Inactive' : 'Set Active'}
          </button>
        )}

        {/* Delete Button */}
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="w-full px-4 py-2 text-sm font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Deleting...
            </div>
          ) : (
            'Delete'
          )}
        </button>
      </div>

      {/* Created Time */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Created: {new Date(character.createdTime).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
