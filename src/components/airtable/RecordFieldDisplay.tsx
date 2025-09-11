'use client';

import Image from 'next/image';

interface RecordFieldDisplayProps {
  fieldKey: string;
  value: unknown;
}

export default function RecordFieldDisplay({ fieldKey, value }: RecordFieldDisplayProps) {
  const renderFieldValue = () => {
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
                width={48}
                height={48}
                className="w-12 h-12 rounded object-cover"
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
          width={48}
          height={48}
          className="w-12 h-12 rounded object-cover"
        />
      );
    } else {
      // Handle text and other values
      return (
        <span className="break-words">
          {String(value).length > 100 
            ? `${String(value).slice(0, 100)}...` 
            : String(value)
          }
        </span>
      );
    }
  };

  return (
    <div className="mb-2">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
        {fieldKey}:
      </span>
      <div className="text-sm text-gray-900 dark:text-white mt-1">
        {renderFieldValue()}
      </div>
    </div>
  );
}