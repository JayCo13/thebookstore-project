'use client';

import Image from '../pages/user/compat/Image';
import Link from '../pages/user/compat/Link';
import { useState, useEffect } from 'react';
import { parsePrice } from '../utils/currency';
import { XMarkIcon, ShoppingCartIcon, HeartIcon, EyeIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/20/solid';
import { useToast } from '../contexts/ToastContext.jsx';
import { getBookReviews } from '../service/api';

const slugify = (text) => {
  if (!text) return '';
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};


export default function BookDetailsModal({ book, isOpen, onClose, addToCart, addToWishlist }) {
  const { showToast } = useToast();
  // Individual quantity state per book using book ID
  const [quantities, setQuantities] = useState({});
  // Popup effect states
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [showWishlistPopup, setShowWishlistPopup] = useState(false);

  // Reviews state for average rating display
  const [avgRating, setAvgRating] = useState(null);
  const [totalReviews, setTotalReviews] = useState(0);

  // Get current quantity for this specific book
  const currentQuantity = quantities[book?.id || book?.book_id] || 1;

  // Reset quantity when book changes
  useEffect(() => {
    if (book && isOpen) {
      const bookId = book.id || book.book_id;
      if (!quantities[bookId]) {
        setQuantities(prev => ({ ...prev, [bookId]: 1 }));
      }

      // Fetch reviews for this book to compute average rating
      (async () => {
        try {
          const data = await getBookReviews(bookId);
          const list = Array.isArray(data) ? data : (data?.items || []);
          const total = list.length;
          const average = total ? (list.reduce((s, r) => s + (r.rating || 0), 0) / total) : null;
          setAvgRating(average);
          setTotalReviews(total);
        } catch (e) {
          setAvgRating(null);
          setTotalReviews(0);
        }
      })();
    }
  }, [book, isOpen, quantities]);

  if (!isOpen || !book) return null;

  const bookId = book.id || book.book_id;
  const maxStock = book.quantity || book.stock_quantity || 1;

  const updateQuantity = (newQuantity) => {
    const validQuantity = Math.min(Math.max(1, newQuantity), maxStock);
    setQuantities(prev => ({ ...prev, [bookId]: validQuantity }));
  };

  const handleAddToCart = () => {
    const cartItem = {
      id: book.id || book.book_id,
      title: book.title,
      author: book.author || (book.authors && book.authors.length > 0 ? book.authors[0].name : 'Unknown Author'),
      cover: book.cover || book.image_url,
      price: book.discountedPrice || book.price,
      quantity: currentQuantity
    };
    addToCart(cartItem);

    // Trigger popup effect
    setShowCartPopup(true);
    setTimeout(() => setShowCartPopup(false), 2000);
  };

  const handleAddToWishlist = () => {
    addToWishlist(book);

    // Trigger popup effect
    setShowWishlistPopup(true);
    setTimeout(() => setShowWishlistPopup(false), 2000);
  };



  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-200 rounded-t-2xl gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate flex-1">Chi tiết Sách</h2>

          <div className="flex items-center gap-3 shrink-0">
            {/* Audio Sample Badge */}
            <Link
              href={`/book/${slugify(book.title)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <button
                className="group relative flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#008080]/5 to-[#008080]/10 hover:from-[#008080]/10 hover:to-[#008080]/20 border border-[#008080]/20 hover:border-[#008080]/30 rounded-lg transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
              >
                <svg
                  className="w-4 h-4 text-[#008080] group-hover:text-[#006666] transition-colors duration-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a3 3 0 106 0v-3a3 3 0 00-6 0v3zm6 0a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-sm font-medium text-[#008080] group-hover:text-[#006666] transition-colors duration-200 hidden sm:inline">
                  Nghe thử / Đọc thử
                </span>
                <span className="text-sm font-medium text-[#008080] group-hover:text-[#006666] transition-colors duration-200 sm:hidden">
                  Nghe thử
                </span>
                {/* Subtle glow effect */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#008080]/0 via-[#008080]/5 to-[#008080]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </Link>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors group shrink-0"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500 group-hover:text-gray-700" />
            </button>
          </div>
        </div>

        {/* Content - Responsive Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6 overflow-y-auto">
          {/* Book Cover - Left Side */}
          <div className="lg:col-span-2 flex items-center justify-center">
            <div className="relative w-64 aspect-[2/3] rounded-xl overflow-hidden shadow-xl">
              <Image
                src={book.cover || book.image_url}
                alt={book.title}
                fill
                className="object-cover"
                sizes="300px"
              />
              {(book.tag || book.is_best_seller) && (
                <div className="absolute top-3 left-3 bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
                  {book.tag || 'Bestseller'}
                </div>
              )}
            </div>
          </div>

          {/* Book Information - Right Side */}
          <div className="lg:col-span-3 space-y-6">
            {/* Title and Author */}
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-center text-gray-900 leading-tight">
                Tựa sách: {book.title}
              </h1>
              {avgRating !== null && (
                <div className="flex items-center justify-center gap-2">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <StarIcon key={s} className={Math.floor(avgRating) >= s ? 'h-5 w-5 text-yellow-400' : 'h-5 w-5 text-gray-200'} />
                    ))}
                  </div>
                  <span className="text-sm text-gray-700 font-medium">{avgRating.toFixed(1)} / 5</span>
                  <span className="text-sm text-gray-500">({totalReviews} đánh giá)</span>
                </div>
              )}
              {book.author && (
                <p className="text-lg text-center text-gray-600 font-medium ml-2">
                  Tác giả: {book.author}
                </p>
              )}
            </div>

            {/* Price and Stock */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {book.discountedPrice ? (
                    <>
                      <span className="text-3xl font-bold text-red-600 animate-pulse">{book.discountedPrice}</span>
                      <span className="text-lg text-gray-500 line-through">{book.originalPrice}</span>
                    </>
                  ) : (
                    <span className="text-3xl font-bold text-emerald-600">{book.price}</span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 font-medium">Hàng trong kho</p>
                  <p className="text-lg font-bold text-gray-900">
                    Còn lại: {book.quantity || book.stock_quantity || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Key Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {book.isbn && (
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <span className="text-sm text-gray-500 font-medium">ISBN</span>
                  <p className="text-base font-semibold text-gray-900">{book.isbn}</p>
                </div>
              )}

              {book.category && (
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <span className="text-sm text-gray-500 font-medium">Danh mục</span>
                  <p className="text-base font-semibold text-gray-900">{book.category}</p>
                </div>
              )}
            </div>
            {book.brief_description && (
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <span className="text-sm text-gray-500 font-medium">Brief Description</span>
                <p className="text-base font-semibold text-gray-900">{book.brief_description}</p>
              </div>
            )}
            {/* Quantity Selector */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <span className="text-sm font-semibold text-gray-700">Số lượng:</span>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                <button
                  onClick={() => updateQuantity(currentQuantity - 1)}
                  disabled={currentQuantity <= 1}
                  className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max={maxStock}
                  value={currentQuantity}
                  onChange={(e) => updateQuantity(parseInt(e.target.value) || 1)}
                  className="w-12 py-1.5 text-center text-sm font-semibold border-0 focus:ring-0 focus:outline-none"
                />
                <button
                  onClick={() => updateQuantity(currentQuantity + 1)}
                  disabled={currentQuantity >= maxStock}
                  className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Cart Popup Effect */}
              {showCartPopup && (
                <div className="absolute -top-16 left-0 right-0 sm:right-1/3 z-10 flex items-center justify-center">
                  <div className="bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce">
                    <div className="flex items-center gap-2">
                      <ShoppingCartIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">Đã thêm vào giỏ hàng!</span>
                    </div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-emerald-600"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Wishlist Popup Effect */}
              {showWishlistPopup && (
                <div className="absolute -top-16 right-0 sm:left-2/3 sm:right-0 z-10 flex items-center justify-center">
                  <div className="bg-pink-500 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce">
                    <div className="flex items-center gap-2">
                      <HeartIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">Đã thêm vào danh sách yêu thích!</span>
                    </div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-pink-500"></div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleAddToCart}
                disabled={(book.quantity || book.stock_quantity || 0) <= 0}
                className="col-span-1 sm:col-span-2 flex items-center justify-center gap-3 px-6 py-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg text-base"
              >
                <ShoppingCartIcon className="h-5 w-5" />
                Thêm vào giỏ hàng
              </button>
              <button
                onClick={handleAddToWishlist}
                className="flex items-center justify-center gap-2 px-4 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 text-base"
              >
                <HeartIcon className="h-5 w-5" />
                Yêu thích
              </button>
            </div>

            {/* View Details Link */}
            <Link
              href={`/book/${slugify(book.title)}`}
              onClick={onClose}
              className="block w-full text-center px-6 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-all duration-200 hover:shadow-lg text-base"
            >
              <div className="flex items-center justify-center gap-2">
                <EyeIcon className="h-5 w-5" />
                Xem chi tiết
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
