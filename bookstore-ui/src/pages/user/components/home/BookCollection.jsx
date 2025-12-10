import Link from "../../compat/Link";
import { useEffect, useState } from "react";
import BookCard from './BookCard';
import BookDetailsModal from '../../../../components/BookDetailsModal';
import { useCart } from '../../../../hooks/useCart';
import { useWishlist } from '../../../../hooks/useWishlist';
import { useToast } from '../../../../contexts/ToastContext.jsx';
import { getPopularBooks, getBookCoverUrl, getBookReviews } from '../../../../service/api';
import { formatPrice } from '../../../../utils/currency';

// Helper function to format book data from API
const formatBookData = (book) => {
  const basePrice = Number(book.price ?? 0);
  const pct = book.discount_percentage != null ? Number(book.discount_percentage) : null;
  const amt = book.discount_amount != null ? Number(book.discount_amount) : null;
  const discountedCalc = book.discounted_price != null
    ? Number(book.discounted_price)
    : (pct != null
      ? Math.max(0, Math.round(basePrice - (basePrice * pct) / 100))
      : (amt != null ? Math.max(0, Math.round(basePrice - amt)) : null));
  return {
    id: book.book_id,
    title: book.title,
    author: book.authors && book.authors.length > 0 ? book.authors[0].name : 'Unknown Author',
    stock_quantity: book.stock_quantity,
    originalPrice: formatPrice(basePrice),
    discountedPrice: discountedCalc != null ? formatPrice(discountedCalc) : null,
    price: discountedCalc != null ? formatPrice(discountedCalc) : formatPrice(basePrice),
    cover: getBookCoverUrl(book.image_url),
    images: [
      book.image_url ? getBookCoverUrl(book.image_url) : null,
      book.image2_url ? getBookCoverUrl(book.image2_url) : null,
      book.image3_url ? getBookCoverUrl(book.image3_url) : null,
    ].filter(Boolean),
    tag: book.is_best_seller ? "Bán chạy" : book.is_new ? "Mới ra mắt" : (discountedCalc != null ? "Giảm giá" : undefined),
    isFreeShip: !!book.is_free_ship,
    description: book.description,
    pages: book.pages,
    publishDate: book.publication_date,
    isbn: book.isbn,
    genre: book.categories && book.categories.length > 0 ? book.categories[0].name : undefined,
    category: book.categories && book.categories.length > 0 ? book.categories[0].name : undefined
  };
};



export default function BookCollection() {
  const { addToCart } = useCart();
  const { addToWishlist } = useWishlist();
  const { showToast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsClient(true);
    fetchPopularBooks();
  }, []);

  const fetchPopularBooks = async () => {
    try {
      setLoading(true);
      // Get actual best seller books based on order count from backend
      const popularBooksResponse = await getPopularBooks(4); // Get top 4 best sellers

      // Format the books data for display
      const formattedBooks = popularBooksResponse.map(book => ({
        id: book.book_id,
        title: book.title,
        author: book.authors && book.authors.length > 0 ? book.authors[0].name : 'Unknown Author',
        stock_quantity: book.stock_quantity,
        originalPrice: formatPrice(Number(book.price ?? 0)),
        discountedPrice: book.discounted_price ? formatPrice(Number(book.discounted_price)) : null,
        price: book.discounted_price ? formatPrice(Number(book.discounted_price)) : formatPrice(Number(book.price ?? 0)),
        cover: getBookCoverUrl(book.image_url),
        images: [
          book.image_url ? getBookCoverUrl(book.image_url) : null,
          book.image2_url ? getBookCoverUrl(book.image2_url) : null,
          book.image3_url ? getBookCoverUrl(book.image3_url) : null,
        ].filter(Boolean),
        tag: book.is_best_seller ? "Bán chạy" : book.is_new ? "Mới ra mắt" : (book.discounted_price ? "Giảm giá" : undefined),
        isFreeShip: !!book.is_free_ship,
        description: book.description,
        pages: book.pages,
        publishDate: book.publication_date,
        isbn: book.isbn,
        genre: book.categories && book.categories.length > 0 ? book.categories[0].name : undefined,
        category: book.categories && book.categories.length > 0 ? book.categories[0].name : undefined,
        orderCount: book.order_count || 0 // Include order count for display
      }));

      // Attach average rating per book (for display)
      const booksWithRatings = await Promise.all(
        formattedBooks.map(async (b) => {
          try {
            const reviews = await getBookReviews(b.id);
            const ratings = Array.isArray(reviews) ? reviews.map(r => r.rating) : [];
            const totalReviews = ratings.length;
            const averageRating = totalReviews > 0 ? (ratings.reduce((sum, r) => sum + r, 0) / totalReviews) : 0;
            return { ...b, averageRating, totalReviews };
          } catch {
            return { ...b, averageRating: 0, totalReviews: 0 };
          }
        })
      );
      setBooks(booksWithRatings);
    } catch (err) {
      console.error('Error fetching popular books:', err);
      setError('Failed to load popular books');
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <section className="py-20 px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008080]"></div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-20 px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={fetchPopularBooks}
            className="mt-4 px-4 py-2 bg-[#008080] text-white rounded hover:bg-[#006666] transition-colors"
          >
            Retry Loading Popular Books
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10">
        <div>
          <h2 className="text-3xl font-bold text-[#2D2D2D] relative inline-block">
            Sách Bán Chạy
            <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-[#008080]"></span>
          </h2>
          <p className="text-gray-600 mt-4 max-w-xl">Xem qua các sách bán chạy để tìm kiếm những cuốn sách phổ biến nhất.</p>
        </div>
        <Link href="/books" className="mt-4 md:mt-0 text-[#008080] font-medium hover:underline flex items-center group">
          Xem tất cả sách bán chạy
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
            addToCart={(b) => {
              const cartItem = {
                id: b.id,
                title: b.title,
                author: b.author,
                cover: b.cover,
                price: b.price,
                isFreeShip: b.isFreeShip,
                quantity: 1
              };
              addToCart(cartItem);
              showToast({ title: 'Added to cart', message: `${b.title}`, type: 'success', actionLabel: 'View Cart', onAction: () => { window.location.href = '/cart'; } });
            }}
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