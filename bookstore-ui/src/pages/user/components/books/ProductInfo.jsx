/**
 * Product Info component
 * Displays book information and purchase options
 */

'use client';

import { useState } from 'react';
import { StarIcon } from '@heroicons/react/20/solid';
import { ShoppingCartIcon, BoltIcon } from '@heroicons/react/24/outline';
import { useCart } from '../../../../hooks/useCart';
import { useToast } from '../../../../contexts/ToastContext.jsx';
import { formatPrice } from '../../../../utils/currency';

export default function ProductInfo({ book }) {
  const [quantity, setQuantity] = useState(1);
  
  // Calculate discount percentage if applicable
  const discountPercentage = book.OriginalPrice > book.SellingPrice
    ? Math.round(((book.OriginalPrice - book.SellingPrice) / book.OriginalPrice) * 100)
    : 0;
  

  
  // Handle quantity changes
  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };
  
  const increaseQuantity = () => {
    if (quantity < book.StockQuantity) {
      setQuantity(quantity + 1);
    }
  };
  
  const { addToCart } = useCart();
  const { showToast } = useToast();
  // Handle add to cart
  const handleAddToCart = () => {
    if (!book) return;
    const item = {
      id: book.BookID ?? book.id,
      title: book.BookName ?? book.title,
      author: book.Author ?? book.author,
      cover: book.BookImage ?? book.cover,
      price: formatPrice(book.Price ?? book.price ?? 0),
      quantity: quantity || 1
    };
    addToCart(item);
    showToast({ title: 'Added to cart', message: `${item.title} (x${quantity})`, type: 'success', actionLabel: 'View Cart', onAction: () => { window.location.href = '/cart'; } });
  };
  
  // Handle buy now
  const handleBuyNow = () => {
    // Implementation will be added later
    // Buy now action
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
        {book.Title}
      </h1>
      
      {/* Subtitle if available */}
      {book.Subtitle && (
        <p className="text-lg text-gray-600 mb-3">
          {book.Subtitle}
        </p>
      )}
      
      {/* Author & Publisher */}
      <div className="mb-4 space-y-1">
        <p className="text-gray-700">
          <span className="font-medium">Tác giả:</span>{' '}
          {book.authors?.map(author => `${author.FirstName} ${author.LastName}`).join(', ') || 'Chưa cập nhật'}
        </p>
        <p className="text-gray-700">
          <span className="font-medium">Nhà cung cấp:</span>{' '}
          {book.publisher?.PublisherName || 'Chưa cập nhật'}
        </p>
      </div>
      
      {/* Ratings */}
      <div className="flex items-center mb-4">
        <div className="flex items-center">
          {[0, 1, 2, 3, 4].map((rating) => (
            <StarIcon
              key={rating}
              className={`h-5 w-5 ${
                book.AverageRating > rating
                  ? 'text-yellow-400'
                  : 'text-gray-300'
              }`}
              aria-hidden="true"
            />
          ))}
        </div>
        <p className="ml-2 text-sm text-gray-600">
          {book.AverageRating?.toFixed(1) || '0'}/5 ({book.TotalReviews || 0} đánh giá)
        </p>
      </div>
      
      {/* Price */}
      <div className="mb-6">
        <div className="flex items-center">
          <p className="text-2xl font-bold text-amber-600">
            {formatPrice(book.SellingPrice)}
          </p>
          
          {discountPercentage > 0 && (
            <>
              <p className="ml-3 text-lg text-gray-500 line-through">
                {formatPrice(book.OriginalPrice)}
              </p>
              <span className="ml-3 px-2 py-1 text-xs font-semibold text-white bg-red-500 rounded">
                -{discountPercentage}%
              </span>
            </>
          )}
        </div>
        
        {/* Stock status */}
        <p className={`mt-1 text-sm ${book.StockQuantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {book.StockQuantity > 0 ? 'Còn hàng' : 'Hết hàng'}
        </p>
      </div>
      
      {/* Quantity Selector */}
      <div className="mb-6">
        <p className="font-medium mb-2">Số lượng:</p>
        <div className="flex items-center">
          <button
            onClick={decreaseQuantity}
            disabled={quantity <= 1}
            className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-l-md bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
          >
            -
          </button>
          <input
            type="number"
            min="1"
            max={book.StockQuantity}
            value={quantity}
            onChange={(e) => setQuantity(Math.min(Math.max(1, parseInt(e.target.value) || 1), book.StockQuantity))}
            className="w-16 h-10 border-t border-b border-gray-300 text-center [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            onClick={increaseQuantity}
            disabled={quantity >= book.StockQuantity}
            className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
          >
            +
          </button>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mt-auto">
        <button
          onClick={handleAddToCart}
          disabled={book.StockQuantity <= 0}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-amber-600 text-amber-600 font-medium rounded-md hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShoppingCartIcon className="h-5 w-5" />
          Thêm vào giỏ hàng
        </button>
        <button
          onClick={handleBuyNow}
          disabled={book.StockQuantity <= 0}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 text-white font-medium rounded-md hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <BoltIcon className="h-5 w-5" />
          Mua ngay
        </button>
      </div>
    </div>
  );
}