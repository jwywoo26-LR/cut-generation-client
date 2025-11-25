'use client';

import React from 'react';

interface ImageViewerProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function ImageViewer({ imageUrl, onClose }: ImageViewerProps) {
  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black/50 hover:bg-black/70 p-2 rounded-lg"
        title="Close"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <img
        src={imageUrl}
        alt="Expanded view"
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
