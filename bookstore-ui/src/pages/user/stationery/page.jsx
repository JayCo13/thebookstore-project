import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import Link from "../compat/Link";
import { useCart } from "../../../hooks/useCart";
import { useWishlist } from "../../../hooks/useWishlist";
import { useToast } from "../../../contexts/ToastContext.jsx";
import StationeryCard from "../components/home/StationeryCard";
import { getStationery, getStationeryCategories, getBookCoverUrl } from '../../../service/api';
import { formatPrice } from '../../../utils/currency';
import StationeryDetailsModal from '../../../components/StationeryDetailsModal.jsx';

// Helper: convert price string like "$24.99" to number 24.99
const parsePrice = (priceStr) => {
  const num = parseFloat(String(priceStr).replace(/[^0-9.]/g, ""));
  return Number.isNaN(num) ? 0 : num;
};

// Helper: format stationery data from API to match component expectations
const formatItemData = (item) => {
  // Handle image URL with fallback
  let coverUrl = null;
  if (item.image_url) {
    coverUrl = getBookCoverUrl(item.image_url);
  }

  // Fallback to a placeholder image if no cover is available
  if (!coverUrl) {
    coverUrl = 'https://via.placeholder.com/300x450/008080/ffffff?text=No+Image';
  }

  const basePrice = Number(item.price ?? 0);
  const pct = item.discount_percentage != null ? Number(item.discount_percentage) : null;
  const amt = item.discount_amount != null ? Number(item.discount_amount) : null;
  const discountedCalc = item.discounted_price != null
    ? Number(item.discounted_price)
    : (pct != null
      ? Math.max(0, Math.round(basePrice - (basePrice * pct) / 100))
      : (amt != null ? Math.max(0, Math.round(basePrice - amt)) : null));

  return {
    id: item.stationery_id,
    title: item.title || 'Untitled',
    cover: coverUrl,
    images: [
      item.image_url ? getBookCoverUrl(item.image_url) : null,
      item.image2_url ? getBookCoverUrl(item.image2_url) : null,
      item.image3_url ? getBookCoverUrl(item.image3_url) : null,
    ].filter(Boolean),
    category: item.categories && item.categories.length > 0 ? item.categories[0].name : 'Uncategorized',
    originalPrice: formatPrice(basePrice),
    discountedPrice: discountedCalc != null ? formatPrice(discountedCalc) : null,
    price: discountedCalc != null ? formatPrice(discountedCalc) : formatPrice(basePrice),
    description: item.short_description || item.description || 'No description available',
    isBestSeller: item.is_best_seller || false,
    isNewRelease: item.is_new || false,
    tag: item.is_best_seller ? "Best Seller" : item.is_new ? "New" : (item.is_discount ? "Discount" : null),
    stock_quantity: item.stock_quantity || 0,
    total_sold: item.total_sold || 0  // Sales data from backend
  };
};

