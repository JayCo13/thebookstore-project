'use client';

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Link from '../../compat/Link';
import Image from '../../compat/Image';
import { MagnifyingGlassIcon, UserIcon, HeartIcon, ShoppingBagIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useCart } from '../../../../hooks/useCart';
import { parsePrice, formatPriceForInput } from '../../../../utils/currency';
import { useWishlist } from '../../../../hooks/useWishlist';
import { useAuth } from '../../../../contexts/AuthContext';
import { getStationery, getStationeryCategories } from '../../../../service/api';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartHovered, setIsCartHovered] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [hasStationeryItems, setHasStationeryItems] = useState(false);
  const cartRef = useRef(null);
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { cartItems, getCartCount, getCartTotal, removeFromCart, updateQuantity } = useCart();
  const { getWishlistCount } = useWishlist();



  // Handle client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check if non-Yoga stationery items exist
  useEffect(() => {
    const checkStationeryItems = async () => {
      try {
        // Get all categories
        const categoriesResponse = await getStationeryCategories();
        const allCategories = Array.isArray(categoriesResponse) ? categoriesResponse : (categoriesResponse?.data || []);

        // Find Yoga category IDs
        const yogaCats = allCategories.filter(cat =>
          cat.name.toLowerCase().includes('yoga')
        );
        const yogaIds = yogaCats.map(cat => cat.category_id);

        // Fetch all stationery items
        const response = await getStationery({ skip: 0, limit: 10 });
        const allItems = Array.isArray(response) ? response : (response?.data || []);

        // Check if there are any non-Yoga items
        const nonYogaItems = allItems.filter(item => {
          if (!item.categories || item.categories.length === 0) return true;
          const hasYogaCategory = item.categories.some(cat => yogaIds.includes(cat.category_id));
          return !hasYogaCategory;
        });

        setHasStationeryItems(nonYogaItems.length > 0);
      } catch (err) {
        console.error('Error checking stationery items:', err);
        setHasStationeryItems(false);
      }
    };

    checkStationeryItems();
  }, []);

  // Handle scroll effect for transparent header
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close cart dropdown when clicking outside
  useEffect(() => {
    if (!isCartHovered) return;
    const handleClickOutside = (e) => {
      if (cartRef.current && !cartRef.current.contains(e.target)) {
        setIsCartHovered(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isCartHovered]);

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${isScrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-22">
          {/* Logo - Left Side */}
          <div className="flex-shrink-0">
            <Link href="/" className="block">
              <Image src="/assets/logo.png" alt="Book Tâm Nguồn" className="w-20 h-20 p-1 object-cover" />
            </Link>
          </div>

          {/* Navigation - Center */}
          <nav className="hidden md:flex items-center space-x-12">
            <Link href="/" className="relative text-lg text-[#2D2D2D] hover:text-[#008080] hover:opacity-90 font-bold transition-colors group">
              Trang chủ
              <span className="absolute left-0 -bottom-1 h-px bg-[#008080] w-0 group-hover:w-full transition-all"></span>
            </Link>
            {/* Categories should render to Books page */}
            <Link href="/books" className="relative text-lg text-[#2D2D2D] hover:text-[#008080] hover:opacity-90 font-bold transition-colors group">
              Thư Viện Sách
              <span className="absolute left-0 -bottom-1 h-px bg-[#008080] w-0 group-hover:w-full transition-all"></span>
            </Link>
            {/* Stationery listing */}
            <Link href="/yoga" className="relative text-lg text-[#2D2D2D] hover:text-[#008080] hover:opacity-90 font-bold transition-colors group">
              Dụng cụ Yoga
              <span className="absolute left-0 -bottom-1 h-px bg-[#008080] w-0 group-hover:w-full transition-all"></span>
            </Link>
            {/* Only show Văn Phòng Phẩm if there are non-Yoga stationery items */}
            {hasStationeryItems && (
              <Link href="/van-phong-pham" className="relative text-lg text-[#2D2D2D] hover:text-[#008080] hover:opacity-90 font-bold transition-colors group">
                Văn Phòng Phẩm
                <span className="absolute left-0 -bottom-1 h-px bg-[#008080] w-0 group-hover:w-full transition-all"></span>
              </Link>
            )}
            {/* About Us */}
            <Link href="/about" className="relative text-lg text-[#2D2D2D] hover:text-[#008080] hover:opacity-90 font-bold transition-colors group">
              Giới thiệu
              <span className="absolute left-0 -bottom-1 h-px bg-[#008080] w-0 group-hover:w-full transition-all"></span>
            </Link>
            {/* Contact */}
            <Link href="/contact" className="relative text-lg text-[#2D2D2D] hover:text-[#008080] hover:opacity-90 font-bold transition-colors group">
              Liên hệ
              <span className="absolute left-0 -bottom-1 h-px bg-[#008080] w-0 group-hover:w-full transition-all"></span>
            </Link>
          </nav>

          {/* Icons - Right Side */}
          <div className="flex items-center space-x-6">
            {/* Search Icon */}
            <button
              className="text-[#2D2D2D] hover:text-[#008080] transition-colors p-2 rounded-full hover:bg-gray-100"
              aria-label="Search books"
              onClick={() => navigate('/books?focusSearch=1')}
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>

            {/* Account Icon with Avatar */}
            <div className="relative group">
              {isAuthenticated && user?.first_name ? (
                // Avatar with first letter when logged in
                (() => {
                  // Generate consistent color from username
                  const colors = [
                    'bg-rose-500', 'bg-pink-500', 'bg-purple-500', 'bg-indigo-500',
                    'bg-blue-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500',
                    'bg-green-500', 'bg-amber-500', 'bg-orange-500', 'bg-red-500'
                  ];
                  const nameHash = (user.first_name + (user.last_name || '')).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                  const bgColor = colors[nameHash % colors.length];
                  const firstLetter = user.first_name.charAt(0).toUpperCase();

                  return (
                    <button className={`w-9 h-9 rounded-full ${bgColor} text-white font-bold text-sm flex items-center justify-center shadow-md hover:shadow-lg transition-all hover:scale-105`}>
                      {firstLetter}
                    </button>
                  );
                })()
              ) : (
                // Default user icon when not logged in
                <button className="flex items-center text-[#2D2D2D] hover:text-[#008080] transition-colors p-2 rounded-full hover:bg-gray-100">
                  <UserIcon className="h-5 w-5" />
                </button>
              )}

              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                {isAuthenticated ? (
                  <>
                    {/* User name at top of dropdown */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {(() => {
                          const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
                          return fullName.length > 20 ? fullName.slice(0, 20) + '...' : fullName;
                        })()}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Tài khoản</Link>
                    <Link href="/orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Đơn hàng</Link>
                    <button
                      onClick={() => {
                        logout();
                        navigate('/');
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Đăng xuất
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Đăng nhập</Link>
                    <Link href="/register" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Tạo tài khoản</Link>
                  </>
                )}
              </div>
            </div>

            {/* Wishlist Icon */}
            <Link href="/wishlist" className="text-[#2D2D2D] hover:text-[#008080] transition-colors relative focus:outline-none p-2 rounded-full hover:bg-gray-100">
              <HeartIcon className="h-5 w-5" />
              <span className="absolute -top-1.5 -right-1.5 bg-[#008080] text-white text-xs w-5 h-5 flex items-center justify-center rounded-full ring-1 ring-white">
                {getWishlistCount()}
              </span>
            </Link>

            {/* Cart Icon with Badge and Preview */}
            <div className="relative" ref={cartRef}>
              <button
                className="text-[#2D2D2D] hover:text-[#008080] transition-colors relative focus:outline-none p-2 rounded-full hover:bg-gray-100"
                onClick={() => setIsCartHovered(!isCartHovered)}
                aria-expanded={isCartHovered}
                aria-haspopup="true"
              >
                <ShoppingBagIcon className="h-5 w-5" />
                <span className="absolute -top-1.5 -right-1.5 bg-[#008080] text-white text-xs w-5 h-5 flex items-center justify-center rounded-full ring-1 ring-white">
                  {getCartCount()}
                </span>
              </button>

              {/* Cart Preview Dropdown */}
              {isClient && isCartHovered && (
                <div
                  className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-xl ring-1 ring-gray-200 py-4 px-5 z-50"
                  onClick={(e) => {
                    // Keep dropdown open on internal interactions; only close on outside click or Checkout/View Cart
                    e.stopPropagation();
                  }}
                >
                  <h3 className="font-medium text-center text-gray-900 border-b pb-3 text-lg">Giỏ hàng có <span className="font-bold text-[#008080]"> {getCartCount()} </span> sản phẩm</h3>

                  <div className="max-h-72 overflow-y-auto py-3">
                    {cartItems.length > 0 ? (
                      cartItems.map((item) => (
                        <div key={item.id} className="flex items-center py-3 border-b">
                          <div className="h-16 w-12 relative flex-shrink-0">
                            <Image
                              src={item.cover}
                              alt={item.title}
                              fill
                              className="object-cover rounded"
                              sizes="48px"
                            />
                          </div>
                          <div className="ml-4 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.title?.length > 20 ? item.title.slice(0, 20) + '...' : item.title}</p>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center border rounded">
                                <button
                                  className="px-2 py-1 text-gray-500 hover:text-[#008080]"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  aria-label="Decrease quantity"
                                >
                                  -
                                </button>
                                <span className="px-2 text-sm">{item.quantity}</span>
                                <button
                                  className="px-2 py-1 text-gray-500 hover:text-[#008080]"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  aria-label="Increase quantity"
                                >
                                  +
                                </button>
                              </div>
                              <div className="flex items-center">
                                <p className="text-xs text-gray-500 mr-2">{`${formatPriceForInput(parsePrice(item.price))}₫`}</p>
                                <button
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => removeFromCart(item.id)}
                                  aria-label="Remove item"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 py-3">Giỏ hàng của bạn đang trống</p>
                    )}
                  </div>

                  <div className="pt-3 border-t mt-2">
                    <div className="flex justify-between py-3">
                      <span className="font-medium text-lg">Tổng cộng:</span>
                      <span className="font-bold text-[#008080] text-lg">{getCartTotal()}</span>
                    </div>
                    <Link
                      href="/checkout"
                      className="block w-full text-center bg-[#008080] text-white py-3 rounded-md hover:bg-[#006666] transition-colors mt-3 font-medium"
                      onClick={() => setIsCartHovered(false)}
                    >
                      Thanh Toán
                    </Link>
                    <Link
                      href="/cart"
                      className="block w-full text-center border border-[#008080] text-[#008080] py-3 rounded-md hover:bg-[#008080]/10 transition-colors mt-3 font-medium"
                      onClick={() => setIsCartHovered(false)}
                    >
                      Xem Giỏ Hàng
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden text-[#2D2D2D] p-2 rounded-full hover:bg-gray-100"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu - matched with desktop */}
        <div
          className={`md:hidden absolute top-20 left-0 w-full bg-white shadow-lg border-t border-gray-100 transition-all duration-300 origin-top ease-in-out z-40 ${isMobileMenuOpen ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-0 -translate-y-4 pointer-events-none'
            }`}
        >
          <div className="flex flex-col py-2">
            <Link
              href="/"
              className="text-[#2D2D2D] hover:text-[#008080] hover:bg-teal-50 font-medium px-6 py-3 transition-colors border-b border-gray-50 bg-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Trang chủ
            </Link>

            <Link
              href="/books"
              className="text-[#2D2D2D] hover:text-[#008080] hover:bg-teal-50 font-medium px-6 py-3 transition-colors border-b border-gray-50 bg-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Thư Viện Sách
            </Link>

            <Link
              href="/yoga"
              className="text-[#2D2D2D] hover:text-[#008080] hover:bg-teal-50 font-medium px-6 py-3 transition-colors border-b border-gray-50 bg-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Dụng cụ Yoga
            </Link>

            {hasStationeryItems && (
              <Link
                href="/van-phong-pham"
                className="text-[#2D2D2D] hover:text-[#008080] hover:bg-teal-50 font-medium px-6 py-3 transition-colors border-b border-gray-50 bg-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Văn Phòng Phẩm
              </Link>
            )}

            <Link
              href="/about"
              className="text-[#2D2D2D] hover:text-[#008080] hover:bg-teal-50 font-medium px-6 py-3 transition-colors border-b border-gray-50 bg-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Giới thiệu
            </Link>

            <Link
              href="/contact"
              className="text-[#2D2D2D] hover:text-[#008080] hover:bg-teal-50 font-medium px-6 py-3 transition-colors bg-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Liên hệ
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}