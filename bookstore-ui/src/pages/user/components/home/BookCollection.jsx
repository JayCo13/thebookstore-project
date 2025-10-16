import Image from "../../compat/Image";
import Link from "../../compat/Link";
import { useEffect, useState } from "react";
import BookCard from './BookCard';
import { useCart } from '../../../../hooks/useCart';
import { useWishlist } from '../../../../hooks/useWishlist';
import { useToast } from '../../../../contexts/ToastContext.jsx';

// Local placeholders
const showClickToast = (_e, _msg) => {};

// Copied-and-aligned layout with FeaturedBooks: Modal component
function BookDetailsModal({ book, isOpen, onClose, addToCart, addToWishlist }) {
  const { showToast } = useToast();
  if (!isOpen || !book) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-white/80 rounded-full hover:bg-[#008080] hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex flex-col md:flex-row">
            {/* Book cover */}
            <div className="md:w-1/3 p-6 flex items-center justify-center">
              <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden shadow-lg">
                <Image src={book.cover} alt={book.title} fill className="object-cover" sizes="(max-width: 768px) 80vw, 33vw" />
                {book.category && (
                  <div className="absolute top-3 left-3 bg-[#008080] text-white text-xs font-medium px-2 py-1 rounded">
                    {book.category}
                  </div>
                )}
              </div>
            </div>

            {/* Book details */}
            <div className="md:w-2/3 p-6">
              <h2 className="text-2xl md:text-3xl font-bold text-[#2D2D2D]">{book.title}</h2>
              {book.author && <p className="text-lg text-gray-600 mt-1">{book.author}</p>}
              <div className="mt-4 flex items-center">
                <span className="text-xl font-bold text-[#008080]">{book.price}</span>
                {book.category && (
                  <span className="ml-3 px-2 py-1 bg-[#008080]/10 text-[#008080] text-sm rounded">{book.category}</span>
                )}
              </div>

              {book.description && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-[#2D2D2D]">About this book</h3>
                  <p className="mt-2 text-gray-600 leading-relaxed">{book.description}</p>
                </div>
              )}

              {(book.pages || book.publishDate || book.isbn) && (
                <div className="mt-6 grid grid-cols-2 gap-4">
                  {book.pages && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Pages</h4>
                      <p className="text-[#2D2D2D]">{book.pages}</p>
                    </div>
                  )}
                  {book.publishDate && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Published</h4>
                      <p className="text-[#2D2D2D]">{book.publishDate}</p>
                    </div>
                  )}
                  {book.isbn && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">ISBN</h4>
                      <p className="text-[#2D2D2D]">{book.isbn}</p>
                    </div>
                  )}
                </div>
              )}

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


export default function BookCollection() {
  const { addToCart } = useCart();
  const { addToWishlist } = useWishlist();
  const { showToast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Sample book data - matches Cart expectations (price as string)
  const books = [
    {
      id: 1,
      title: "The Silent Echo",
      author: "Various Authors",
      cover: "/assets/book-cover.svg",
      category: "Fiction",
      price: "$24.99",
      description: "A captivating tale that resonates through the ages.",
    },
    {
      id: 2,
      title: "Data Structures Explained",
      author: "Tech Writers",
      cover: "/assets/yoga_voighe.jpg",
      category: "Computer Science",
      price: "$32.50",
      description: "Clear explanations of core data structures with examples.",
    },
    {
      id: 3,
      title: "Modern Architecture",
      author: "Design Collective",
      cover: "/assets/Yoasoi_sang.jpg",
      category: "Art & Design",
      price: "$45.00",
      description: "Exploring contemporary architectural marvels.",
    },
    {
      id: 4,
      title: "Cooking Essentials",
      author: "Chef Group",
      cover: "/assets/74_lathutay.jpg",
      category: "Cooking",
      price: "$19.95",
      description: "Your guide to everyday cooking fundamentals.",
    },
  ];

  const openBookDetails = (book) => {
    setSelectedBook(book);
    setIsModalOpen(true);
    // Prevent body scrolling when modal is open
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
  };

  const closeBookDetails = () => {
    setIsModalOpen(false);
    // Restore body scrolling
    if (typeof document !== "undefined") {
      document.body.style.overflow = "auto";
    }
  };

  return (
    <section className="py-20 px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10">
        <div>
          <h2 className="text-3xl font-bold text-[#2D2D2D] relative inline-block">
            Popular Collections
            <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-[#008080]"></span>
          </h2>
          <p className="text-gray-600 mt-4 max-w-xl">Explore curated selections across genres, topics, and interests.</p>
        </div>
        <Link href="/books" className="mt-4 md:mt-0 text-[#008080] font-medium hover:underline flex items-center group">
          View all collections
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
        {books.map((book) => (
          <BookCard 
            key={book.id} 
            book={book} 
            isClient={isClient} 
            onViewDetails={() => openBookDetails(book)} 
            addToCart={(b) => { addToCart(b); showToast({ title: 'Added to cart', message: `${b.title}`, type: 'success', actionLabel: 'View Cart', onAction: () => { window.location.href = '/cart'; } }); }} 
            addToWishlist={(b) => { addToWishlist(b); showToast({ title: 'Added to wishlist', message: `${b.title}`, type: 'success', actionLabel: 'View Wishlist', onAction: () => { window.location.href = '/wishlist'; } }); }} 
          />
        ))}
      </div>

      {/* Book Details Modal */}
      {isClient && selectedBook && (
        <BookDetailsModal book={selectedBook} isOpen={isModalOpen} onClose={closeBookDetails} addToCart={addToCart} addToWishlist={addToWishlist} />
      )}
    </section>
  );
}