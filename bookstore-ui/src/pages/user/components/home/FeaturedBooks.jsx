'use client';

import Image from '../../compat/Image';
import Link from '../../compat/Link';
import { useState, useEffect } from 'react';
import BookCard from './BookCard';
import { useCart } from '../../../../hooks/useCart';
import { useWishlist } from '../../../../hooks/useWishlist';
import { useToast } from '../../../../contexts/ToastContext.jsx';

// Local no-op toast for clicks (placeholder)
function showClickToast(_e, _msg) {}

const featuredBooks = [
  {
    id: 1,
    title: "The Silent Patient",
    author: "Alex Michaelides",
    price: "$16.99",
    cover: "/assets/yoga_voighe.png",
    tag: "Bestseller",
    description: "Alicia Berenson's life is seemingly perfect. A famous painter married to an in-demand fashion photographer, she lives in a grand house with big windows overlooking a park in one of London's most desirable areas. One evening her husband Gabriel returns home late from a fashion shoot, and Alicia shoots him five times in the face, and then never speaks another word.",
    pages: "336",
    publishDate: "February 5, 2019",
    isbn: "978-1250301697",
    genre: "Psychological Thriller"
  },
  {
    id: 2,
    title: "Where the Crawdads Sing",
    author: "Delia Owens",
    price: "$14.99",
    cover: "/assets/yoga_voighe.png",
    tag: "New Release",
    description: "For years, rumors of the 'Marsh Girl' have haunted Barkley Cove, a quiet town on the North Carolina coast. So in late 1969, when handsome Chase Andrews is found dead, the locals immediately suspect Kya Clark, the so-called Marsh Girl. But Kya is not what they say. Sensitive and intelligent, she has survived for years alone in the marsh that she calls home.",
    pages: 384,
    publishDate: "August 14, 2018",
    isbn: "978-0735219090",
    genre: "Literary Fiction"
  },
  {
    id: 3,
    title: "The Midnight Library",
    author: "Matt Haig",
    price: "$13.99",
    cover: "/assets/yoga_voighe.png",
    description: "Between life and death there is a library, and within that library, the shelves go on forever. Every book provides a chance to try another life you could have lived. To see how things would be if you had made other choices. Would you have done anything different, if you had the chance to undo your regrets?",
    pages: 304,
    publishDate: "September 29, 2020",
    isbn: "978-0525559474",
    genre: "Contemporary Fiction"
  },
  {
    id: 4,
    title: "Educated",
    author: "Tara Westover",
    price: "$15.99",
    cover: "/assets/yoga_voighe.png",
    tag: "Award Winner",
    description: "Born to survivalists in the mountains of Idaho, Tara Westover was seventeen the first time she set foot in a classroom. Her family was so isolated from mainstream society that there was no one to ensure the children received an education, and no one to intervene when one of Tara's older brothers became violent.",
    pages: 352,
    publishDate: "February 20, 2018",
    isbn: "978-0399590504",
    genre: "Memoir"
  }
];

// Book Details Modal Component
function BookDetailsModal({ book, isOpen, onClose, addToCart, addToWishlist }) {
  const { showToast } = useToast();
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-white/80 rounded-full hover:bg-[#008080] hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex flex-col md:flex-row">
            {/* Book cover */}
            <div className="md:w-1/3 p-6 flex items-center justify-center">
              <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden shadow-lg">
                <Image 
                  src={book.cover} 
                  alt={book.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 80vw, 33vw"
                />
                {book.tag && (
                  <div className="absolute top-3 left-3 bg-[#008080] text-white text-xs font-medium px-2 py-1 rounded">
                    {book.tag}
                  </div>
                )}
              </div>
            </div>
            
            {/* Book details */}
            <div className="md:w-2/3 p-6">
              <h2 className="text-2xl md:text-3xl font-bold text-[#2D2D2D]">{book.title}</h2>
              <p className="text-lg text-gray-600 mt-1">{book.author}</p>
              <div className="mt-4 flex items-center">
                <span className="text-xl font-bold text-[#008080]">{book.price}</span>
                <span className="ml-3 px-2 py-1 bg-[#008080]/10 text-[#008080] text-sm rounded">{book.genre}</span>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-medium text-[#2D2D2D]">About this book</h3>
                <p className="mt-2 text-gray-600 leading-relaxed">{book.description}</p>
              </div>
              
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Pages</h4>
                  <p className="text-[#2D2D2D]">{book.pages}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Published</h4>
                  <p className="text-[#2D2D2D]">{book.publishDate}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">ISBN</h4>
                  <p className="text-[#2D2D2D]">{book.isbn}</p>
                </div>
              </div>
              
              <div className="mt-8 flex space-x-4">
                <button 
            className="px-6 py-2 bg-[#008080] text-white rounded-md hover:bg-[#006666] transition-colors"
            onClick={() => { 
              addToCart(book); 
              showToast({ title: 'Added to cart', message: `${book.title}`, type: 'success', actionLabel: 'View Cart', onAction: () => { window.location.href = '/cart'; } });
            }}
          >
            Add to Cart
          </button>
                <button
                  className="px-6 py-2 border border-[#008080] text-[#008080] rounded-md hover:bg-[#008080]/10 transition-colors"
                  onClick={() => { 
                    addToWishlist(book); 
                    showToast({ title: 'Added to wishlist', message: `${book.title}`, type: 'success', actionLabel: 'View Wishlist', onAction: () => { window.location.href = '/wishlist'; } });
                  }}
                >
                  Add to Wishlist
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeaturedBooks() {
  const [isClient, setIsClient] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToCart } = useCart();
  const { addToWishlist } = useWishlist();
  const { showToast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const openBookDetails = (book) => {
    setSelectedBook(book);
    setIsModalOpen(true);
    // Prevent body scrolling when modal is open
    document.body.style.overflow = 'hidden';
  };

  const closeBookDetails = () => {
    setIsModalOpen(false);
    // Restore body scrolling
    document.body.style.overflow = 'auto';
  };

  return (
    <section className="py-20 px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10">
        <div>
          <h2 className="text-3xl font-bold text-[#2D2D2D] relative inline-block">
            New & Noteworthy
            <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-[#008080]"></span>
          </h2>
          <p className="text-gray-600 mt-4 max-w-xl">Discover our latest collection of captivating stories that will transport you to new worlds.</p>
        </div>
        <Link href="/books" className="mt-4 md:mt-0 text-[#008080] font-medium hover:underline flex items-center group">
          View all books
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
        {featuredBooks.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            onViewDetails={() => openBookDetails(book)}
            addToCart={(b) => { addToCart(b); showToast({ title: 'Added to cart', message: `${b.title}`, type: 'success', actionLabel: 'View Cart', onAction: () => { window.location.href = '/cart'; } }); }}
            addToWishlist={(b) => { addToWishlist(b); showToast({ title: 'Added to wishlist', message: `${b.title}`, type: 'success', actionLabel: 'View Wishlist', onAction: () => { window.location.href = '/wishlist'; } }); }}
          />
        ))}
      </div>

      {/* Book Details Modal */}
      {isClient && selectedBook && (
        <BookDetailsModal 
          book={selectedBook} 
          isOpen={isModalOpen} 
          onClose={closeBookDetails}
          addToCart={addToCart}
          addToWishlist={addToWishlist}
        />
      )}
    </section>
  );
}