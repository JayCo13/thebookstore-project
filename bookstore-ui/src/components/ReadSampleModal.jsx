import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const ReadSampleModal = ({ isOpen, onClose, sampleImages, bookTitle }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentImageIndex(0);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentImageIndex]);

  const goToNext = () => {
    if (sampleImages && currentImageIndex < sampleImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  if (!isOpen || !sampleImages || sampleImages.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative max-w-4xl max-h-[90vh] w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white rounded-t-lg">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Read Sample</h2>
            <p className="text-sm text-gray-600">{bookTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Container */}
        <div className="relative bg-white">
          <img
            src={sampleImages[currentImageIndex]}
            alt={`Sample page ${currentImageIndex + 1}`}
            className="w-full max-h-[70vh] object-contain"
          />

          {/* Navigation Arrows */}
          {sampleImages.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                disabled={currentImageIndex === 0}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={goToNext}
                disabled={currentImageIndex === sampleImages.length - 1}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Footer with page indicator and thumbnails */}
        <div className="bg-white rounded-b-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Page {currentImageIndex + 1} of {sampleImages.length}
            </span>

            {/* Thumbnail navigation */}
            {sampleImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto max-w-md">
                {sampleImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-12 h-16 border-2 rounded overflow-hidden transition-all ${index === currentImageIndex
                        ? 'border-[#008080] shadow-md'
                        : 'border-gray-300 hover:border-gray-400'
                      }`}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadSampleModal;