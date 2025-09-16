'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface EditableCellProps {
  value: unknown;
  fieldKey: string;
  recordId: string;
  onSave: (recordId: string, fieldKey: string, newValue: string) => Promise<void>;
  isEditable?: boolean;
  recordFields?: Record<string, unknown>;
  selectedModelInfo?: {
    id: string;
    name: string;
    thumbnail?: string;
  };
  availableModels?: Array<{
    id: string;
    name: string;
    thumbnail?: string;
  }>;
}

export default function EditableCell({ 
  value, 
  fieldKey, 
  recordId, 
  onSave, 
  isEditable = true,
  recordFields = {},
  selectedModelInfo,
  availableModels = []
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleEdit = () => {
    if (!isEditable) return;
    
    // Only allow editing for text values, not images/attachments
    if (typeof value === 'string' && !value.startsWith('http')) {
      setEditValue(String(value));
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (editValue.trim() === String(value)) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(recordId, fieldKey, editValue.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
      // Reset to original value on error
      setEditValue(String(value));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(String(value));
    setIsEditing(false);
  };

  const handleCopyPrompt = async (sourceField: string) => {
    let sourceValue = '';
    
    if (sourceField === 'selectedModel' && selectedModelInfo) {
      sourceValue = selectedModelInfo.id;
    } else {
      sourceValue = String(recordFields[sourceField] || '');
    }
    
    if (sourceValue) {
      setEditValue(sourceValue);
      try {
        await onSave(recordId, fieldKey, sourceValue);
      } catch (error) {
        console.error('Failed to save copied prompt:', error);
      }
    }
  };

  const handleModelSelect = async (modelId: string) => {
    const model = availableModels.find(m => m.id === modelId);
    if (model) {
      // Only save model ID to database field for this specific row
      try {
        await onSave(recordId, fieldKey, modelId);
      } catch (error) {
        console.error('Failed to save selected model:', error);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const renderValue = () => {
    if (Array.isArray(value)) {
      // Handle attachment fields (images)
      return (
        <div className="flex gap-2 flex-wrap">
          {value.map((item: { url?: string; filename?: string }, index) => (
            item.url ? (
              <Image
                key={index}
                src={item.url}
                alt={item.filename || `Attachment ${index + 1}`}
                width={300}
                height={300}
                className="w-75 h-75 rounded object-cover"
                unoptimized={item.url.includes('airtableusercontent.com')}
              />
            ) : (
              <span key={index} className="text-xs text-gray-500">
                {JSON.stringify(item)}
              </span>
            )
          ))}
        </div>
      );
    } else if (typeof value === 'string' && value.startsWith('http')) {
      // Handle single image URLs
      return (
        <Image
          src={value}
          alt={fieldKey}
          width={300}
          height={300}
          className="w-75 h-75 rounded object-cover"
          unoptimized={value.includes('airtableusercontent.com')}
        />
      );
    } else {
      // Handle text and other values
      const isPromptField = fieldKey.toLowerCase().includes('prompt');
      const isEditedPrompt = fieldKey.toLowerCase() === 'edited_prompt';
      const isSelectedCharacters = fieldKey.toLowerCase() === 'selected_characters';
      const isEmpty = !value || String(value).trim() === '';
      
      // Show copy buttons for empty edited_prompt field
      if (isEditedPrompt && isEmpty) {
        const initialPrompt = String(recordFields['initial_prompt'] || '');
        const enhancedPrompt = String(recordFields['enhanced_prompt'] || '');
        
        return (
          <div className="flex flex-col gap-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Copy from:
            </div>
            {initialPrompt && (
              <button
                onClick={() => handleCopyPrompt('initial_prompt')}
                className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 rounded border border-blue-300 dark:border-blue-700 text-left"
              >
                <div className="font-medium">Initial</div>
                <div className="text-xs opacity-75">
                  {initialPrompt.slice(0, 40)}...
                </div>
              </button>
            )}
            {enhancedPrompt && (
              <button
                onClick={() => handleCopyPrompt('enhanced_prompt')}
                className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-800 dark:text-green-200 rounded border border-green-300 dark:border-green-700 text-left"
              >
                <div className="font-medium">Enhanced</div>
                <div className="text-xs opacity-75">
                  {enhancedPrompt.slice(0, 40)}...
                </div>
              </button>
            )}
            {!initialPrompt && !enhancedPrompt && (
              <div 
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-1 py-0.5 rounded text-gray-500 dark:text-gray-400"
                onClick={handleEdit}
              >
                Click to add edited prompt...
              </div>
            )}
          </div>
        );
      }
      
      // Show model info for selected_characters field
      if (isSelectedCharacters) {
        // Check if this row has a saved model selection
        const savedValue = String(value || '').trim();
        let displayModel = selectedModelInfo; // Default to global selection
        
        // If there's a saved value, find the corresponding model by ID
        if (savedValue) {
          const foundModel = availableModels.find(m => m.id === savedValue);
          if (foundModel) {
            displayModel = foundModel;
          }
        }
        
        return (
          <div className="flex flex-col gap-3">
            {displayModel && (
              <div className="flex flex-col items-center gap-2">
                {displayModel.thumbnail && (
                  <Image
                    src={displayModel.thumbnail}
                    alt={displayModel.name}
                    width={150}
                    height={150}
                    className="w-37.5 h-37.5 rounded-md object-cover"
                  />
                )}
                <div className="text-center">
                  <div className="font-medium text-gray-900 dark:text-white text-lg">
                    {displayModel.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
                    {displayModel.id}
                  </div>
                </div>
              </div>
            )}
            
            {availableModels.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 dark:text-gray-400">Choose different model:</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleModelSelect(e.target.value);
                      e.target.value = ''; // Reset dropdown
                    }
                  }}
                  value=""
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select a character...</option>
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        );
      }
      
      const displayValue = isPromptField 
        ? String(value) // Show full text for prompt fields
        : String(value).length > 100 
          ? `${String(value).slice(0, 100)}...` 
          : String(value);
      
      return (
        <div 
          className={`break-words whitespace-pre-wrap ${
            isEditable && !value?.toString().startsWith('http') 
              ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-1 py-0.5 rounded' 
              : ''
          }`}
          onClick={handleEdit}
          title={isEditable ? 'Click to edit' : ''}
        >
          {displayValue}
        </div>
      );
    }
  };

  if (isEditing) {
    const isPromptField = fieldKey.toLowerCase().includes('prompt');
    
    // Calculate dynamic size based on text length
    const textLength = editValue.length;
    const dynamicRows = isPromptField 
      ? Math.max(2, Math.min(12, Math.ceil(textLength / 80) + 1))
      : 1;
    const dynamicWidth = isPromptField 
      ? 'w-full'
      : `w-${Math.max(20, Math.min(96, Math.ceil(textLength / 2) + 10))}`;
    
    return (
      <div className="flex flex-col gap-2">
        {isPromptField ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            disabled={isSaving}
            rows={dynamicRows}
            className="w-full px-3 py-2 text-sm border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 resize-none"
            placeholder="Enter your prompt..."
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            disabled={isSaving}
            className={`px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 ${dynamicWidth}`}
            style={{ minWidth: '120px', width: `${Math.max(120, textLength * 8 + 40)}px` }}
          />
        )}
        {isSaving && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 self-start"></div>
        )}
      </div>
    );
  }

  return (
    <div className="group relative">
      {renderValue()}
      {isEditable && typeof value === 'string' && !value.startsWith('http') && (
        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleEdit}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            ✏️
          </button>
        </div>
      )}
    </div>
  );
}