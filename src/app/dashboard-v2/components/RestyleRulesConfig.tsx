'use client';

import React, { useState } from 'react';

export interface RestyleRule {
  id: string;
  rowStart: number;
  rowEnd: number;
  suggestedTags: string[];
  notSuggestedTags: string[];
  removeTags: string[];
  context: string;
}

interface RestyleRulesConfigProps {
  restyleRules: RestyleRule[];
  onRestyleRulesChange: (rules: RestyleRule[]) => void;
  fromColumn: string;
  toColumn: string;
  onFromColumnChange: (column: string) => void;
  onToColumnChange: (column: string) => void;
  maxRows: number;
}

// Available prompt columns
const PROMPT_COLUMNS = [
  'initial_prompt',
  'restyled_prompt',
  'edit_prompt',
] as const;

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function createEmptyRule(maxRows: number): RestyleRule {
  return {
    id: generateId(),
    rowStart: 1,
    rowEnd: maxRows || 10,
    suggestedTags: [],
    notSuggestedTags: [],
    removeTags: [],
    context: '',
  };
}

function TagInput({
  label,
  value,
  onChange,
  placeholder,
  colorClass = 'border-gray-300 dark:border-gray-600',
}: {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  colorClass?: string;
}) {
  const [localValue, setLocalValue] = useState(value.join(', '));

  React.useEffect(() => {
    setLocalValue(value.join(', '));
  }, [value]);

  const handleBlur = () => {
    const tags = localValue
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    onChange(tags);
  };

  return (
    <div>
      <label className="text-xs text-gray-500 dark:text-gray-400">{label}</label>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`w-full px-2 py-1 text-xs border rounded dark:bg-gray-800 ${colorClass}`}
      />
    </div>
  );
}

