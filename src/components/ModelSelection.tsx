'use client';

import Image from 'next/image';

interface Model {
  id: string;
  name: string;
  thumbnail: string;
  description?: string;
}

// Sample custom trained models - replace with your actual models from your service
const models: Model[] = [
  {
    id: 'train-dfa3f57e398645098c8ffee40446639b',
    name: '현수아',
    thumbnail: '/data/thumbnails/suahyun_1.png',
    description: 'Trained on anime characters'
  },
  {
    id: 'train-4331de6cf53d430795deb09fe9728f16', 
    name: '임수아',
    thumbnail: '/data/thumbnails/sualim.png',
    description: 'Fantasy character style'
  },
  {
    id: 'train-7f9911080f9e479198be762001437b16',
    name: '신서연',
    thumbnail: '/data/thumbnails/seoyeonshin.png',
    description: 'Realistic modern portraits'
  },
];

interface ModelSelectionProps {
  selectedModelId?: string;
  onModelSelect: (modelId: string) => void;
}

export default function ModelSelection({ selectedModelId, onModelSelect }: ModelSelectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Model Selection
      </h2>
      
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
        {models.map((model) => (
          <div
            key={model.id}
            onClick={() => onModelSelect(model.id)}
            className={`
              cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md flex-shrink-0 w-48
              ${selectedModelId === model.id 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }
            `}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <Image
                src={model.thumbnail}
                alt={model.name}
                width={256}
                height={256}
                className="w-64 h-64 rounded-md object-cover"
              />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                  {model.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ID: {model.id.slice(0, 12)}...
                </p>
                {model.description && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {model.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>
      
      {selectedModelId && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Selected Model ID: <span className="font-mono font-medium">{selectedModelId}</span>
          </p>
        </div>
      )}
    </div>
  );
}