import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import Link from "../compat/Link";
import { useCart } from "../../../hooks/useCart";
import { useWishlist } from "../../../hooks/useWishlist";
import { useToast } from "../../../contexts/ToastContext.jsx";
import BookCard from "../components/home/BookCard";
import BookDetailsModal from "../../../components/BookDetailsModal";
import { getBooks, getBookCoverUrl, getCategories, getAuthors, getBookReviews } from '../../../service/api';
import { formatPrice } from '../../../utils/currency';



// Helper: convert price string like "$24.99" to number 24.99
const parsePrice = (priceStr) => {
  const num = parseFloat(priceStr.replace(/[^0-9.]/g, ""));
  return Number.isNaN(num) ? 0 : num;
};

// Mock data removed - now using API data

// Helper: format book data from API to match component expectations
const formatBookData = (book) => {
  // Handle image URL with fallback
  let coverUrl = null;
  if (book.image_url) {
    coverUrl = getBookCoverUrl(book.image_url);
  } else if (book.cover_image) {
    coverUrl = getBookCoverUrl(book.cover_image);
  }

  // Fallback to a placeholder image if no cover is available
  if (!coverUrl) {
    coverUrl = 'https://via.placeholder.com/300x450/008080/ffffff?text=No+Cover';
  }

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
    title: book.title || 'Untitled',
    author: book.authors && book.authors.length > 0 ? book.authors.map(a => a.name).join(', ') : 'Unknown Author',
    cover: coverUrl,
    images: [
      book.image_url ? getBookCoverUrl(book.image_url) : null,
      book.image2_url ? getBookCoverUrl(book.image2_url) : null,
      book.image3_url ? getBookCoverUrl(book.image3_url) : null,
    ].filter(Boolean),
    category: book.categories && book.categories.length > 0 ? book.categories[0].name : 'Uncategorized',
    originalPrice: formatPrice(basePrice),
    discountedPrice: discountedCalc != null ? formatPrice(discountedCalc) : null,
    price: discountedCalc != null ? formatPrice(discountedCalc) : formatPrice(basePrice),
    description: book.brief_description || book.full_description || 'No description available',
    isBestSeller: book.is_best_seller || false,
    isNewRelease: book.is_new || false,
    pages: book.pages,
    publishDate: book.publication_date,
    isbn: book.isbn,
    genre: book.categories && book.categories.length > 0 ? book.categories.map(c => c.name).join(', ') : 'Unknown',
    tag: book.is_best_seller ? "Best Seller" : book.is_new ? "New Release" : (discountedCalc != null ? "Discount" : null),
    stock_quantity: book.stock_quantity || 0,
    total_sold: book.total_sold || 0  // Sales data from backend
  };
};

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

  // State
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(""); // Debounced search value

  const [selectedAuthorId, setSelectedAuthorId] = useState(null); // New author filter state
  const [selectedCategoryId, setSelectedCategoryId] = useState(null); // New category ID filter state
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("relevance"); // relevance | price_asc | price_desc | title_asc
  const bestSellerInitial = bestSellerParam === "1" || bestSellerParam === "true";
  // Filter mode: null | 'bestseller' | 'new' (mutually exclusive)
  const [filterMode, setFilterMode] = useState(bestSellerInitial ? 'bestseller' : null);

  // Additional state for filter data
  const [categoriesData, setCategoriesData] = useState([]);
  const [authorsData, setAuthorsData] = useState([]);

  // Pagination (increase page size for fuller, balanced grids)
  const PAGE_SIZE = 9;
  const [page, setPage] = useState(1);

  // Fetch books from API with filter support
  const fetchBooks = async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Build filter parameters for API
      const params = {
        skip: 0,
        limit: 100, // Get more books for client-side filtering
        ...filters
      };

      // Remove undefined/null values
      Object.keys(params).forEach(key => {
        if (params[key] === undefined || params[key] === null || params[key] === '') {
          delete params[key];
        }
      });

      const response = await getBooks(params);
      const formattedBooks = response.map(formatBookData);
      // Attach average rating per book (simple client-side aggregation)
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
      console.error('Error fetching books:', err);
      setError('Failed to load books. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories and authors for filter dropdowns
  const fetchFilterData = async () => {
    try {
      const [categoriesResponse, authorsResponse] = await Promise.all([
        getCategories(),
        getAuthors()
      ]);
      setCategoriesData(categoriesResponse);
      setAuthorsData(authorsResponse);
    } catch (err) {
      console.error('Error fetching filter data:', err);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchFilterData();
    fetchBooks();
  }, []);

  // Debounce search input - wait 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Fetch books when filters change (using debounced search)
  useEffect(() => {
    const filters = {};

    if (selectedCategoryId) {
      filters.category_id = selectedCategoryId;
    }

    if (selectedAuthorId) {
      filters.author_id = selectedAuthorId;
    }

    if (debouncedSearch.trim()) {
      filters.search = debouncedSearch.trim();
    }

    fetchBooks(filters);
  }, [selectedCategoryId, selectedAuthorId, debouncedSearch]);

  // Initialize category from URL query (e.g., /books?category=Computer%20Science)
  useEffect(() => {
    if (initialCategoryParam && categoriesData.length > 0) {
      const category = categoriesData.find(cat => cat.name === initialCategoryParam);
      if (category) {
        setSelectedCategoryId(category.category_id);
      }
    }
  }, [initialCategoryParam, categoriesData]);

  // Auto focus search input when requested via query param
  useEffect(() => {
    if (focusSearchParam != null && searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusSearchParam]);

  // Filtering
  const filtered = useMemo(() => {
    let list = books.slice();

    // Text search (title, author)
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.author && b.author.toLowerCase().includes(q)) ||
          (b.description && b.description.toLowerCase().includes(q))
      );
    }



    // Filter by mode
    if (filterMode === 'new') {
      // Sort by newest items (most recent first)
      list.sort((a, b) => {
        const dateA = a.publishDate ? new Date(a.publishDate) : new Date(0);
        const dateB = b.publishDate ? new Date(b.publishDate) : new Date(0);
        return dateB - dateA; // Newest first
      });
    } else if (filterMode === 'bestseller') {
      // Sort by actual sales data (highest sales first)
      list.sort((a, b) => {
        const salesA = a.total_sold || 0;
        const salesB = b.total_sold || 0;
        return salesB - salesA; // Highest sales first
      });
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
  }, [books, debouncedSearch, minPrice, maxPrice, sortBy, filterMode]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, selectedCategoryId, selectedAuthorId, minPrice, maxPrice, sortBy, filterMode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedBooks = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = () => {
    setSearch("");
    setSelectedCategoryId(null);
    setSelectedAuthorId(null);
    setMinPrice("");
    setMaxPrice("");
    setSortBy("relevance");
    setFilterMode(null);
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
            Mua Sắm Sách
            <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-[#008080]"></span>
          </h1>
          <p className="text-gray-600 mt-4 max-w-xl">
            Tìm kiếm sách theo tiêu chí mong muốn của quý khách và nhận những cuốn sách yêu thích của mình!
          </p>
        </div>
        <Link href="/" className="mt-4 md:mt-0 text-[#008080] font-medium hover:underline flex items-center group">
          Về Trang Chủ
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008080]"></div>
          <span className="ml-3 text-gray-600">Đang tải sách...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-2">⚠️ Error</div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Thử Lại
          </button>
        </div>
      )}

      {/* Content - only show when not loading and no error */}
      {!loading && !error && (
        <>
          {/* Quick filter toolbar */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-sm text-gray-600">Tìm thấy <span className="font-bold">{filtered.length}</span> cuốn sách</div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm text-gray-600">Hiển Thị: </label>
              <button
                onClick={() => setFilterMode(filterMode === 'bestseller' ? null : 'bestseller')}
                className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${filterMode === 'bestseller' ? "bg-[#008080] text-white border-[#008080]" : "bg-white text-[#2D2D2D] border-gray-300 hover:bg-gray-50"}`}
                aria-pressed={filterMode === 'bestseller'}
              >
                Sách Bán Chạy
              </button>
              <button
                onClick={() => setFilterMode(filterMode === 'new' ? null : 'new')}
                className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${filterMode === 'new' ? "bg-[#008080] text-white border-[#008080]" : "bg-white text-[#2D2D2D] border-gray-300 hover:bg-gray-50"}`}
                aria-pressed={filterMode === 'new'}
              >
                Sách Mới (30 ngày)
              </button>
            </div>
          </div>

          {/* Two-column layout: left advanced filters, right content */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left: All Filters */}
            <aside className="md:col-span-3 md:sticky md:top-24 md:self-start max-h-[calc(100vh-8rem)] overflow-auto">
              <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-[#2D2D2D] mb-4">Bộ Lọc</h2>

                {/* Search */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm kiếm theo tiêu đề, tác giả, mô tả..."
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#008080]"
                    ref={searchInputRef}
                  />
                </div>



                {/* API Category Filter */}
                <div className="mb-4">
                  <label className="text-sm text-gray-600">Danh Mục</label>
                  <select
                    value={selectedCategoryId || ""}
                    onChange={(e) => setSelectedCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#008080]"
                  >
                    <option value="">Tất Cả Các Danh Mục</option>
                    {categoriesData.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Author Filter */}
                <div className="mb-4">
                  <label className="text-sm text-gray-600">Tác Giả</label>
                  <select
                    value={selectedAuthorId || ""}
                    onChange={(e) => setSelectedAuthorId(e.target.value ? parseInt(e.target.value) : null)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#008080]"
                  >
                    <option value="">Tất Cả Các Tác Giả</option>
                    {authorsData.map((author) => (
                      <option key={author.author_id} value={author.author_id}>
                        {author.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort by */}
                <div className="mb-6">
                  <label className="text-sm text-gray-600">Sắp Xếp Theo</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#008080]"
                  >
                    <option value="relevance">Lựa Chọn Hiển Thị</option>
                    <option value="price_asc">Giá: Từ thấp đến cao</option>
                    <option value="price_desc">Giá: Từ cao đến thấp</option>
                    <option value="title_asc">Tiêu Đề: A đến Z</option>
                  </select>
                </div>

                {/* Price range */}
                <div className="mb-4">
                  <label className="text-sm text-gray-600">Giá Từ (₫)</label>
                  <input
                    type="number"
                    min="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#008080]"
                  />
                </div>
                <div className="mb-4">
                  <label className="text-sm text-gray-600">Giá Đến (₫)</label>
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
                  Đặt lại bộ lọc
                </button>
              </div>
            </aside>

            {/* Right: Only books and pagination */}
            <main className="md:col-span-9">
              {/* Results Grid */}
              {pagedBooks.length === 0 ? (
                <div className="text-center text-gray-600 py-10">Hiện không có sách nào phù hợp với bộ lọc của bạn.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                  {pagedBooks.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      addToCart={(b) => {
                        const cartItem = {
                          id: b.id,
                          title: b.title,
                          author: b.author,
                          cover: b.cover,
                          price: b.price,
                          quantity: 1
                        };
                        addToCart(cartItem);
                        showToast({ title: 'Thêm vào giỏ hàng thành công', message: `${b.title}`, type: 'success', actionLabel: 'Xem giỏ hàng', onAction: () => { window.location.href = '/cart'; } });
                      }}
                      addToWishlist={(b) => { addToWishlist(b); showToast({ title: 'Thêm vào danh sách yêu thích thành công', message: `${b.title}`, type: 'success', actionLabel: 'Xem danh sách yêu thích', onAction: () => { window.location.href = '/wishlist'; } }); }}
                      onViewDetails={() => openBookDetails(book)}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              <div className="mt-8 flex items-center justify-center md:justify-between">
                <div className="hidden md:block text-sm text-gray-600">Trang {page} của {totalPages}</div>
                <div className="flex items-center justify-center space-x-2">
                  <button
                    className="px-3 py-2 border rounded-md disabled:opacity-50"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Quay lại
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      className={`px-3 py-2 border rounded-md ${page === pageNum ? "bg-[#008080] text-white border-[#008080]" : "bg-white text-[#2D2D2D] border-gray-300 hover:bg-gray-50"}`}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    className="px-3 py-2 border rounded-md disabled:opacity-50"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Tiếp theo
                  </button>
                </div>
              </div>
            </main>
          </div>
        </>
      )}

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