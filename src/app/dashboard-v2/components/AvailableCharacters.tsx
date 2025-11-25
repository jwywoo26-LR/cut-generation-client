'use client';

import React from 'react';

export interface Character {
  id: string;
  character_id: string;
  character_name: string;
  character_image: string;
  status: string;
}

interface AvailableCharactersProps {
  characters: Character[];
  isLoading: boolean;
  applyingCharacterId: string | null;
  selectedTable: string;
  onApplyCharacter: (character: Character) => void;
  onRefresh: () => void;
}

export function AvailableCharacters({
  characters,
  isLoading,
  applyingCharacterId,
  selectedTable,
  onApplyCharacter,
  onRefresh,
}: AvailableCharactersProps) {
  return (
    <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Available Characters
        </h3>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading characters...</p>
        </div>
      ) : characters.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No active characters found in dmm_characters table.
        </p>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {characters.map((character) => (
            <div
              key={character.id}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              {/* Character Image */}
              {character.character_image ? (
                <img
                  src={character.character_image}
                  alt={character.character_name}
                  className="w-12 h-12 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}

              {/* Character Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {character.character_name || 'Unnamed'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  ID: {character.character_id}
                </p>
              </div>

              {/* Apply Button */}
              <button
                onClick={() => onApplyCharacter(character)}
                disabled={!selectedTable || applyingCharacterId === character.character_id}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  !selectedTable
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                    : applyingCharacterId === character.character_id
                    ? 'bg-blue-200 text-blue-600 cursor-wait dark:bg-blue-900 dark:text-blue-300'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800'
                }`}
              >
                {applyingCharacterId === character.character_id ? (
                  <span className="flex items-center gap-1">
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Applying...
                  </span>
                ) : (
                  'Apply'
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {!selectedTable && characters.length > 0 && (
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
          Select a table to apply characters
        </p>
      )}
    </div>
  );
}
