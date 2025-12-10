'use client';

import Image from '../pages/user/compat/Image';
import Link from '../pages/user/compat/Link';
import { useState, useEffect } from 'react';
import { parsePrice } from '../utils/currency';
import { XMarkIcon, ShoppingCartIcon, HeartIcon, EyeIcon } from '@heroicons/react/24/outline';

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

export default function StationeryDetailsModal({ item, isOpen, onClose, addToCart, addToWishlist }) {
  const [quantities, setQuantities] = useState({});
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [showWishlistPopup, setShowWishlistPopup] = useState(false);
  const itemId = item?.id || item?.stationery_id;
  const maxStock = item?.stock_quantity || 1;
  const currentQuantity = quantities[itemId] || 1;
  // Initialize quantity when opening
  useEffect(() => {
    if (item && isOpen && !quantities[itemId]) {
      setQuantities(prev => ({ ...prev, [itemId]: 1 }));
    }
  }, [item, isOpen]);

  // Ensure hooks are called unconditionally before any early return
  if (!isOpen || !item) return null;

  const updateQuantity = (newQuantity) => {
    const validQuantity = Math.min(Math.max(1, newQuantity), maxStock);
    setQuantities(prev => ({ ...prev, [itemId]: validQuantity }));
  };

  const handleAddToCart = () => {
    const qty = currentQuantity;
    const cartItem = {
      id: itemId,
      title: item.title,
      cover: item.cover || item.image_url,
      price: item.discountedPrice || item.price,
      quantity: qty
    };
    addToCart(cartItem);

    setShowCartPopup(true);
    setTimeout(() => setShowCartPopup(false), 2000);
  };

  const handleAddToWishlist = () => {
    addToWishlist({
      id: itemId,
      title: item.title,
      cover: item.cover || item.image_url,
      price: item.discountedPrice || item.price
    });
    setShowWishlistPopup(true);
    setTimeout(() => setShowWishlistPopup(false), 2000);
  };

  // No review logic in modal per requirement

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-200 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors group"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500 group-hover:text-gray-700" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Chi tiết Văn Phòng Phẩm</h2>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6 overflow-y-auto">
          {/* Image */}
          <div className="lg:col-span-2 flex items-center justify-center">
            <div className="relative w-64 aspect-[2/3] rounded-xl overflow-hidden shadow-xl">
              <Image
                src={item.cover || item.image_url}
                alt={item.title}
                fill
                className="object-cover"
                sizes="300px"
              />
              {item.tag && (
                <div className="absolute top-3 left-3 bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
                  {item.tag}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="lg:col-span-3 space-y-6">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-center text-gray-900 leading-tight">
                {item.title}
              </h1>
              {item.category && (
                <p className="text-lg text-center text-gray-600 font-medium">Danh mục: {item.category}</p>
              )}
            </div>

            {/* Price and Stock */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {item.discountedPrice ? (
                    <>
                      <span className="text-3xl font-bold text-red-600 animate-pulse">{item.discountedPrice}</span>
                      <span className="text-lg text-gray-500 line-through">{item.originalPrice}</span>
                    </>
                  ) : (
                    <span className="text-3xl font-bold text-emerald-600">{item.price}</span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 font-medium">Hàng trong kho</p>
                  <p className="text-lg font-bold text-gray-900">Còn lại: {maxStock}</p>
                </div>
              </div>
            </div>

            {/* Quantity & Actions */}
            <div className="relative space-y-3">
              {/* Cart Popup */}
              {showCartPopup && (
                <div className="absolute -top-16 left-0 right-0 z-10 flex items-center justify-center">
                  <div className="bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce">
                    <div className="flex items-center gap-2">
                      <ShoppingCartIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">Đã thêm vào giỏ hàng!</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Wishlist Popup */}
              {showWishlistPopup && (
                <div className="absolute -top-16 right-0 z-10 flex items-center justify-center">
                  <div className="bg-pink-500 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce">
                    <div className="flex items-center gap-2">
                      <HeartIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">Đã thêm vào yêu thích!</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <span className="text-sm font-semibold text-gray-700">Số lượng:</span>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                  <button
                    onClick={() => updateQuantity(currentQuantity - 1)}
                    disabled={currentQuantity <= 1}
                    className="px-3 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    −
                  </button>
                  <span className="px-4 py-2 text-gray-900 font-semibold min-w-[3rem] text-center">{currentQuantity}</span>
                  <button
                    onClick={() => updateQuantity(currentQuantity + 1)}
                    disabled={currentQuantity >= maxStock}
                    className="px-3 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={maxStock <= 0}
                  className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg text-base"
                >
                  <ShoppingCartIcon className="h-5 w-5" />
                  Thêm vào giỏ hàng
                </button>
                <button
                  onClick={handleAddToWishlist}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 text-base"
                >
                  <HeartIcon className="h-5 w-5" />
                  Yêu thích
                </button>
              </div>
            </div>

            {/* View Details Link */}
            <Link
              href={`/yoga/${slugify(item.title)}`}
              onClick={onClose}
              className="block w-full text-center px-6 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-all duration-200 hover:shadow-lg text-base"
            >
              <div className="flex items-center justify-center gap-2">
                <EyeIcon className="h-5 w-5" />
                Xem chi tiết
              </div>
            </Link>

            {/* Reviews are intentionally not displayed in the modal */}
          </div>
        </div>
      </div>
    </div>
  );
}
