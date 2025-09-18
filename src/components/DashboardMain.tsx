'use client';

import { useState } from 'react';
import {
  DashboardOverview,
  PromptGeneration,
  InitialImageGeneration
} from './dashboard';
import EditedPromptImageGeneration from './dashboard/EditedPromptImageGeneration';

type TabType = 'dashboard' | 'prompt_gen' | 'initial_img_gen' | 'edited_img_gen';

interface DashboardProps {
  currentTable?: string;
  onPromptGenerated?: () => void;
  records?: Array<{
    id: string;
    fields: Record<string, unknown>;
  }>;
}

export default function DashboardMain({ currentTable, onPromptGenerated, records = [] }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: '📊' },
    { id: 'prompt_gen' as TabType, label: 'Prompt Generation', icon: '✍️' },
    { id: 'initial_img_gen' as TabType, label: 'Initial Image Gen', icon: '🎨' },
    { id: 'edited_img_gen' as TabType, label: 'Edited Image Gen', icon: '✨' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'prompt_gen':
        return <PromptGeneration currentTable={currentTable} onPromptGenerated={onPromptGenerated} />;
      case 'initial_img_gen':
        return <InitialImageGeneration currentTable={currentTable} onImagesGenerated={onPromptGenerated} records={records} />;
      case 'edited_img_gen':
        return <EditedPromptImageGeneration currentTable={currentTable} onImagesGenerated={onPromptGenerated} records={records} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
                }
              `}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {renderTabContent()}
      </div>
    </div>
  );
}