'use client';

import { useState } from 'react';

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface TranslationRecordsProps {
  selectedTable: string;
  selectedSeries: string;
  records: AirtableRecord[];
  filteredPersonas: AirtableRecord[];
  isLoadingRecords: boolean;
  onRecordsUpdated: () => void;
  onRecordUpdatedLocally: (recordId: string, updatedFields: Record<string, unknown>) => void;
}

export default function TranslationRecords({
  selectedTable,
  selectedSeries,
  records,
  filteredPersonas,
  isLoadingRecords,
  onRecordsUpdated,
  onRecordUpdatedLocally,
}: TranslationRecordsProps) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState('');
  const [isBatchTranslating, setIsBatchTranslating] = useState(false);
  const [batchTranslationProgress, setBatchTranslationProgress] = useState<string>('');
  const [editingKoreanId, setEditingKoreanId] = useState<string | null>(null);
  const [editingKoreanText, setEditingKoreanText] = useState<string>('');
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [editingCharacterName, setEditingCharacterName] = useState<string>('');
  const [updatingStatusRecordId, setUpdatingStatusRecordId] = useState<string | null>(null);

  const handleAddRecord = async () => {
    if (!selectedTable) {
      setTranslationError('Please select a table');
      return;
    }

    setIsTranslating(true);
    setTranslationError('');

    try {
      const uniqueId = `trans_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const response = await fetch('/api/airtable/create-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: selectedTable,
          fields: {
            id: uniqueId,
            kor: '',
            jpn_formal: '',
            jpn_friendly: '',
            jpn_casual: '',
            jpn_narrative: '',
            character_name: '',
            regenerate_status: 'true'
          }
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await onRecordsUpdated();
      } else {
        setTranslationError(data.error || 'Failed to create record');
      }
    } catch (error) {
      setTranslationError('Failed to add record. Please try again.');
      console.error('Add record error:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const translateText = async (
    text: string,
    style: 'formal' | 'friendly' | 'casual' | 'narrative',
    characterName: string
  ): Promise<string> => {
    // Only look for persona if character name is provided
    let persona = '';
    if (characterName && characterName.trim()) {
      const personaRecord = filteredPersonas.find(
        p => String(p.fields.character_name || '') === characterName
      );
      persona = personaRecord ? String(personaRecord.fields.persona || '') : '';
    }

    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        koreanText: text,
        persona: persona,
        targetStyle: style
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation failed for ${style}`);
    }

    const data = await response.json();
    return data.translatedText;
  };

  const handleBatchTranslation = async () => {
    if (!selectedTable) {
      setTranslationError('Please select a table');
      return;
    }

    const recordsToTranslate = records.filter(record => {
      const koreanText = String(record.fields.kor || '').trim();
      const regenerateStatus = String(record.fields.regenerate_status || '');
      return koreanText && (regenerateStatus === 'true' || regenerateStatus === '');
    });

    if (recordsToTranslate.length === 0) {
      setTranslationError('No records to translate. Please add Korean text to records in Airtable.');
      return;
    }

    setIsBatchTranslating(true);
    setTranslationError('');
    setBatchTranslationProgress(`Starting translation of ${recordsToTranslate.length} records...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < recordsToTranslate.length; i++) {
      const record = recordsToTranslate[i];
      const koreanText = String(record.fields.kor || '');
      const characterName = String(record.fields.character_name || '');

      try {
        setBatchTranslationProgress(`Translating record ${i + 1}/${recordsToTranslate.length}...`);

        // Translate sequentially with delays to avoid rate limits (10 requests/min for gemini-2.0-flash-exp)
        // Add 7-second delay between each API call to stay under 10 requests/min
        const translations = [];

        translations.push(await translateText(koreanText, 'formal', characterName));
        await new Promise(resolve => setTimeout(resolve, 7000)); // 7 second delay

        translations.push(await translateText(koreanText, 'friendly', characterName));
        await new Promise(resolve => setTimeout(resolve, 7000)); // 7 second delay

        translations.push(await translateText(koreanText, 'casual', characterName));
        await new Promise(resolve => setTimeout(resolve, 7000)); // 7 second delay

        translations.push(await translateText(koreanText, 'narrative', characterName));

        const response = await fetch('/api/airtable/update-record', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableName: selectedTable,
            recordId: record.id,
            fields: {
              jpn_formal: translations[0],
              jpn_friendly: translations[1],
              jpn_casual: translations[2],
              jpn_narrative: translations[3],
              regenerate_status: 'false'
            }
          }),
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
          console.error(`Failed to update record ${record.id}`);
        }
      } catch (error) {
        failCount++;
        console.error(`Translation error for record ${record.id}:`, error);
      }
    }

    await onRecordsUpdated();
    setIsBatchTranslating(false);
    setBatchTranslationProgress('');

    if (failCount === 0) {
      setTranslationError('');
      alert(`Successfully translated ${successCount} records!`);
    } else {
      setTranslationError(`Translated ${successCount} records, ${failCount} failed.`);
    }
  };

  const handleEditKorean = (recordId: string, currentText: string) => {
    setEditingKoreanId(recordId);
    setEditingKoreanText(currentText);
  };

  const handleSaveKorean = async (recordId: string) => {
    try {
      const response = await fetch('/api/airtable/update-record', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: selectedTable,
          recordId: recordId,
          fields: {
            kor: editingKoreanText,
            regenerate_status: 'true'
          }
        }),
      });

      if (response.ok) {
        // Update locally without refetching all records
        onRecordUpdatedLocally(recordId, {
          kor: editingKoreanText,
          regenerate_status: 'true'
        });
        setEditingKoreanId(null);
        setEditingKoreanText('');
      } else {
        console.error('Failed to update Korean text');
      }
    } catch (error) {
      console.error('Update Korean text error:', error);
    }
  };

  const handleEditCharacter = (recordId: string, currentCharacter: string) => {
    setEditingCharacterId(recordId);
    setEditingCharacterName(currentCharacter);
  };

  const handleSaveCharacter = async (recordId: string) => {
    try {
      const response = await fetch('/api/airtable/update-record', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: selectedTable,
          recordId: recordId,
          fields: {
            character_name: editingCharacterName
          }
        }),
      });

      if (response.ok) {
        // Update locally without refetching all records
        onRecordUpdatedLocally(recordId, {
          character_name: editingCharacterName
        });
        setEditingCharacterId(null);
        setEditingCharacterName('');
      } else {
        console.error('Failed to update character name');
      }
    } catch (error) {
      console.error('Update character name error:', error);
    }
  };

  const handleStatusChange = async (recordId: string, newStatus: string) => {
    setUpdatingStatusRecordId(recordId);

    try {
      const response = await fetch('/api/airtable/update-record', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: selectedTable,
          recordId: recordId,
          fields: {
            regenerate_status: newStatus
          }
        }),
      });

      if (response.ok) {
        // Update locally without refetching all records
        onRecordUpdatedLocally(recordId, {
          regenerate_status: newStatus
        });
      } else {
        console.error('Failed to update regenerate status');
      }
    } catch (error) {
      console.error('Update regenerate status error:', error);
    } finally {
      setUpdatingStatusRecordId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Translation Records
      </h2>

      {!selectedTable ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          Please select a table to view records
        </p>
      ) : (
        <>
          {/* Add Record Section */}
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={handleAddRecord}
              disabled={isTranslating || isBatchTranslating}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              + Add New Record
            </button>
            <button
              onClick={handleBatchTranslation}
              disabled={isTranslating || isBatchTranslating || records.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isBatchTranslating ? 'Translating...' : 'Start Translation'}
            </button>
            {batchTranslationProgress && (
              <p className="text-sm text-blue-600 dark:text-blue-400">{batchTranslationProgress}</p>
            )}
            {translationError && (
              <p className="text-sm text-red-600 dark:text-red-400">{translationError}</p>
            )}
          </div>

          {/* Records List */}
          {isLoadingRecords ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">Loading records...</p>
          ) : records.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No records yet</p>
          ) : (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">
                      Scene
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">
                      Korean
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">
                      Formal
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">
                      Friendly
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">
                      Casual
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">
                      Narrative
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-40">
                      Character
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                      Regenerate Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {records.map((record, index) => {
                    const regenerateStatus = String(record.fields.regenerate_status || '');
                    const isEditingKorean = editingKoreanId === record.id;
                    const isEditingCharacter = editingCharacterId === record.id;
                    const koreanText = String(record.fields.kor || '');
                    const characterName = String(record.fields.character_name || '');

                    return (
                      <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-semibold text-center">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white align-top">
                          {isEditingKorean ? (
                            <div className="flex flex-col gap-2">
                              <textarea
                                value={editingKoreanText}
                                onChange={(e) => setEditingKoreanText(e.target.value)}
                                rows={5}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveKorean(record.id)}
                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingKoreanId(null);
                                    setEditingKoreanText('');
                                  }}
                                  className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => handleEditKorean(record.id, koreanText)}
                              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-2 rounded min-h-[3rem]"
                            >
                              <div className="whitespace-pre-wrap break-words">{koreanText || 'Click to add Korean text'}</div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white align-top">
                          <div className="whitespace-pre-wrap break-words p-2">{String(record.fields.jpn_formal || '')}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white align-top">
                          <div className="whitespace-pre-wrap break-words p-2">{String(record.fields.jpn_friendly || '')}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white align-top">
                          <div className="whitespace-pre-wrap break-words p-2">{String(record.fields.jpn_casual || '')}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white align-top">
                          <div className="whitespace-pre-wrap break-words p-2">{String(record.fields.jpn_narrative || '')}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white align-top">
                          {isEditingCharacter ? (
                            <div className="flex flex-col gap-2">
                              <select
                                value={editingCharacterName}
                                onChange={(e) => setEditingCharacterName(e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select character</option>
                                {selectedSeries && filteredPersonas.map((persona) => (
                                  <option key={persona.id} value={String(persona.fields.character_name || '')}>
                                    {String(persona.fields.character_name || '')}
                                  </option>
                                ))}
                              </select>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveCharacter(record.id)}
                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCharacterId(null);
                                    setEditingCharacterName('');
                                  }}
                                  className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => handleEditCharacter(record.id, characterName)}
                              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-2 rounded min-h-[2rem]"
                            >
                              {characterName || 'Click to select'}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <select
                            value={regenerateStatus}
                            onChange={(e) => handleStatusChange(record.id, e.target.value)}
                            disabled={updatingStatusRecordId === record.id}
                            className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            <option value=""></option>
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
