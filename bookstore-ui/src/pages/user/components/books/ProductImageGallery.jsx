/**
 * Product Image Gallery component
 * Displays a main product image with thumbnails below
 * Clicking a thumbnail updates the main image
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function ProductImageGallery({ images }) {
  // Default to first image or placeholder if no images
  const [selectedImage, setSelectedImage] = useState(
    images && images.length > 0 
      ? images[0].ImageURL 
      : '/assets/placeholder-book.jpg'
  );
  
  // If no images provided, show placeholder
  if (!images || images.length === 0) {
    return (
      <div className="w-full">
        <div className="aspect-[3/4] relative rounded-lg overflow-hidden border border-gray-200 bg-white">
          <Image
            src="/assets/placeholder-book.jpg"
            alt="Hình ảnh sách"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      {/* Main Image */}
      <div className="aspect-[3/4] relative rounded-lg overflow-hidden border border-gray-200 bg-white mb-4">
        <Image
          src={selectedImage}
          alt="Hình ảnh sách"
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>
      
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(image.ImageURL)}
              className={`aspect-square relative rounded border ${selectedImage === image.ImageURL ? 'border-amber-500' : 'border-gray-200'} overflow-hidden bg-white`}
            >
              <Image
                src={image.ImageURL}
                alt={`Hình ảnh ${index + 1}`}
                fill
                className="object-contain p-1"
                sizes="(max-width: 768px) 20vw, 10vw"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}