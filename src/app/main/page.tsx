'use client';

import Link from 'next/link';

export default function HomeIndexPage() {
  const pages = [
    {
      title: 'Dashboard V2',
      description: 'Character reference management with prompt and image generation',
      path: '/dashboard-v2',
      icon: '🎨',
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700'
    },
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
    }
  ];

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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pages.map((page) => (
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

        {/* Additional Info Section */}
        <div className="mt-16 bg-white dark:bg-gray-800 rounded-xl shadow-md p-8">
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            About These Tools
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 text-gray-600 dark:text-gray-300">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Dashboard V2</h4>
              <ul className="space-y-1 text-sm">
                <li>• Create and manage Airtable tables</li>
                <li>• AI-powered prompt generation</li>
                <li>• Character reference management</li>
                <li>• Draft image generation workflow</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Layer Extractor</h4>
              <ul className="space-y-1 text-sm">
                <li>• Extract layers from PSD files</li>
                <li>• Password-protected access</li>
                <li>• Process multiple files at once</li>
                <li>• Download processed results</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Mosaic Tester</h4>
              <ul className="space-y-1 text-sm">
                <li>• Test mosaic detection algorithms</li>
                <li>• Upload and process test images</li>
                <li>• Validate mosaic removal quality</li>
                <li>• Compare before/after results</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Mosaic Generator</h4>
              <ul className="space-y-1 text-sm">
                <li>• Advanced model selection options</li>
                <li>• Choose mosaic type processing</li>
                <li>• Password-protected access</li>
                <li>• Single image processing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Translator</h4>
              <ul className="space-y-1 text-sm">
                <li>• Korean to Japanese translation</li>
                <li>• Multiple translation styles</li>
                <li>• Persona-based context</li>
                <li>• Airtable integration</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 dark:text-gray-400 text-sm">
          <p>Manhwa Generation Tools v0.1.0</p>
        </div>
      </div>
    </div>
  );
}
