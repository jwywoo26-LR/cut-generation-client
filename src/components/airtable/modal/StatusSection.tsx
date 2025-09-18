'use client';

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

interface StatusSectionProps {
  record: AirtableRecord;
  onSave: (recordId: string, fieldKey: string, newValue: string) => Promise<void>;
}

export default function StatusSection({
  record,
  onSave
}: StatusSectionProps) {
  const resultStatus = String(record.fields['result_status'] || '');
  const canRegenerate = resultStatus.endsWith('_generated');
  const isRegenerating = record.fields['regeneration_status'] === true;
  
  const handleToggleRegeneration = async () => {
    const newValue = !isRegenerating;
    await onSave(record.id, 'regeneration_status', String(newValue));
  };
  
  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Regeneration</h3>
      <div className="flex items-center gap-4">
        <button
          onClick={handleToggleRegeneration}
          disabled={!canRegenerate}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isRegenerating
              ? 'bg-blue-600'
              : 'bg-gray-200 dark:bg-gray-700'
          } ${
            !canRegenerate 
              ? 'opacity-50 cursor-not-allowed' 
              : 'cursor-pointer'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isRegenerating ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {isRegenerating ? 'Regenerate' : 'Done'}
        </span>
        {!canRegenerate && (
          <span className="text-xs text-gray-400">
            (Available only when result status ends with &quot;_generated&quot;)
          </span>
        )}
      </div>
    </div>
  );
}