'use client';

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Link from '../../compat/Link';
import Image from '../../compat/Image';
import { MagnifyingGlassIcon, UserIcon, HeartIcon, ShoppingBagIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useCart } from '../../../../hooks/useCart';
import { useWishlist } from '../../../../hooks/useWishlist';
import { useAuth } from '../../../../contexts/AuthContext';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartHovered, setIsCartHovered] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const cartRef = useRef(null);
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { cartItems, getCartCount, getCartTotal, removeFromCart, updateQuantity } = useCart();
  const { getWishlistCount } = useWishlist();
  
  // Handle client-side rendering
  useEffect(() => {
    setIsClient(true);
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
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo - Left Side */}
          <div className="flex-shrink-0">
            <Link href="/" className="block">
              <Image src="/assets/logo.png" alt="Book Tâm Nguồn" className="w-20 h-20 rounded-full object-cover" />
            </Link>
          </div>
          
          {/* Navigation - Center */}
          <nav className="hidden md:flex items-center space-x-12">
            <Link href="/" className="relative text-[#2D2D2D] hover:text-[#008080] hover:opacity-90 font-medium transition-colors group">
              Home
              <span className="absolute left-0 -bottom-1 h-px bg-[#008080] w-0 group-hover:w-full transition-all"></span>
            </Link>
            {/* Categories should render to Books page */}
            <Link href="/books" className="relative text-[#2D2D2D] hover:text-[#008080] hover:opacity-90 font-medium transition-colors group">
              Categories
              <span className="absolute left-0 -bottom-1 h-px bg-[#008080] w-0 group-hover:w-full transition-all"></span>
            </Link>
            {/* New Arrivals: dedicated page for new releases */}
            <Link href="/new-arrivals" className="relative text-[#2D2D2D] hover:text-[#008080] hover:opacity-90 font-medium transition-colors group">
              New Arrivals
              <span className="absolute left-0 -bottom-1 h-px bg-[#008080] w-0 group-hover:w-full transition-all"></span>
            </Link>
            {/* Bestsellers should render to Books with best-seller filter applied */}
            <Link href="/books?bestSeller=1" className="relative text-[#2D2D2D] hover:text-[#008080] hover:opacity-90 font-medium transition-colors group">
              Bestsellers
              <span className="absolute left-0 -bottom-1 h-px bg-[#008080] w-0 group-hover:w-full transition-all"></span>
            </Link>
            {/* About Us */}
            <Link href="/about" className="relative text-[#2D2D2D] hover:text-[#008080] hover:opacity-90 font-medium transition-colors group">
              About Us
              <span className="absolute left-0 -bottom-1 h-px bg-[#008080] w-0 group-hover:w-full transition-all"></span>
            </Link>
            {/* Contact */}
            <Link href="/contact" className="relative text-[#2D2D2D] hover:text-[#008080] hover:opacity-90 font-medium transition-colors group">
              Contact
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
            
            {/* Account Icon with Username */}
            <div className="relative group">
              <button className="flex items-center text-[#2D2D2D] hover:text-[#008080] transition-colors p-2 rounded-full hover:bg-gray-100">
                <UserIcon className="h-5 w-5" />
                {isAuthenticated && user?.first_name && (
                  <span className="text-md font-medium ml-2 hidden md:inline-block">{user.first_name}</span>
                )}
              </button>
              
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                {isAuthenticated ? (
                  <>
                    <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profile</Link>
                    <Link href="/orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Orders</Link>
                    <button 
                      onClick={() => {
                        logout();
                        navigate('/');
                      }} 
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Sign in</Link>
                    <Link href="/register" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Create account</Link>
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
                  <h3 className="font-medium text-gray-900 border-b pb-3 text-lg">Your Cart ({getCartCount()} items)</h3>
                  
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
                            <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
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
                                <p className="text-xs text-gray-500 mr-2">{item.price}</p>
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
                      <p className="text-sm text-gray-500 py-3">Your cart is empty</p>
                    )}
                  </div>
                  
                  <div className="pt-3 border-t mt-2">
                    <div className="flex justify-between py-3">
                      <span className="font-medium text-lg">Total:</span>
                      <span className="font-bold text-[#008080] text-lg">${getCartTotal()}</span>
                    </div>
                    <Link 
                      href="/checkout" 
                      className="block w-full text-center bg-[#008080] text-white py-3 rounded-md hover:bg-[#006666] transition-colors mt-3 font-medium"
                      onClick={() => setIsCartHovered(false)}
                    >
                      Checkout
                    </Link>
                    <Link 
                      href="/cart" 
                      className="block w-full text-center border border-[#008080] text-[#008080] py-3 rounded-md hover:bg-[#008080]/10 transition-colors mt-3 font-medium"
                      onClick={() => setIsCartHovered(false)}
                    >
                      View Cart
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
        
        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 bg-white">
            <div className="flex flex-col space-y-4">
              <Link href="/" className="text-[#2D2D2D] hover:text-[#008080] font-medium px-4 py-2 transition-colors">
                Home
              </Link>
              {/* Categories -> Books */}
              <Link href="/books" className="text-[#2D2D2D] hover:text-[#008080] font-medium px-4 py-2 transition-colors">
                Categories
              </Link>
              {/* New Arrivals dedicated page */}
              <Link href="/new-arrivals" className="text-[#2D2D2D] hover:text-[#008080] font-medium px-4 py-2 transition-colors">
                New Arrivals
              </Link>
              {/* Bestsellers -> Books with filter */}
              <Link href="/books?bestSeller=1" className="text-[#2D2D2D] hover:text-[#008080] font-medium px-4 py-2 transition-colors">
                Bestsellers
              </Link>
              {/* About Us */}
              <Link href="/about" className="text-[#2D2D2D] hover:text-[#008080] font-medium px-4 py-2 transition-colors">
                About Us
              </Link>
              {/* Contact */}
              <Link href="/contact" className="text-[#2D2D2D] hover:text-[#008080] font-medium px-4 py-2 transition-colors">
                Contact
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}