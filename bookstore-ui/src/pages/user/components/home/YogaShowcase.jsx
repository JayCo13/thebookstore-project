import Link from '../../compat/Link.jsx';
import { useEffect, useState } from 'react';
import StationeryCard from './StationeryCard.jsx';
import StationeryDetailsModal from '../../../../components/StationeryDetailsModal.jsx';
import { useCart } from '../../../../hooks/useCart.js';
import { useWishlist } from '../../../../hooks/useWishlist.js';
import { useToast } from '../../../../contexts/ToastContext.jsx';
import { getStationery, getBookCoverUrl, getStationeryReviews, getStationeryCategories } from '../../../../service/api.js';
import { formatPrice } from '../../../../utils/currency.js';

const formatItem = (item) => {
  const images = [
    item.image_url ? getBookCoverUrl(item.image_url) : null,
    item.image2_url ? getBookCoverUrl(item.image2_url) : null,
    item.image3_url ? getBookCoverUrl(item.image3_url) : null,
  ].filter(Boolean);
  const cover = images[0] || 'https://via.placeholder.com/300x450/008080/ffffff?text=No+Image';
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
    cover,
    images,
    category: item.categories && item.categories.length > 0 ? item.categories[0].name : 'Uncategorized',
    originalPrice: formatPrice(basePrice),
    discountedPrice: discountedCalc != null ? formatPrice(discountedCalc) : null,
    price: discountedCalc != null ? formatPrice(discountedCalc) : formatPrice(basePrice),
    tag: item.is_best_seller ? 'Best Seller' : item.is_new ? 'New' : (item.is_discount ? 'Discount' : null),
    stock_quantity: item.stock_quantity || 0,
  };
};

export default function YogaShowcase() {
  const { addToCart } = useCart();
  const { addToWishlist } = useWishlist();
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const loadYogaItems = async () => {
      try {
        setLoading(true);

        // Get all categories and find Yoga categories
        const categoriesResponse = await getStationeryCategories();
        const allCategories = Array.isArray(categoriesResponse) ? categoriesResponse : (categoriesResponse?.data || []);
        const yogaCats = allCategories.filter(cat => cat.name.toLowerCase().includes('yoga'));
        const yogaIds = yogaCats.map(cat => cat.category_id);

        if (yogaIds.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }

        // Fetch items from all Yoga categories
        const allYogaItems = [];
        for (const categoryId of yogaIds) {
          const res = await getStationery({ skip: 0, limit: 24, category_id: categoryId });
          const raw = Array.isArray(res) ? res : (res?.data || []);
          allYogaItems.push(...raw);
        }

        // Remove duplicates
        const uniqueItems = allYogaItems.filter((item, index, self) =>
          index === self.findIndex(t => t.stationery_id === item.stationery_id)
        );

        // Pick newest 4 items
        const formatted = uniqueItems.map(formatItem).sort((a, b) => b.id - a.id).slice(0, 4);

        // Compute rating & count for display
        const withRatings = await Promise.all(
          formatted.map(async (it) => {
            try {
              const reviewsRes = await getStationeryReviews(it.id);
              const list = Array.isArray(reviewsRes?.data) ? reviewsRes.data : (Array.isArray(reviewsRes) ? reviewsRes : []);
              const count = list.length;
              const avg = count ? list.reduce((s, r) => s + (r.rating || 0), 0) / count : 0;
              return { ...it, avg_rating: avg, review_count: count };
            } catch {
              return { ...it, avg_rating: 0, review_count: 0 };
            }
          })
        );
        setItems(withRatings);
      } catch (e) {
        console.error('Error loading yoga showcase:', e);
        setError('Không thể tải dụng cụ yoga');
      } finally {
        setLoading(false);
      }
    };
    loadYogaItems();
  }, []);

  const openItem = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
    if (typeof document !== 'undefined') document.body.style.overflow = 'hidden';
  };

  const closeItem = () => {
    setIsModalOpen(false);
    if (typeof document !== 'undefined') document.body.style.overflow = 'auto';
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
          <Link href="/stationery" className="mt-4 inline-block px-4 py-2 bg-[#008080] text-white rounded hover:bg-[#006666] transition-colors">
            Xem tất cả dụng cụ Yoga
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10">
        <div>
          <h2 className="text-3xl font-bold text-[#2D2D2D] relative inline-block">
            Dụng Cụ Yoga
            <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-[#008080]"></span>
          </h2>
          <p className="text-gray-600 mt-4 max-w-xl">Phụ kiện học tập và làm việc, chọn lọc mới nhất.</p>
        </div>
        <Link href="/yoga" className="mt-4 md:mt-0 text-[#008080] font-medium hover:underline flex items-center group">
          Xem tất cả dụng cụ Yoga
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Signature subtle background accent */}
      <div className="relative">
        <div className="absolute inset-x-0 -top-6 h-16 bg-gradient-to-r from-teal-50 via-white to-teal-50 rounded-2xl blur-sm"></div>
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {items.map((item) => (
            <StationeryCard
              key={item.id}
              item={item}
              onViewDetails={() => openItem(item)}
              addToCart={(p) => {
                const cartItem = { id: p.id, title: p.title, cover: p.cover, price: p.price, quantity: 1 };
                addToCart(cartItem);
                showToast({ title: 'Thêm vào giỏ hàng', message: `${p.title}`, type: 'success', actionLabel: 'Xem giỏ hàng', onAction: () => { window.location.href = '/cart'; } });
              }}
              addToWishlist={(p) => { addToWishlist(p); showToast({ title: 'Đã thêm vào yêu thích', message: `${p.title}`, type: 'success', actionLabel: 'Xem yêu thích', onAction: () => { window.location.href = '/wishlist'; } }); }}
            />
          ))}
        </div>
      </div>

      {isClient && selectedItem && (
        <StationeryDetailsModal item={selectedItem} isOpen={isModalOpen} onClose={closeItem} addToCart={addToCart} addToWishlist={addToWishlist} />
      )}
    </section>
  );
}