export default function StationeryPage() {
  const { addToCart } = useCart();
  const { addToWishlist } = useWishlist();
  const { showToast } = useToast();
  const searchParams = new URLSearchParams(useLocation().search);
  const initialCategoryParam = searchParams.get("category") || null;
  const focusSearchParam = searchParams.get("focusSearch");
  const searchInputRef = useRef(null);

  // State
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(""); // Debounced search value
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("relevance");
  // Filter mode: null | 'bestseller' | 'new' (mutually exclusive)
  const [filterMode, setFilterMode] = useState(null);

  // Filter data
  const [categoriesData, setCategoriesData] = useState([]);
  const [yogaCategoryIds, setYogaCategoryIds] = useState([]);

  // Pagination
  const PAGE_SIZE = 9;
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Fetch stationery from API with filter support
  const fetchItems = async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        skip: 0,
        limit: 100,
        ...filters
      };
      Object.keys(params).forEach(key => {
        if (params[key] === undefined || params[key] === null || params[key] === '') {
          delete params[key];
        }
      });
      const response = await getStationery(params);
      const allItems = (Array.isArray(response) ? response : (response?.data || []));

      // Filter out items that have ANY Yoga category
      const nonYogaItems = allItems.filter(item => {
        // Check if item has any yoga-related categories
        if (!item.categories || item.categories.length === 0) return true;

        const hasYogaCategory = item.categories.some(cat =>
          yogaCategoryIds.includes(cat.category_id)
        );

        return !hasYogaCategory; // Only include items WITHOUT yoga categories
      });

      const formatted = nonYogaItems.map(formatItemData);
      setItems(formatted);
    } catch (err) {
      console.error('Error fetching stationery:', err);
      setError('Failed to load stationery. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories for filter
  const fetchFilterData = async () => {
    try {
      const categoriesResponse = await getStationeryCategories();
      const allCategories = Array.isArray(categoriesResponse) ? categoriesResponse : (categoriesResponse?.data || []);

      // Identify Yoga categories
      const yogaCats = allCategories.filter(cat =>
        cat.name.toLowerCase().includes('yoga')
      );
      const yogaIds = yogaCats.map(cat => cat.category_id);
      setYogaCategoryIds(yogaIds);

      // Filter out Yoga categories from the dropdown
      const nonYogaCategories = allCategories.filter(cat =>
        !cat.name.toLowerCase().includes('yoga')
      );

      setCategoriesData(nonYogaCategories);
      console.log('Excluded Yoga categories from stationery page:', yogaCats.map(c => c.name));
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchFilterData();
    setIsClient(true);
  }, []);

  // Debounce search input - wait 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Fetch items when filters change (only after yoga categories are identified, using debounced search)
  useEffect(() => {
    if (yogaCategoryIds.length > 0) {
      const filters = {};
      if (selectedCategoryId) filters.category_id = selectedCategoryId;
      if (debouncedSearch.trim()) filters.search = debouncedSearch.trim();
      fetchItems(filters);
    }
  }, [yogaCategoryIds, selectedCategoryId, debouncedSearch]);

  // Initialize category from URL query
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
    let list = items.slice();
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.description && b.description.toLowerCase().includes(q))
      );
    }

    // Filter by mode
    if (filterMode === 'new') {
      // Sort by newest items (most recent first)
      list.sort((a, b) => {
        const dateA = a.id || 0; // Use ID as proxy for creation order
        const dateB = b.id || 0;
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
  }, [items, debouncedSearch, minPrice, maxPrice, sortBy, filterMode]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, selectedCategoryId, minPrice, maxPrice, sortBy, filterMode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = () => {
    setSearch("");
    setSelectedCategoryId(null);
    setMinPrice("");
    setMaxPrice("");
    setSortBy("relevance");
    setFilterMode(null);
  };

  const openItemDetails = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  };

  const closeItemDetails = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
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
            Mua Sắm Văn Phòng Phẩm
            <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-[#008080]"></span>
          </h1>
          <p className="text-gray-600 mt-4 max-w-xl">
            Khám phá và mua sắm các sản phẩm văn phòng phẩm chất lượng.
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
          <span className="ml-3 text-gray-600">Đang tải văn phòng phẩm...</span>
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

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Quick filter toolbar */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-sm text-gray-600">Tìm thấy <span className="font-bold">{filtered.length}</span> sản phẩm</div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm text-gray-600">Hiển Thị: </label>
              <button
                onClick={() => setFilterMode(filterMode === 'bestseller' ? null : 'bestseller')}
                className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${filterMode === 'bestseller' ? "bg-[#008080] text-white border-[#008080]" : "bg-white text-[#2D2D2D] border-gray-300 hover:bg-gray-50"}`}
                aria-pressed={filterMode === 'bestseller'}
              >
                Bán Chạy
              </button>
              <button
                onClick={() => setFilterMode(filterMode === 'new' ? null : 'new')}
                className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${filterMode === 'new' ? "bg-[#008080] text-white border-[#008080]" : "bg-white text-[#2D2D2D] border-gray-300 hover:bg-gray-50"}`}
                aria-pressed={filterMode === 'new'}
              >
                Mới (30 ngày)
              </button>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left: Filters */}
            <aside className="md:col-span-3 md:sticky md:top-24 md:self-start max-h-[calc(100vh-8rem)] overflow-auto">
              <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-[#2D2D2D] mb-4">Bộ Lọc</h2>

                {/* Search */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm kiếm theo tiêu đề, mô tả..."
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
                    <option value="">Tất Cả Danh Mục</option>
                    {categoriesData.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.name}
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

            {/* Right: Grid & Pagination */}
            <main className="md:col-span-9">
              {pagedItems.length === 0 ? (
                <div className="text-center text-gray-600 py-10">Hiện không có sản phẩm nào phù hợp với bộ lọc của bạn.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                  {pagedItems.map((item) => (
                    <StationeryCard
                      key={item.id}
                      item={item}
                      addToCart={(p) => {
                        const cartItem = {
                          id: p.id,
                          title: p.title,
                          author: '',
                          cover: p.cover,
                          price: p.price,
                          quantity: 1
                        };
                        addToCart(cartItem);
                        showToast({ title: 'Thêm vào giỏ hàng thành công', message: `${p.title}`, type: 'success', actionLabel: 'Xem giỏ hàng', onAction: () => { window.location.href = '/cart'; } });
                      }}
                      addToWishlist={(p) => {
                        addToWishlist({ id: p.id, title: p.title, cover: p.cover, price: p.price });
                        showToast({ title: 'Thêm vào yêu thích', message: `${p.title}`, type: 'success', actionLabel: 'Xem yêu thích', onAction: () => { window.location.href = '/wishlist'; } });
                      }}
                      onViewDetails={() => openItemDetails(item)}
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

      {/* Stationery Details Modal */}
      {isClient && selectedItem && (
        <StationeryDetailsModal
          item={selectedItem}
          isOpen={isModalOpen}
          onClose={closeItemDetails}
          addToCart={(cartItem) => {
            addToCart(cartItem);
          }}
          addToWishlist={(wishItem) => {
            addToWishlist(wishItem);
          }}
        />
      )}

    </section>
  );
}