import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import Image from "../compat/Image";
import Link from "../compat/Link";
import { useCart } from "../../../hooks/useCart";
import { useWishlist } from "../../../hooks/useWishlist";
import { useToast } from "../../../contexts/ToastContext.jsx";
import BookCard from "../components/home/BookCard";

// Book Details Modal (aligned with FeaturedBooks design)
// Simple click toast fallback
function showClickToast(e, message) {
  // Minimal, non-blocking feedback
  if (typeof window !== 'undefined') {
    console.log(message);
  }
}

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
                {(book.category || book.tag) && (
                  <div className="absolute top-3 left-3 bg-[#008080] text-white text-xs font-medium px-2 py-1 rounded">
                    {book.tag || book.category}
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
                {(book.category || book.tag) && (
                  <span className="ml-3 px-2 py-1 bg-[#008080]/10 text-[#008080] text-sm rounded">{book.tag || book.category}</span>
                )}
              </div>

              {book.description && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-[#2D2D2D]">About this book</h3>
                  <p className="mt-2 text-gray-600 leading-relaxed">{book.description}</p>
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

// Helper: convert price string like "$24.99" to number 24.99
const parsePrice = (priceStr) => {
  if (!priceStr) return 0;
  const num = parseFloat(String(priceStr).replace(/[^0-9.]/g, ""));
  return Number.isNaN(num) ? 0 : num;
};

// Sample data (expandable later to API)
const ALL_BOOKS = [
  {
    id: 1,
    title: "The Silent Echo",
    author: "Various Authors",
    cover: "/assets/book-cover.svg",
    category: "Fiction",
    price: "$24.99",
    description: "A captivating tale that resonates through the ages.",
    isBestSeller: true,
    isNewRelease: false,
  },
  {
    id: 2,
    title: "Data Structures Explained",
    author: "Tech Writers",
    cover: "/assets/yoga_voighe.jpg",
    category: "Computer Science",
    price: "$32.50",
    description: "Clear explanations of core data structures with examples.",
    isBestSeller: true,
    isNewRelease: true,
  },
  {
    id: 3,
    title: "Modern Architecture",
    author: "Design Collective",
    cover: "/assets/Yoasoi_sang.jpg",
    category: "Art & Design",
    price: "$45.00",
    description: "Exploring contemporary architectural marvels.",
    isBestSeller: false,
    isNewRelease: true,
  },
  {
    id: 4,
    title: "Cooking Essentials",
    author: "Chef Group",
    cover: "/assets/74_lathutay.jpg",
    category: "Cooking",
    price: "$19.95",
    description: "Your guide to everyday cooking fundamentals.",
    isBestSeller: false,
    isNewRelease: false,
  },
  {
    id: 5,
    title: "The Midnight Library",
    author: "Matt Haig",
    cover: "/assets/yoga_voighe.png",
    category: "Contemporary Fiction",
    price: "$13.99",
    description: "Between life and death there is a library...",
    isBestSeller: true,
    isNewRelease: false,
  },
  {
    id: 6,
    title: "Educated",
    author: "Tara Westover",
    cover: "/assets/yoga_voighe.png",
    category: "Memoir",
    price: "$15.99",
    description: "Born to survivalists in the mountains of Idaho...",
    isBestSeller: true,
    isNewRelease: false,
  },
  {
    id: 7,
    title: "Algorithms Unlocked",
    author: "Thomas H. Cormen",
    cover: "/assets/book-cover.svg",
    category: "Computer Science",
    price: "$22.00",
    description: "A gentle introduction to algorithms.",
    isBestSeller: false,
    isNewRelease: false,
  },
  {
    id: 8,
    title: "World Travel",
    author: "Anthony Bourdain",
    cover: "/assets/Yoasoi_sang.jpg",
    category: "Travel",
    price: "$27.50",
    description: "Curated travel insights and stories.",
    isBestSeller: false,
    isNewRelease: true,
  },
  {
    id: 9,
    title: "Clean Architecture",
    author: "Robert C. Martin",
    cover: "/assets/yoga_voighe.jpg",
    category: "Computer Science",
    price: "$39.99",
    description: "A craftsman’s guide to software structure.",
    isBestSeller: true,
    isNewRelease: false,
  },
  {
    id: 10,
    title: "Art of Minimalism",
    author: "Design Collective",
    cover: "/assets/book-cover.svg",
    category: "Art & Design",
    price: "$29.00",
    description: "Design principles of minimalism.",
    isBestSeller: false,
    isNewRelease: false,
  },
  {
    id: 11,
    title: "Global Cuisines",
    author: "Chef Group",
    cover: "/assets/74_lathutay.jpg",
    category: "Cooking",
    price: "$18.95",
    description: "Recipes from around the world.",
    isBestSeller: false,
    isNewRelease: true,
  },
  {
    id: 12,
    title: "Patterns of Enterprise Application Architecture",
    author: "Martin Fowler",
    cover: "/assets/yoga_voighe.png",
    category: "Computer Science",
    price: "$41.99",
    description: "Enterprise design patterns explained.",
    isBestSeller: true,
    isNewRelease: false,
  },
  {
    id: 13,
    title: "Designing Design",
    author: "Kenya Hara",
    cover: "/assets/Yoasoi_sang.jpg",
    category: "Art & Design",
    price: "$36.00",
    description: "Philosophy of design and perception.",
    isBestSeller: false,
    isNewRelease: false,
  },
  {
    id: 14,
    title: "The Food Lab",
    author: "J. Kenji López-Alt",
    cover: "/assets/yoga_voighe.jpg",
    category: "Cooking",
    price: "$34.50",
    description: "Science of home cooking.",
    isBestSeller: false,
    isNewRelease: false,
  },
  {
    id: 15,
    title: "Refactoring",
    author: "Martin Fowler",
    cover: "/assets/book-cover.svg",
    category: "Computer Science",
    price: "$44.99",
    description: "Improving the design of existing code.",
    isBestSeller: true,
    isNewRelease: true,
  },
];

export default function BooksPage() {
  const { addToCart } = useCart();
  const { addToWishlist } = useWishlist();
  const { showToast } = useToast();
  const searchParams = new URLSearchParams(useLocation().search);
  const initialCategoryParam = searchParams.get("category") || null;
  const bestSellerParam = searchParams.get("bestSeller");
  const focusSearchParam = searchParams.get("focusSearch");
  const searchInputRef = useRef(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("relevance"); // relevance | price_asc | price_desc | title_asc
  const bestSellerInitial = bestSellerParam === "1" || bestSellerParam === "true";
  const [bestSellerOnly, setBestSellerOnly] = useState(bestSellerInitial);
  const [newReleaseOnly, setNewReleaseOnly] = useState(false);

  // Pagination (increase page size for fuller, balanced grids)
  const PAGE_SIZE = 8;
  const [page, setPage] = useState(1);

  // Derived: categories
  const categories = useMemo(() => {
    const set = new Set(["All"]);
    ALL_BOOKS.forEach((b) => set.add(b.category));
    // Ensure the category from URL appears in the selector even if no books currently match
    if (initialCategoryParam) set.add(initialCategoryParam);
    return Array.from(set);
  }, [initialCategoryParam]);

  // Initialize category from URL query (e.g., /books?category=Computer%20Science)
  useEffect(() => {
    if (initialCategoryParam) {
      setCategory(initialCategoryParam);
    }
  }, [initialCategoryParam]);

  // Auto focus search input when requested via query param
  useEffect(() => {
    if (focusSearchParam != null && searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusSearchParam]);

  // Filtering
  const filtered = useMemo(() => {
    let list = ALL_BOOKS.slice();

    // Text search (title, author)
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.author && b.author.toLowerCase().includes(q)) ||
          (b.description && b.description.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (category !== "All") {
      list = list.filter((b) => b.category === category);
    }

    // Best Seller & New Release toggles
    if (bestSellerOnly) {
      list = list.filter((b) => b.isBestSeller);
    }
    if (newReleaseOnly) {
      list = list.filter((b) => b.isNewRelease);
    }

    // Price range
    const min = minPrice !== "" ? Number(minPrice) : null;
    const max = maxPrice !== "" ? Number(maxPrice) : null;
    if (min !== null) list = list.filter((b) => parsePrice(b.price) >= min);
    if (max !== null) list = list.filter((b) => parsePrice(b.price) <= max);

    // Sorting
    if (sortBy === "price_asc") {
      list.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    } else if (sortBy === "title_asc") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }

    return list;
  }, [search, category, minPrice, maxPrice, sortBy, bestSellerOnly, newReleaseOnly]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, category, minPrice, maxPrice, sortBy, bestSellerOnly, newReleaseOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedBooks = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = () => {
    setSearch("");
    setCategory("All");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("relevance");
    setBestSellerOnly(false);
    setNewReleaseOnly(false);
  };

  const openBookDetails = (book) => {
    setSelectedBook(book);
    setIsModalOpen(true);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  };

  const closeBookDetails = () => {
    setIsModalOpen(false);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'auto';
    }
  };

  return (
    <section className="pt-24 pb-8 px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#2D2D2D] relative inline-block">
            All Books
            <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-[#008080]"></span>
          </h1>
          <p className="text-gray-600 mt-4 max-w-xl">
            Browse our complete catalog. Use advanced filters to narrow down your search.
          </p>
        </div>
        <Link href="/" className="mt-4 md:mt-0 text-[#008080] font-medium hover:underline flex items-center group">
          Back to home
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
      {/* Quick filter toolbar */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-sm text-gray-600">Showing {filtered.length} results</div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setBestSellerOnly((v) => !v)}
            className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${bestSellerOnly ? "bg-[#008080] text-white border-[#008080]" : "bg-white text-[#2D2D2D] border-gray-300 hover:bg-gray-50"}`}
            aria-pressed={bestSellerOnly}
          >
            Best Sellers
          </button>
          <button
            onClick={() => setNewReleaseOnly((v) => !v)}
            className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${newReleaseOnly ? "bg-[#008080] text-white border-[#008080]" : "bg-white text-[#2D2D2D] border-gray-300 hover:bg-gray-50"}`}
            aria-pressed={newReleaseOnly}
          >
            New Releases
          </button>
        </div>
      </div>

      {/* Two-column layout: left advanced filters, right content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: All Filters */}
        <aside className="md:col-span-3 md:sticky md:top-24 md:self-start max-h-[calc(100vh-8rem)] overflow-auto">
          <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#2D2D2D] mb-4">Filters</h2>

            {/* Search */}
            <div className="mb-4">
              <label className="text-sm text-gray-600">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Title, author, description"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#008080]"
                ref={searchInputRef}
              />
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className="text-sm text-gray-600">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#008080]"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Highlights */}
            <div className="mb-6">
              <label className="text-sm text-gray-600">Highlights</label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => setBestSellerOnly((v) => !v)}
                  className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${bestSellerOnly ? "bg-[#008080] text-white border-[#008080]" : "bg-white text-[#2D2D2D] border-gray-300 hover:bg-gray-50"}`}
                  aria-pressed={bestSellerOnly}
                >
                  Best Sellers
                </button>
                <button
                  onClick={() => setNewReleaseOnly((v) => !v)}
                  className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${newReleaseOnly ? "bg-[#008080] text-white border-[#008080]" : "bg-white text-[#2D2D2D] border-gray-300 hover:bg-gray-50"}`}
                  aria-pressed={newReleaseOnly}
                >
                  New Releases
                </button>
              </div>
            </div>

            {/* Sort by */}
            <div className="mb-6">
              <label className="text-sm text-gray-600">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#008080]"
              >
                <option value="relevance">Relevance</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="title_asc">Title: A to Z</option>
              </select>
            </div>

            {/* Price range */}
            <div className="mb-4">
              <label className="text-sm text-gray-600">Min price ($)</label>
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#008080]"
              />
            </div>
            <div className="mb-4">
              <label className="text-sm text-gray-600">Max price ($)</label>
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#008080]"
              />
            </div>

            <button
              onClick={resetFilters}
              className="w-full px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Reset filters
            </button>
          </div>
        </aside>

        {/* Right: Only books and pagination */}
        <main className="md:col-span-9">
          {/* Results Grid */}
          {pagedBooks.length === 0 ? (
            <div className="text-center text-gray-600 py-10">No books match your filters.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {pagedBooks.map((book) => (
                <BookCard 
                  key={book.id} 
                  book={book} 
                  addToCart={(b) => { addToCart(b); showToast({ title: 'Added to cart', message: `${b.title}`, type: 'success', actionLabel: 'View Cart', onAction: () => { window.location.href = '/cart'; } }); }} 
                  addToWishlist={(b) => { addToWishlist(b); showToast({ title: 'Added to wishlist', message: `${b.title}`, type: 'success', actionLabel: 'View Wishlist', onAction: () => { window.location.href = '/wishlist'; } }); }} 
                  onViewDetails={() => openBookDetails(book)} 
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="mt-8 flex items-center justify-center md:justify-between">
            <div className="hidden md:block text-sm text-gray-600">Page {page} of {totalPages}</div>
            <div className="flex items-center justify-center space-x-2">
              <button
                className="px-3 py-2 border rounded-md disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const idx = i + 1;
                const active = idx === page;
                return (
                  <button
                    key={idx}
                    className={`px-3 py-2 border rounded-md ${active ? "bg-[#008080] text-white border-[#008080]" : "bg-white"}`}
                    onClick={() => setPage(idx)}
                  >
                    {idx}
                  </button>
                );
              })}
              <button
                className="px-3 py-2 border rounded-md disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </main>
      </div>
      {/* Book Details Modal */}
      {selectedBook && (
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

// (Local BookCard implementation removed in favor of shared component)