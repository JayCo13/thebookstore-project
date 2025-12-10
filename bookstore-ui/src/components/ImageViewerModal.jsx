'use client';

import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ImageViewerModal({ isOpen, onClose, images = [], title }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setIndex(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex((p) => Math.max(0, p - 1));
      if (e.key === 'ArrowRight') setIndex((p) => Math.min(images.length - 1, p + 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, images.length, onClose]);

  if (!isOpen || images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75">
      <div className="relative max-w-4xl w-full mx-4">
        <div className="flex items-center justify-between p-4 bg-white rounded-t-lg">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{title || 'Xem ảnh'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="relative bg-white">
          <img src={images[index]} alt="Book" className="w-full max-h-[70vh] object-contain" />
          {images.length > 1 && (
            <>
              <button
                onClick={() => setIndex((p) => Math.max(0, p - 1))}
                disabled={index === 0}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow disabled:opacity-50"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => setIndex((p) => Math.min(images.length - 1, p + 1))}
                disabled={index === images.length - 1}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow disabled:opacity-50"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
        <div className="bg-white rounded-b-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{index + 1} / {images.length}</span>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto max-w-md">
                {images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    className={`flex-shrink-0 w-12 h-16 border-2 rounded overflow-hidden ${i === index ? 'border-[#008080]' : 'border-gray-300'}`}
                  >
                    <img src={src} alt="thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}