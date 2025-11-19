'use client';

import React from 'react';

interface ExampleItem {
  title: string;
  beforeImage: string;
  afterImage: string;
  imageName: string;
}

interface ExamplesSectionProps {
  onExampleClick?: (imageUrl: string, imageName: string) => void;
}

export function ExamplesSection({ onExampleClick }: ExamplesSectionProps) {
  const examples: ExampleItem[] = [
    {
      title: 'Female',
      beforeImage: '/data/mosaic_ex/before/female_before_ex.png',
      afterImage: '/data/mosaic_ex/after/female_after_ex.png',
      imageName: 'female_before_ex.png'
    },
    {
      title: 'Male',
      beforeImage: '/data/mosaic_ex/before/male_before_ex.png',
      afterImage: '/data/mosaic_ex/after/male_after_ex.png',
      imageName: 'male_before_ex.png'
    },
    {
      title: 'Inserted',
      beforeImage: '/data/mosaic_ex/before/inserted_before_ex.png',
      afterImage: '/data/mosaic_ex/after/inserted_after_ex.png',
      imageName: 'inserted_before_ex.png'
    },
    {
      title: 'Both',
      beforeImage: '/data/mosaic_ex/before/both_before_ex.png',
      afterImage: '/data/mosaic_ex/after/both_after_ex.png',
      imageName: 'both_before_ex.png'
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          예제
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          💡 &quot;이전&quot; 이미지를 클릭하거나 드래그하여 테스트하세요!
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {examples.map((example) => (
          <div key={example.title} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {example.title}
            </h4>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">Before</p>
                <div
                  className="border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                  onClick={() => onExampleClick?.(example.beforeImage, example.imageName)}
                >
                  <img
                    src={example.beforeImage}
                    alt={`${example.title} Before`}
                    className="w-full h-auto object-contain"
                    style={{ maxHeight: '200px' }}
                    draggable="true"
                    onDragStart={(e) => {
                      e.dataTransfer.setData('imageUrl', example.beforeImage);
                      e.dataTransfer.setData('imageName', example.imageName);
                    }}
                  />
                </div>
              </div>
              <div className="text-2xl text-gray-600 dark:text-gray-400 font-bold flex-shrink-0">
                &gt;
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">After</p>
                <div className="border-2 border-green-500 dark:border-green-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                  <img
                    src={example.afterImage}
                    alt={`${example.title} After`}
                    className="w-full h-auto object-contain"
                    style={{ maxHeight: '200px' }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
