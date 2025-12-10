import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Link from '../compat/Link';
import { useCart } from '../../../hooks/useCart';
import { useToast } from '../../../contexts/ToastContext.jsx';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { getStationeryItem, getStationeryBySlug, getBookCoverUrl, getStationeryReviews, createStationeryReview, moderateReview } from '../../../service/api';
import { formatPrice } from '../../../utils/currency';
import ProductDetailLayout from '../components/ProductDetailLayout.jsx';
import ConfirmDialog from '../../../components/ConfirmDialog.jsx';

export default function StationeryDetailsPage() {
  const params = useParams();
  const slug = params.slug ?? params.id;
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showLowRatingDialog, setShowLowRatingDialog] = useState(false);
  // Simple spam prevention: after 3 attempts, block for 1 minute
  const [attemptCount, setAttemptCount] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState(null);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        setError(null);
        let data = null;
        const maybeId = Number(slug);
        if (Number.isFinite(maybeId) && String(maybeId) === slug) {
          data = await getStationeryItem(maybeId);
        } else {
          data = await getStationeryBySlug(slug);
        }
        setItem(data);
        if (data?.image_url) setSelectedImage(getBookCoverUrl(data.image_url));
      } catch (err) {
        console.error('Error loading stationery item:', err);
        setError('Không thể tải sản phẩm. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [slug]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!item?.stationery_id) return;
      setLoadingReviews(true);
      setReviewsError(null);
      try {
        const res = await getStationeryReviews(parseInt(item.stationery_id));
        setReviews(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        if (err?.status === 401) {
          setAuthRequired(true);
        } else {
          setReviewsError('Không thể tải đánh giá.');
        }
      } finally {
        setLoadingReviews(false);
      }
    };
    fetchReviews();
  }, [item?.stationery_id]);

  // Derived average rating for display
  const totalReviews = reviews.length;
  const averageRating = totalReviews
    ? (reviews.reduce((sum, rv) => sum + (rv.rating || 0), 0) / totalReviews)
    : null;

  const submitReview = async () => {
    if (!item) return;
    if (reviewRating < 1) {
      showToast({ title: 'Đánh giá', message: 'Vui lòng chọn số sao', type: 'warning' });
      return;
    }
    if (!reviewComment.trim()) {
      showToast({ title: 'Đánh giá', message: 'Vui lòng nhập nhận xét', type: 'warning' });
      return;
    }
    try {
      setSubmittingReview(true);
      // Server-side AI moderation
      try {
        const moderation = await moderateReview({
          text: reviewComment.trim(),
          rating: reviewRating,
          stationery_id: item.stationery_id,
          language: 'vi',
        });
        if (!moderation?.approved) {
          const reason = moderation?.reason || 'Nội dung không phù hợp';
          showToast({ title: 'Đánh giá', message: `Bị từ chối: ${reason}`, type: 'warning' });
          return;
        }
      } catch (modErr) {
        console.warn('Moderation unavailable:', modErr);
        showToast({ title: 'Đánh giá', message: 'Hệ thống kiểm duyệt đang bận. Vui lòng thử lại sau.', type: 'error' });
        return;
      }

      const payload = { rating: reviewRating, comment: reviewComment.trim() };
      const res = await createStationeryReview(parseInt(item.stationery_id), payload);
      const newReview = res?.review || res || payload;
      setReviews((prev) => [
        { ...newReview, rating: reviewRating, comment: reviewComment.trim(), created_at: new Date().toISOString() },
        ...prev,
      ]);
      setReviewRating(0);
      setHoverRating(0);
      setReviewComment('');
      showToast({ title: 'Đánh giá', message: 'Gửi đánh giá thành công', type: 'success' });
    } catch (err) {
      console.error('Error creating review:', err);
      const msg = err?.message || 'Gửi đánh giá thất bại. Vui lòng đăng nhập và thử lại.';
      showToast({ title: 'Đánh giá', message: msg, type: 'error' });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSubmitReview = () => {
    if (!item) return;
    const now = Date.now();
    if (blockedUntil && now < blockedUntil) {
      const remaining = Math.ceil((blockedUntil - now) / 1000);
      showToast({
        title: 'Chống spam',
        message: `Vui lòng thử lại sau ${remaining} giây.`,
        type: 'warning',
      });
      return;
    }
    const nextAttempts = attemptCount + 1;
    if (nextAttempts >= 3) {
      setBlockedUntil(now + 60_000);
      setAttemptCount(0);
      showToast({ title: 'Chống spam', message: 'Tạm khóa gửi 1 phút.', type: 'warning' });
    } else {
      setAttemptCount(nextAttempts);
    }

    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }
    if (reviewRating > 0 && reviewRating < 4) {
      setShowLowRatingDialog(true);
      return;
    }
    submitReview();
  };

  const images = [
    item?.image_url ? getBookCoverUrl(item.image_url) : null,
    item?.image2_url ? getBookCoverUrl(item.image2_url) : null,
    item?.image3_url ? getBookCoverUrl(item.image3_url) : null,
  ].filter(Boolean);

  const priceDisplay = formatPrice(item?.discounted_price ?? item?.price ?? 0);
  const oldPriceDisplay = formatPrice(item?.price ?? 0);
  const discountPriceDisplay = item?.discounted_price != null ? formatPrice(item.discounted_price) : null;

  if (loading) {
    return (
      <section className="pt-24 pb-8 px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008080]"></div>
          <span className="ml-3 text-gray-600">Đang tải sản phẩm...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="pt-24 pb-8 px-6 lg:px-8 max-w-7xl mx-auto">
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
      </section>
    );
  }

  if (!item) return null;

  return (
    <>
    <ProductDetailLayout
      title={item.title}
      images={images}
      priceText={priceDisplay}
      oldPriceText={oldPriceDisplay}
      discountPriceText={discountPriceDisplay}
      skuText={item.sku || undefined}
      stock={item.stock_quantity || 0}
      categories={(Array.isArray(item.categories) ? item.categories.map(c => c.name) : [])}
      briefDescription={item.brief_description || item.short_description}
      fullDescription={item.full_description || item.description}
      badges={item.is_best_seller ? ['Bestseller'] : item.is_new ? ['New'] : []}
      backLink={{ href: '/stationery', label: 'Văn Phòng Phẩm' }}
      onAddToCart={(qty) => {
        const cartItem = {
          id: item.stationery_id,
          title: item.title,
          cover: images[0] || null,
          price: priceDisplay,
          quantity: qty
        };
        addToCart(cartItem);
        showToast({ title: 'Thêm vào giỏ hàng thành công', message: `${qty} x ${item.title}`, type: 'success', actionLabel: 'Xem giỏ hàng', onAction: () => { window.location.href = '/cart'; } });
      }}
      extraSections={(
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Đánh Giá</h2>

            {loadingReviews ? (
              <p className="text-sm text-gray-500">Đang tải đánh giá...</p>
            ) : (
              <div className="space-y-3">
                {reviews && reviews.length > 0 ? (
                  reviews.map((rv) => (
                    <div key={rv.review_id || `${rv.user_id}-${rv.created_at}`} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {[0,1,2,3,4].map((i) => (
                            <span key={i} className={`${i < Math.round(rv.rating || 0) ? 'text-amber-500' : 'text-gray-300'}`}>★</span>
                          ))}
                          <span className="text-sm text-gray-700 font-medium">{rv.user?.full_name || rv.user?.username || 'Người dùng'}</span>
                        </div>
                        <span className="text-xs text-gray-500">{new Date(rv.created_at).toLocaleDateString()}</span>
                      </div>
                      {rv.comment && <p className="mt-2 text-sm text-gray-700">{rv.comment}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Chưa có đánh giá nào.</p>
                )}
              </div>
            )}

            {reviewsError && (
              <p className="text-sm text-red-600 mt-2">{reviewsError}</p>
            )}

            {/* Review Form */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSubmitReview(); }}
              className="mt-6 border border-gray-200 rounded-xl p-4 bg-gray-50"
            >
              {authRequired && (
                <p className="mb-2 text-sm text-gray-600">Vui lòng đăng nhập để viết đánh giá.</p>
              )}
              <div className="flex items-center gap-3 mb-3">
                <label className="text-sm font-medium text-gray-700">Đánh giá:</label>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((i) => (
                    <button
                      type="button"
                      key={i}
                      onMouseEnter={() => setHoverRating(i)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setReviewRating(i)}
                      className="px-1"
                      aria-label={`Chọn ${i} sao`}
                      disabled={authRequired}
                    >
                      <span className={`text-lg ${(hoverRating || reviewRating) >= i ? 'text-amber-500' : 'text-gray-300'}`}>★</span>
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Chia sẻ cảm nhận của bạn..."
                className="w-full rounded-lg border border-gray-300 p-3 text-sm"
                rows={3}
                disabled={authRequired}
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={authRequired || submittingReview || (blockedUntil && Date.now() < blockedUntil)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
                </button>
              </div>
              {blockedUntil && Date.now() < blockedUntil && (
                <div className="mt-2 text-xs text-gray-500">Tạm khóa gửi trong 1 phút do nhiều lần thử.</div>
              )}
            </form>
          </div>
        </div>
      )}
    />
    {/* Review dialogs */}
    <ConfirmDialog
      open={showLoginDialog}
      title="Yêu cầu đăng nhập"
      message="Bạn cần đăng nhập để viết đánh giá. Chuyển đến trang đăng nhập?"
      confirmText="Đăng nhập"
      cancelText="Để sau"
      onConfirm={() => {
        setShowLoginDialog(false);
        navigate('/login');
      }}
      onClose={() => setShowLoginDialog(false)}
    />

    <ConfirmDialog
      open={showLowRatingDialog}
      title="Xác nhận đánh giá thấp"
      message="Đánh giá dưới 4 sao có thể ảnh hưởng đến thu nhập của sản phẩm. Nếu có bất tiện xin vui lòng liên hệ người bán để họ xử lý. Bạn có chắc muốn gửi đánh giá này?"
      confirmText="Gửi đánh giá"
      cancelText="Hủy"
      onConfirm={() => {
        setShowLowRatingDialog(false);
        submitReview();
      }}
      onClose={() => setShowLowRatingDialog(false)}
    />
    </>
  );
}