function RestyleRuleEditor({
  rule,
  onChange,
  onRemove,
  maxRows,
}: {
  rule: RestyleRule;
  onChange: (rule: RestyleRule) => void;
  onRemove: () => void;
  maxRows: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasContent =
    rule.suggestedTags.length > 0 ||
    rule.notSuggestedTags.length > 0 ||
    rule.removeTags.length > 0 ||
    rule.context.trim() !== '';

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      {/* Rule Header */}
      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Rows {rule.rowStart} - {rule.rowEnd}
          {hasContent && (
            <span className="text-xs text-green-600 dark:text-green-400">(configured)</span>
          )}
        </button>
        <button
          onClick={onRemove}
          className="px-2 py-1 text-xs text-red-600 hover:text-red-800 dark:text-red-400"
        >
          Delete Rule
        </button>
      </div>

      {/* Rule Content */}
      {isExpanded && (
        <div className="p-3 space-y-3">
          {/* Row Range */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">From Row:</label>
              <input
                type="number"
                min={1}
                max={maxRows}
                value={rule.rowStart}
                onChange={(e) => onChange({ ...rule, rowStart: parseInt(e.target.value) || 1 })}
                className="w-16 px-2 py-1 text-xs border rounded dark:bg-gray-800 dark:border-gray-600"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">To Row:</label>
              <input
                type="number"
                min={1}
                max={maxRows}
                value={rule.rowEnd}
                onChange={(e) => onChange({ ...rule, rowEnd: parseInt(e.target.value) || maxRows })}
                className="w-16 px-2 py-1 text-xs border rounded dark:bg-gray-800 dark:border-gray-600"
              />
            </div>
          </div>

          {/* Tag Inputs */}
          <div className="space-y-2">
            <TagInput
              label="Suggested Tags (tags to consider adding)"
              value={rule.suggestedTags}
              onChange={(tags) => onChange({ ...rule, suggestedTags: tags })}
              placeholder="black couch, on couch, indoor"
              colorClass="border-green-300 dark:border-green-700 focus:ring-green-500"
            />

            <TagInput
              label="Not Suggested Tags (tags to avoid)"
              value={rule.notSuggestedTags}
              onChange={(tags) => onChange({ ...rule, notSuggestedTags: tags })}
              placeholder="bed, on bed, outdoor"
              colorClass="border-yellow-300 dark:border-yellow-700 focus:ring-yellow-500"
            />

            <TagInput
              label="Remove Tags (must be removed)"
              value={rule.removeTags}
              onChange={(tags) => onChange({ ...rule, removeTags: tags })}
              placeholder="beard, mustache"
              colorClass="border-red-300 dark:border-red-700 focus:ring-red-500"
            />
          </div>

          {/* Context */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Context (Natural language instructions for AI)
            </label>
            <textarea
              value={rule.context}
              onChange={(e) => onChange({ ...rule, context: e.target.value })}
              placeholder="Describe what this rule should do. E.g., 'Replace any bed-related tags with couch. The scene should be on a black couch, not a bed.'"
              rows={3}
              className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-800 dark:border-gray-600"
            />
            <p className="mt-1 text-xs text-gray-400">
              This context helps the AI understand how to apply the tag changes intelligently.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function RestyleRulesConfig({
  restyleRules,
  onRestyleRulesChange,
  fromColumn,
  toColumn,
  onFromColumnChange,
  onToColumnChange,
  maxRows,
}: RestyleRulesConfigProps) {
  const addRule = () => {
    onRestyleRulesChange([...restyleRules, createEmptyRule(maxRows)]);
  };

  const updateRule = (index: number, rule: RestyleRule) => {
    const newRules = [...restyleRules];
    newRules[index] = rule;
    onRestyleRulesChange(newRules);
  };

  const removeRule = (index: number) => {
    onRestyleRulesChange(restyleRules.filter((_, i) => i !== index));
  };

  const clearAllRules = () => {
    if (confirm('Are you sure you want to clear all restyle rules?')) {
      onRestyleRulesChange([]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Column Configuration */}
      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Column Configuration
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Source Column (read from)
            </label>
            <select
              value={fromColumn}
              onChange={(e) => onFromColumnChange(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
            >
              {PROMPT_COLUMNS.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Destination Column (write to)
            </label>
            <select
              value={toColumn}
              onChange={(e) => onToColumnChange(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
            >
              {PROMPT_COLUMNS.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Prompts will be read from <code className="px-1 bg-gray-200 dark:bg-gray-600 rounded">{fromColumn}</code> and
          restyled results saved to <code className="px-1 bg-gray-200 dark:bg-gray-600 rounded">{toColumn}</code>
        </p>
      </div>

      {/* Rules Section */}
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Restyle Rules ({restyleRules.length})
          </h4>
          <div className="flex gap-2">
            {restyleRules.length > 0 && (
              <button
                onClick={clearAllRules}
                className="px-2 py-1 text-xs text-red-600 hover:text-red-800 dark:text-red-400"
              >
                Clear All
              </button>
            )}
            <button
              onClick={addRule}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
            >
              + Add Rule
            </button>
          </div>
        </div>

        {/* Rules List */}
        {restyleRules.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            No restyle rules configured. Click &quot;Add Rule&quot; to create one.
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {restyleRules.map((rule, index) => (
              <RestyleRuleEditor
                key={rule.id}
                rule={rule}
                onChange={(r) => updateRule(index, r)}
                onRemove={() => removeRule(index)}
                maxRows={maxRows}
              />
            ))}
          </div>
        )}

        {/* Info */}
        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-700 dark:text-amber-300">
          <strong>How it works:</strong> Rules are applied to rows in the specified range.
          The AI will analyze each prompt and apply tag changes based on:
          <ul className="mt-1 ml-4 list-disc">
            <li><span className="text-green-600 dark:text-green-400">Suggested tags</span> - Tags to consider adding</li>
            <li><span className="text-yellow-600 dark:text-yellow-400">Not suggested tags</span> - Tags to avoid/discourage</li>
            <li><span className="text-red-600 dark:text-red-400">Remove tags</span> - Tags that must be removed</li>
            <li><span className="text-blue-600 dark:text-blue-400">Context</span> - Natural language instructions for intelligent restyling</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
