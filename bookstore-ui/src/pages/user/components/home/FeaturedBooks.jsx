'use client';

import Link from '../../compat/Link';
import { useState, useEffect } from 'react';
import BookCard from './BookCard';
import BookDetailsModal from '../../../../components/BookDetailsModal';
import { useCart } from '../../../../hooks/useCart';
import { useWishlist } from '../../../../hooks/useWishlist';
import { useToast } from '../../../../contexts/ToastContext.jsx';
import { getFeaturedBooks, getNewArrivals, getBookCoverUrl, getBookReviews, getStationery } from '../../../../service/api';
import StationeryCard from './StationeryCard';
import StationeryDetailsModal from '../../../../components/StationeryDetailsModal.jsx';
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



export default function FeaturedBooks() {
  const [isClient, setIsClient] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addToCart } = useCart();
  const { addToWishlist } = useWishlist();
  const { showToast } = useToast();

  useEffect(() => {
    setIsClient(true);
    fetchFeaturedBooks();
  }, []);

  const fetchFeaturedBooks = async () => {
    try {
      setLoading(true);
      // Fetch books: new arrivals + best sellers
      const [bestBooks, newBooks] = await Promise.all([
        getFeaturedBooks().catch(() => []),
        getNewArrivals().catch(() => [])
      ]);
      const booksArr = Array.isArray(bestBooks) ? bestBooks : (bestBooks?.data || []);
      const newArr = Array.isArray(newBooks) ? newBooks : (newBooks?.data || []);
      const mergedBooksRaw = [...newArr, ...booksArr];
      const uniqueBooks = [];
      const seenBookIds = new Set();
      for (const b of mergedBooksRaw) {
        const id = b.book_id ?? b.id;
        if (!seenBookIds.has(id)) {
          seenBookIds.add(id);
          uniqueBooks.push(b);
        }
      }
      const formattedBooks = uniqueBooks.map(formatBookData);
      const withRatings = await Promise.all(
        formattedBooks.map(async (b) => {
          try {
            const reviews = await getBookReviews(b.id);
            const list = Array.isArray(reviews) ? reviews : (reviews?.items || []);
            const total = list.length;
            const average = total ? (list.reduce((s, r) => s + (r.rating || 0), 0) / total) : null;
            return { ...b, averageRating: average, totalReviews: total, type: 'book' };
          } catch (e) {
            return { ...b, averageRating: null, totalReviews: 0, type: 'book' };
          }
        })
      );

      // Fetch stationery: new + best seller
      const [newStationeryRes, bestStationeryRes] = await Promise.all([
        getStationery({ is_new: true, limit: 12 }).catch(() => []),
        getStationery({ is_best_seller: true, limit: 12 }).catch(() => []),
      ]);
      const stNew = Array.isArray(newStationeryRes) ? newStationeryRes : (newStationeryRes?.data || []);
      const stBest = Array.isArray(bestStationeryRes) ? bestStationeryRes : (bestStationeryRes?.data || []);
      const stMerged = [...stNew, ...stBest];
      const seenStIds = new Set();
      const normalizedStationery = [];
      for (const it of stMerged) {
        const sid = it.stationery_id ?? it.id;
        if (seenStIds.has(sid)) continue;
        seenStIds.add(sid);
        const basePrice = Number(it.price ?? 0);
        const pct = it.discount_percentage != null ? Number(it.discount_percentage) : null;
        const amt = it.discount_amount != null ? Number(it.discount_amount) : null;
        const discountedCalc = it.discounted_price != null
          ? Number(it.discounted_price)
          : (pct != null
            ? Math.max(0, Math.round(basePrice - (basePrice * pct) / 100))
            : (amt != null ? Math.max(0, Math.round(basePrice - amt)) : null));
        normalizedStationery.push({
          id: sid,
          title: it.title || 'Untitled',
          cover: it.image_url ? getBookCoverUrl(it.image_url) : (it.cover_image ? getBookCoverUrl(it.cover_image) : null),
          images: [it.image_url, it.image2_url, it.image3_url].filter(Boolean).map(getBookCoverUrl),
          originalPrice: formatPrice(basePrice),
          discountedPrice: discountedCalc != null ? formatPrice(discountedCalc) : null,
          price: discountedCalc != null ? formatPrice(discountedCalc) : formatPrice(basePrice),
          tag: it.is_best_seller ? 'Bán chạy' : it.is_new ? 'Mới' : (discountedCalc != null ? 'Giảm giá' : undefined),
          isFreeShip: !!it.is_free_ship,
          category: Array.isArray(it.categories) && it.categories.length > 0 ? it.categories[0].name : undefined,
          avg_rating: it.avg_rating ?? 0,
          review_count: it.review_count ?? 0,
          type: 'stationery',
          created_at: it.created_at || null
        });
      }

      // Determine "New" by created/published date
      const NEW_WINDOW_DAYS = 45;
      const now = Date.now();
      const isWithinWindow = (dateStr) => {
        if (!dateStr) return false;
        const ms = new Date(dateStr).getTime();
        if (Number.isNaN(ms)) return false;
        const diffDays = (now - ms) / (1000 * 60 * 60 * 24);
        return diffDays <= NEW_WINDOW_DAYS;
      };

      const markNew = (item) => {
        const created = item.created_at || item.publishDate || null;
        const isNew = isWithinWindow(created);
        const tag = isNew ? 'New' : item.tag;
        return { ...item, isNew, tag, created_at: created };
      };

      const allItems = [...withRatings.map(markNew), ...normalizedStationery.map(markNew)];
      // Sort: New first, then by created date desc
      allItems.sort((a, b) => {
        if (a.isNew !== b.isNew) return b.isNew - a.isNew;
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });

      setItems(allItems.slice(0, 9));
    } catch (err) {
      console.error('Error fetching featured books:', err);
      setError('Failed to load featured items');
    } finally {
      setLoading(false);
    }
  };

  const openBookDetails = (book) => {
    setSelectedBook(book);
    setIsModalOpen(true);
    // Prevent body scrolling when modal is open
    document.body.style.overflow = 'hidden';
  };

  const openItemDetails = (item) => {
    setSelectedItem(item);
    setIsItemModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeBookDetails = () => {
    setIsModalOpen(false);
    // Restore body scrolling
    document.body.style.overflow = 'auto';
  };

  const closeItemDetails = () => {
    setIsItemModalOpen(false);
    setSelectedItem(null);
    document.body.style.overflow = 'auto';
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
            onClick={fetchFeaturedBooks}
            className="mt-4 px-4 py-2 bg-[#008080] text-white rounded hover:bg-[#006666] transition-colors"
          >
            Try Again
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
            Sản phẩm Mới & Nổi Bật
            <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-[#008080]"></span>
          </h2>
          <p className="text-gray-600 mt-4 max-w-xl">Hãy khám phá những cuốn sách mới nhất và nổi bật nhất.</p>
        </div>
        <div className="flex items-center">
          <Link href="/books" className="mt-4 md:mt-0 text-[#008080] font-medium hover:underline hover:text-[#006666]  flex items-center group">
            Xem tất cả Sách
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link href="/stationery" className="mt-4 ml-5 md:mt-0 text-[#008080] font-medium hover:underline hover:text-[#006666]  flex items-center group">
            Xem tất cả dụng cụ Yoga
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
        {items.map((it) => (
          it.type === 'book' ? (
            <BookCard
              key={`book-${it.id}`}
              book={it}
              onViewDetails={() => openBookDetails(it)}
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
          ) : (
            <StationeryCard
              key={`st-${it.id}`}
              item={it}
              onViewDetails={() => openItemDetails(it)}
              addToCart={(p) => {
                const cartItem = {
                  id: p.id,
                  title: p.title,
                  cover: p.cover,
                  price: p.price,
                  isFreeShip: p.isFreeShip,
                  stationery_id: p.id,
                  quantity: 1
                };
                addToCart(cartItem);
                showToast({ title: 'Added to cart', message: `${p.title}`, type: 'success', actionLabel: 'View Cart', onAction: () => { window.location.href = '/cart'; } });
              }}
              addToWishlist={(p) => { addToWishlist(p); showToast({ title: 'Added to wishlist', message: `${p.title}`, type: 'success', actionLabel: 'View Wishlist', onAction: () => { window.location.href = '/wishlist'; } }); }}
            />
          )
        ))}
      </div>

      {/* Details Modals */}
      {isClient && selectedBook && (
        <BookDetailsModal
          book={selectedBook}
          isOpen={isModalOpen}
          onClose={closeBookDetails}
          addToCart={addToCart}
          addToWishlist={addToWishlist}
        />
      )}
      {isClient && selectedItem && (
        <StationeryDetailsModal
          item={selectedItem}
          isOpen={isItemModalOpen}
          onClose={closeItemDetails}
          addToCart={(cartItem) => { addToCart(cartItem); }}
          addToWishlist={(wishItem) => { addToWishlist(wishItem); }}
        />
      )}
    </section>
  );
}
