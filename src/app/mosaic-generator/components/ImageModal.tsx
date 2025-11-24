'use client';

import React from 'react';

interface ImageModalProps {
  imageUrl: string | null;
  title: string;
  onClose: () => void;
}

export function ImageModal({ imageUrl, title, onClose }: ImageModalProps) {
  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2 z-10"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {title && (
          <div className="absolute top-4 left-4 text-white bg-black bg-opacity-50 px-4 py-2 rounded-lg z-10">
            <p className="font-semibold">{title}</p>
          </div>
        )}
        <img
          src={imageUrl}
          alt={title}
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
