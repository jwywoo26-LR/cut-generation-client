'use client';

import { useState } from 'react';

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface CharacterManagementProps {
  availableSeries: string[];
  selectedSeries: string;
  filteredPersonas: AirtableRecord[];
  isLoadingPersonas: boolean;
  onSeriesSelect: (series: string) => void;
  onPersonasUpdated: () => void;
}

export default function CharacterManagement({
  availableSeries,
  selectedSeries,
  filteredPersonas,
  isLoadingPersonas,
  onSeriesSelect,
  onPersonasUpdated,
}: CharacterManagementProps) {
  const [editingPersonaId, setEditingPersonaId] = useState<string | null>(null);
  const [editingPersonaText, setEditingPersonaText] = useState<string>('');
  const [editingPersonaSeries, setEditingPersonaSeries] = useState<string>('');
  const [isAddingCharacter, setIsAddingCharacter] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState<string>('');
  const [newCharacterPersona, setNewCharacterPersona] = useState<string>('');
  const [newCharacterSeries, setNewCharacterSeries] = useState<string>('');

  const handleEditPersona = (recordId: string, currentPersona: string, currentSeries: string) => {
    setEditingPersonaId(recordId);
    setEditingPersonaText(currentPersona);
    setEditingPersonaSeries(currentSeries);
  };

  const handleSavePersona = async (recordId: string, characterName: string) => {
    try {
      const response = await fetch('/api/airtable/update-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId,
          characterName,
          persona: editingPersonaText,
          series: editingPersonaSeries
        }),
      });

      if (response.ok) {
        onPersonasUpdated();
        setEditingPersonaId(null);
        setEditingPersonaText('');
        setEditingPersonaSeries('');
      } else {
        console.error('Failed to update persona');
      }
    } catch (error) {
      console.error('Update persona error:', error);
    }
  };

  const handleDeletePersona = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this character?')) {
      return;
    }

    try {
      const response = await fetch('/api/airtable/delete-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId }),
      });

      if (response.ok) {
        onPersonasUpdated();
      } else {
        console.error('Failed to delete persona');
      }
    } catch (error) {
      console.error('Delete persona error:', error);
    }
  };

  const handleAddNewCharacter = async () => {
    if (!newCharacterSeries.trim() || !newCharacterName.trim() || !newCharacterPersona.trim()) {
      return;
    }

    try {
      const response = await fetch('/api/airtable/create-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterName: newCharacterName,
          series: newCharacterSeries,
          persona: newCharacterPersona
        }),
      });

      if (response.ok) {
        onPersonasUpdated();
        setIsAddingCharacter(false);
        setNewCharacterName('');
        setNewCharacterPersona('');
        setNewCharacterSeries('');
      } else {
        console.error('Failed to create character');
      }
    } catch (error) {
      console.error('Create character error:', error);
    }
  };

  return (
    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Character Management
      </h2>

      {/* Series Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filter by Series
        </label>
        <div className="flex gap-2">
          <select
            value={selectedSeries}
            onChange={(e) => onSeriesSelect(e.target.value)}
            disabled={isLoadingPersonas}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a series</option>
            {availableSeries.map((series) => (
              <option key={series} value={series}>
                {series}
              </option>
            ))}
          </select>
          <button
            onClick={() => setIsAddingCharacter(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors whitespace-nowrap"
          >
            + Add Character
          </button>
        </div>
      </div>

      {/* Character Table */}
      {selectedSeries && (
        <div className="mt-4">
          {filteredPersonas.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">
              No characters found for this series
            </p>
          ) : (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Character Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Series
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Persona
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredPersonas.map((record) => {
                    const isEditing = editingPersonaId === record.id;
                    const characterName = String(record.fields.character_name || '');
                    const personaText = String(record.fields.persona || '');
                    const seriesText = String(record.fields.series || '');

                    return (
                      <tr key={record.id}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {characterName}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingPersonaSeries}
                              onChange={(e) => setEditingPersonaSeries(e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <p className="text-sm text-gray-900 dark:text-white">
                              {seriesText}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <textarea
                              value={editingPersonaText}
                              onChange={(e) => setEditingPersonaText(e.target.value)}
                              rows={3}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                              {personaText}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSavePersona(record.id, characterName)}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingPersonaId(null);
                                  setEditingPersonaText('');
                                  setEditingPersonaSeries('');
                                }}
                                className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditPersona(record.id, personaText, seriesText)}
                                className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeletePersona(record.id)}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Character Form */}
      {isAddingCharacter && (
        <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Add New Character
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Series
              </label>
              <input
                type="text"
                value={newCharacterSeries}
                onChange={(e) => setNewCharacterSeries(e.target.value)}
                placeholder="Enter series name"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Character Name
              </label>
              <input
                type="text"
                value={newCharacterName}
                onChange={(e) => setNewCharacterName(e.target.value)}
                placeholder="Enter character name"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Persona
              </label>
              <textarea
                value={newCharacterPersona}
                onChange={(e) => setNewCharacterPersona(e.target.value)}
                placeholder="Enter character persona"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddNewCharacter}
                disabled={!newCharacterSeries.trim() || !newCharacterName.trim() || !newCharacterPersona.trim()}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Character
              </button>
              <button
                onClick={() => {
                  setIsAddingCharacter(false);
                  setNewCharacterName('');
                  setNewCharacterPersona('');
                  setNewCharacterSeries('');
                }}
                className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
