/**
 * Product Details Tabs component
 * Displays book details in a tabbed interface
 */

'use client';

import { useState } from 'react';
import ProductSpecs from './ProductSpecs';
import ProductDescription from './ProductDescription';

export default function ProductDetailsTabs({ book }) {
  const [activeTab, setActiveTab] = useState('details');
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex-1 py-4 px-4 text-center font-medium ${activeTab === 'details' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Thông tin chi tiết
        </button>
        <button
          onClick={() => setActiveTab('description')}
          className={`flex-1 py-4 px-4 text-center font-medium ${activeTab === 'description' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Mô tả sản phẩm
        </button>
      </div>
      
      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'details' && <ProductSpecs book={book} />}
        {activeTab === 'description' && <ProductDescription book={book} />}
      </div>
    </div>
  );
}