'use client';

import { useState } from 'react';
import Link from 'next/link';

type TabType = 'client' | 'tools';

interface PageItem {
  title: string;
  description: string;
  path: string;
  icon: string;
  color: string;
  hoverColor: string;
}

export default function HomeIndexPage() {
  const [activeTab, setActiveTab] = useState<TabType>('tools');

  const clientPages: PageItem[] = [
    {
      title: 'Layer Extractor',
      description: 'Extract and process PSD layers (password protected)',
      path: '/layer-extractor',
      icon: '🔧',
      color: 'from-purple-500 to-purple-600',
      hoverColor: 'hover:from-purple-600 hover:to-purple-700'
    },
    {
      title: 'Mosaic Tester',
      description: 'Test and validate mosaic detection and processing algorithms',
      path: '/mosaic-tester',
      icon: '🔍',
      color: 'from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700'
    }
  ];

  const toolsPages: PageItem[] = [
    {
      title: 'Dashboard V2',
      description: 'Character reference management with prompt and image generation',
      path: '/dashboard-v2',
      icon: '🎨',
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700'
    },
    {
      title: 'Mosaic Generator',
      description: 'Generate mosaic-free images with advanced model selection',
      path: '/mosaic-generator',
      icon: '⚙️',
      color: 'from-orange-500 to-orange-600',
      hoverColor: 'hover:from-orange-600 hover:to-orange-700'
    },
    {
      title: 'Translator',
      description: 'Korean to Japanese translation with multiple styles',
      path: '/translator',
      icon: '🌐',
      color: 'from-pink-500 to-pink-600',
      hoverColor: 'hover:from-pink-600 hover:to-pink-700'
    },
    {
      title: 'Image Editor',
      description: 'Edit images with AI-powered transformations (password protected)',
      path: '/image-editor',
      icon: '✨',
      color: 'from-indigo-500 to-indigo-600',
      hoverColor: 'hover:from-indigo-600 hover:to-indigo-700'
    },
    {
      title: 'Character Training',
      description: 'Train and fine-tune character models for generation',
      path: '/character-training',
      icon: '🧠',
      color: 'from-teal-500 to-teal-600',
      hoverColor: 'hover:from-teal-600 hover:to-teal-700'
    },
    {
      title: 'Sound Effect',
      description: 'Generate and manage sound effects for manhwa',
      path: '/sound-effect',
      icon: '🔊',
      color: 'from-amber-500 to-amber-600',
      hoverColor: 'hover:from-amber-600 hover:to-amber-700'
    },
    {
      title: 'NSFW DB Manager',
      description: 'Manage NSFW database records and perform data operations',
      path: '/nsfw-db-manager',
      icon: '🗄️',
      color: 'from-slate-500 to-slate-600',
      hoverColor: 'hover:from-slate-600 hover:to-slate-700'
    },
    {
      title: 'Crawler',
      description: 'Web crawler for collecting and processing content',
      path: '/crawler',
      icon: '🕷️',
      color: 'from-red-500 to-red-600',
      hoverColor: 'hover:from-red-600 hover:to-red-700'
    }
  ];

  const currentPages = activeTab === 'client' ? clientPages : toolsPages;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Manhwa Generation Tools
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
            Select a tool to get started
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
              activeTab === 'tools'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Tools
          </button>
          <button
            onClick={() => setActiveTab('client')}
            className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
              activeTab === 'client'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Client
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`grid gap-6 ${
          activeTab === 'client'
            ? 'grid-cols-1 md:grid-cols-2'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
        }`}>
          {currentPages.map((page) => (
            <Link
              key={page.path}
              href={page.path}
              className="group"
            >
              <div className={`
                relative h-64 rounded-2xl shadow-xl transition-all duration-300 transform
                bg-gradient-to-br ${page.color} ${page.hoverColor}
                hover:scale-105 hover:shadow-2xl
                overflow-hidden
              `}>
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }}></div>
                </div>

                {/* Content */}
                <div className="relative h-full flex flex-col items-center justify-center p-8 text-white">
                  <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                    {page.icon}
                  </div>
                  <h2 className="text-3xl font-bold mb-3 text-center">
                    {page.title}
                  </h2>
                  <p className="text-white/90 text-center text-sm max-w-md">
                    {page.description}
                  </p>

                  {/* Arrow Icon */}
                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 dark:text-gray-400 text-sm">
          <p>Manhwa Generation Tools v0.1.0</p>
        </div>
      </div>
    </div>
  );
}
