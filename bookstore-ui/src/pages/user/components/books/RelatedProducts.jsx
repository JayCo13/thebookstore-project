/**
 * Related Products component
 * Displays a carousel of related books
 */

import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { register } from 'swiper/element/bundle';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

// Register Swiper web components
register();

export default function RelatedProducts({ relatedBooks = [] }) {
  const swiperRef = useRef(null);
  
  useEffect(() => {
    // Configure Swiper
    const swiperContainer = swiperRef.current;
    
    const params = {
      slidesPerView: 2,
      spaceBetween: 16,
      navigation: true,
      pagination: {
        clickable: true,
      },
      breakpoints: {
        640: {
          slidesPerView: 3,
        },
        768: {
          slidesPerView: 4,
        },
        1024: {
          slidesPerView: 5,
        },
      },
    };
    
    // Assign Swiper parameters
    Object.assign(swiperContainer, params);
    
    // Initialize Swiper
    swiperContainer.initialize();
  }, []);
  
  // Format price with thousand separator
  const formatPrice = (price) => {
    return price?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + 'đ';
  };
  
  // If no related books
  if (!relatedBooks || relatedBooks.length === 0) {
    return null;
  }
  
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Sản phẩm liên quan</h2>
        
        {/* Custom navigation buttons */}
        <div className="flex space-x-2">
          <button
            onClick={() => swiperRef.current.swiper.slidePrev()}
            className="p-2 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors"
            aria-label="Previous"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => swiperRef.current.swiper.slideNext()}
            className="p-2 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors"
            aria-label="Next"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <swiper-container
        ref={swiperRef}
        init="false"
        class="w-full"
      >
        {relatedBooks.map((book) => (
          <swiper-slide key={book.BookID}>
            <Link to={`/books/${book.Slug}`} className="block group">
              <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-gray-100 mb-3">
                <img
                  src={book.coverImage || '/assets/placeholder-book.jpg'}
                  alt={book.Title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h3 className="font-medium text-gray-900 line-clamp-2 group-hover:text-amber-600 transition-colors">
                {book.Title}
              </h3>
              <p className="text-sm text-gray-500 mb-1">
                {book.authors?.map(author => `${author.FirstName} ${author.LastName}`).join(', ') || 'Chưa cập nhật'}
              </p>
              <p className="font-medium text-amber-600">
                {formatPrice(book.SellingPrice)}
              </p>
            </Link>
          </swiper-slide>
        ))}
      </swiper-container>
    </section>
  );
}