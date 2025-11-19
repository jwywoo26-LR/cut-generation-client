'use client';

import React, { useState } from 'react';

interface ExampleItem {
  title: string;
  imagePath: string;
  imageName: string;
}

interface ExamplesSectionProps {
  onExampleClick?: (imageUrl: string, imageName: string) => void;
}

export function ExamplesSection({ onExampleClick }: ExamplesSectionProps) {
  const [isBlurred, setIsBlurred] = useState(true);

  const examples: ExampleItem[] = [
    {
      title: 'Both 01',
      imagePath: '/data/mosaic_ex/inputs/before_both_01.png',
      imageName: 'before_both_01.png'
    },
    {
      title: 'Female 01',
      imagePath: '/data/mosaic_ex/inputs/before_female_01.png',
      imageName: 'before_female_01.png'
    },
    {
      title: 'Female 02',
      imagePath: '/data/mosaic_ex/inputs/before_female_02.png',
      imageName: 'before_female_02.png'
    },
    {
      title: 'Inserted 01',
      imagePath: '/data/mosaic_ex/inputs/before_inserted_01.png',
      imageName: 'before_inserted_01.png'
    },
    {
      title: 'Inserted 02',
      imagePath: '/data/mosaic_ex/inputs/before_inserted_02.png',
      imageName: 'before_inserted_02.png'
    },
    {
      title: 'Inserted 03',
      imagePath: '/data/mosaic_ex/inputs/before_inserted_03.png',
      imageName: 'before_inserted_03.png'
    },
    {
      title: 'Male 01',
      imagePath: '/data/mosaic_ex/inputs/before_male_01.png',
      imageName: 'before_male_01.png'
    },
    {
      title: 'Male 02',
      imagePath: '/data/mosaic_ex/inputs/before_male_02.png',
      imageName: 'before_male_02.png'
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            예제
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            💡 이미지를 클릭하거나 드래그하여 테스트하세요!
          </p>
        </div>
        <button
          onClick={() => setIsBlurred(!isBlurred)}
          className="ml-4 px-3 py-1.5 text-xs font-medium rounded-lg border-2 transition-colors flex-shrink-0"
          style={{
            borderColor: isBlurred ? '#9CA3AF' : '#3B82F6',
            backgroundColor: isBlurred ? '#F3F4F6' : '#3B82F6',
            color: isBlurred ? '#4B5563' : '#FFFFFF'
          }}
        >
          {isBlurred ? '보기' : '숨기기'}
        </button>
      </div>

      {/* Horizontally scrollable container with blur overlay */}
      <div className="relative">
        <div className="overflow-x-auto">
          <div className="flex gap-4 pb-4">
            {examples.map((example) => (
              <div
                key={example.imageName}
                className="flex-shrink-0 border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors flex items-center justify-center"
                style={{ width: '200px', height: '250px' }}
                onClick={() => onExampleClick?.(example.imagePath, example.imageName)}
              >
                <img
                  src={example.imagePath}
                  alt={example.title}
                  className="max-w-full max-h-full object-contain"
                  draggable="true"
                  onDragStart={(e) => {
                    e.dataTransfer.setData('imageUrl', example.imagePath);
                    e.dataTransfer.setData('imageName', example.imageName);
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Blur overlay */}
        {isBlurred && (
          <div
            className="absolute inset-0 backdrop-blur-xl bg-white/30 dark:bg-gray-800/30 rounded-lg flex items-center justify-center cursor-pointer"
            onClick={() => setIsBlurred(false)}
          >
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                클릭하여 예제 보기
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
