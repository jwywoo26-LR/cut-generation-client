'use client';

import React, { useState } from 'react';

export interface CategoryAdjustment {
  recommendations: string[];
  removals: string[];
  description: string;
}

export interface StyleRule {
  id: string;
  rowStart: number;
  rowEnd: number;
  subject?: CategoryAdjustment;
  facial_expression?: CategoryAdjustment;
  clothing?: CategoryAdjustment;
  nudity?: CategoryAdjustment;
  angle?: CategoryAdjustment;
  action?: CategoryAdjustment;
  objects?: CategoryAdjustment;
  background?: CategoryAdjustment;
}

const CATEGORIES = [
  'subject',
  'facial_expression',
  'clothing',
  'nudity',
  'angle',
  'action',
  'objects',
  'background'
] as const;

type CategoryName = typeof CATEGORIES[number];

interface StyleRulesConfigProps {
  styleRules: StyleRule[];
  onStyleRulesChange: (rules: StyleRule[]) => void;
  maxRows: number;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function createEmptyRule(maxRows: number): StyleRule {
  return {
    id: generateId(),
    rowStart: 1,
    rowEnd: maxRows || 10,
  };
}

function TagInput({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}) {
  const [localValue, setLocalValue] = useState(value.join(', '));

  // Update local value when prop changes (e.g., from parent reset)
  React.useEffect(() => {
    setLocalValue(value.join(', '));
  }, [value]);

  const handleBlur = () => {
    const tags = localValue.split(',').map(s => s.trim()).filter(Boolean);
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
        className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-800 dark:border-gray-600"
      />
    </div>
  );
}

function CategoryEditor({
  category,
  adjustment,
  onChange,
  onRemove
}: {
  category: CategoryName;
  adjustment: CategoryAdjustment;
  onChange: (adj: CategoryAdjustment) => void;
  onRemove: () => void;
}) {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
          {category.replace('_', ' ')}
        </span>
        <button
          onClick={onRemove}
          className="text-red-500 hover:text-red-700 text-xs"
        >
          Remove
        </button>
      </div>

      <div className="space-y-2">
        <TagInput
          label="Recommendations (comma-separated)"
          value={adjustment.recommendations}
          onChange={(tags) => onChange({ ...adjustment, recommendations: tags })}
          placeholder="long hair, school uniform, smiling"
        />

        <TagInput
          label="Removals (comma-separated)"
          value={adjustment.removals}
          onChange={(tags) => onChange({ ...adjustment, removals: tags })}
          placeholder="short hair, casual clothes"
        />

        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Description (AI guidance)</label>
          <textarea
            value={adjustment.description}
            onChange={(e) => onChange({
              ...adjustment,
              description: e.target.value
            })}
            placeholder="Describe what this adjustment should do..."
            rows={2}
            className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-800 dark:border-gray-600"
          />
        </div>
      </div>
    </div>
  );
}

function RuleEditor({
  rule,
  onChange,
  onRemove,
  maxRows
}: {
  rule: StyleRule;
  onChange: (rule: StyleRule) => void;
  onRemove: () => void;
  maxRows: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryName | ''>('');

  const activeCategories = CATEGORIES.filter(cat => rule[cat] !== undefined);

  const addCategory = () => {
    if (!selectedCategory) return;

    onChange({
      ...rule,
      [selectedCategory]: {
        recommendations: [],
        removals: [],
        description: ''
      }
    });
    setSelectedCategory('');
  };

  const removeCategory = (category: CategoryName) => {
    const newRule = { ...rule };
    delete newRule[category];
    onChange(newRule);
  };

  const updateCategory = (category: CategoryName, adjustment: CategoryAdjustment) => {
    onChange({
      ...rule,
      [category]: adjustment
    });
  };

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
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({activeCategories.length} categories)
          </span>
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

          {/* Active Categories */}
          <div className="space-y-2">
            {activeCategories.map(category => (
              <CategoryEditor
                key={category}
                category={category}
                adjustment={rule[category]!}
                onChange={(adj) => updateCategory(category, adj)}
                onRemove={() => removeCategory(category)}
              />
            ))}
          </div>

          {/* Add Category */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-600">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as CategoryName | '')}
              className="flex-1 px-2 py-1 text-xs border rounded dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="">Select category to add...</option>
              {CATEGORIES.filter(cat => rule[cat] === undefined).map(cat => (
                <option key={cat} value={cat}>
                  {cat.replace('_', ' ')}
                </option>
              ))}
            </select>
            <button
              onClick={addCategory}
              disabled={!selectedCategory}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Add Category
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function StyleRulesConfig({ styleRules, onStyleRulesChange, maxRows }: StyleRulesConfigProps) {
  const addRule = () => {
    onStyleRulesChange([...styleRules, createEmptyRule(maxRows)]);
  };

  const updateRule = (index: number, rule: StyleRule) => {
    const newRules = [...styleRules];
    newRules[index] = rule;
    onStyleRulesChange(newRules);
  };

  const removeRule = (index: number) => {
    onStyleRulesChange(styleRules.filter((_, i) => i !== index));
  };

  const clearAllRules = () => {
    if (confirm('Are you sure you want to clear all style rules?')) {
      onStyleRulesChange([]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Style Rules ({styleRules.length})
        </h4>
        <div className="flex gap-2">
          {styleRules.length > 0 && (
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
      {styleRules.length === 0 ? (
        <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          No style rules configured. Click &quot;Add Rule&quot; to create one.
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {styleRules.map((rule, index) => (
            <RuleEditor
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
      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
        <strong>Tip:</strong> Rules are applied in order. You can have multiple rules for the same rows - they will be combined.
        Use &quot;description&quot; to give AI context about what the adjustment should achieve.
      </div>
    </div>
  );
}
