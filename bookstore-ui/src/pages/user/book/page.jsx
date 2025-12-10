'use client';

import { useState, useEffect, useMemo } from 'react';
import { StarIcon } from '@heroicons/react/20/solid';
import { useParams, useNavigate } from 'react-router-dom';
import Image from '../compat/Image';
import Link from '../compat/Link';
import { useCart } from '../../../hooks/useCart';
import { useWishlist } from '../../../hooks/useWishlist';
import { useToast } from '../../../contexts/ToastContext.jsx';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { getBook, getBookBySlug, getBookCoverUrl, getBookReviews, createReview, moderateReview } from '../../../service/api';
import { formatPrice } from '../../../utils/currency';
import ReadSampleModal from '../../../components/ReadSampleModal';
import AudioSampleModal from '../../../components/AudioSampleModal';
import ImageViewerModal from '../../../components/ImageViewerModal';
import ConfirmDialog from '../../../components/ConfirmDialog.jsx';
import ProductDetailLayout from '../components/ProductDetailLayout.jsx';

export default function BookDetailsPage() {
  const params = useParams();
  const slug = params.slug ?? params.id;
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { addToWishlist } = useWishlist();
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showReadSampleModal, setShowReadSampleModal] = useState(false);
  const [showAudioSampleModal, setShowAudioSampleModal] = useState(false);
  const [readSampleImages, setReadSampleImages] = useState([]);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [bookImages, setBookImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);

  const galleryImages = useMemo(() => {
    if (!book) return [];
    return [
      book.image_url ? getBookCoverUrl(book.image_url) : null,
      book.image2_url ? getBookCoverUrl(book.image2_url) : null,
      book.image3_url ? getBookCoverUrl(book.image3_url) : null,
    ].filter(Boolean);
  }, [book?.image_url, book?.image2_url, book?.image3_url]);

  useEffect(() => {
    if (galleryImages.length > 0) {
      setSelectedImage(galleryImages[0]);
    } else if (book?.image_url) {
      setSelectedImage(getBookCoverUrl(book.image_url));
    } else {
      setSelectedImage(null);
    }
  }, [book?.book_id, galleryImages]);
  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showLowRatingDialog, setShowLowRatingDialog] = useState(false);
  // Simple spam prevention: after 3 attempts, block for 1 minute
  const [attemptCount, setAttemptCount] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState(null);

  // Bad word detection moved to shared utility (Vietnamese + English)

  // Derived average rating for display
  const totalReviews = reviews.length;
  const averageRating = totalReviews
    ? (reviews.reduce((sum, rv) => sum + (rv.rating || 0), 0) / totalReviews)
    : null;
  useEffect(() => {
    const fetchBook = async () => {
      try {
        setLoading(true);
        let bookData = null;
        const maybeId = Number(slug);
        if (Number.isFinite(maybeId) && String(maybeId) === slug) {
          bookData = await getBook(maybeId);
        } else {
          bookData = await getBookBySlug(slug);
        }
        setBook(bookData);
      } catch (err) {
        console.error('Error fetching book:', err);
        setError('Failed to load book details');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchBook();
    }
  }, [slug]);

  // Fetch reviews when book id changes
  useEffect(() => {
    const fetchReviews = async () => {
      if (!book?.book_id) return;
      try {
        setReviewsLoading(true);
        setReviewsError(null);
        const data = await getBookReviews(book.book_id);
        setReviews(Array.isArray(data) ? data : (data?.items || []));
      } catch (err) {
        console.error('Error fetching reviews:', err);
        setReviewsError('Không thể tải đánh giá cho sách này');
      } finally {
        setReviewsLoading(false);
      }
    };
    fetchReviews();
  }, [book?.book_id]);

  const handleAddToCart = () => {
    if (book && quantity > 0) {
      // Add the selected quantity to cart
      const bookForCart = {
        id: book.book_id,
        title: book.title,
        author: book.authors && book.authors.length > 0 ? book.authors[0].name : 'Unknown Author',
        price: formatPrice(book.price),
        cover: getBookCoverUrl(book.image_url),
        quantity: quantity // Add the exact selected quantity
      };
      addToCart(bookForCart);

      showToast({
        title: 'Added to cart',
        message: `${quantity} x ${book.title}`,
        type: 'success',
        actionLabel: 'View Cart',
        onAction: () => navigate('/cart')
      });
    }
  };

  const submitReview = async () => {
    if (!book) return;
    if (rating < 1) {
      showToast({ title: 'Đánh giá', message: 'Vui lòng chọn số sao', type: 'warning' });
      return;
    }
    if (!comment.trim()) {
      showToast({ title: 'Đánh giá', message: 'Vui lòng nhập nhận xét', type: 'warning' });
      return;
    }
    // Local bad-word filter removed; rely on server-side AI moderation
    try {
      setSubmittingReview(true);
      // Server-side AI moderation
      try {
        const moderation = await moderateReview({
          text: comment.trim(),
          rating,
          book_id: book.book_id,
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
      const payload = { rating, comment: comment.trim() };
      const res = await createReview(book.book_id, payload);
      const newReview = res?.review || res || payload;
      setReviews((prev) => [
        { ...newReview, rating, comment: comment.trim(), created_at: new Date().toISOString() },
        ...prev,
      ]);
      setRating(0);
      setHoverRating(0);
      setComment('');
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
    if (!book) return;
    // Block if user has been rate-limited
    const now = Date.now();
    if (blockedUntil && now < blockedUntil) {
      const remaining = Math.ceil((blockedUntil - now) / 1000);
      showToast({
        title: 'Chống spam',
        message: `Bạn đã thử gửi quá nhiều lần. Vui lòng thử lại sau ${remaining} giây.`,
        type: 'warning'
      });
      return;
    }

    // Count this attempt, and if it is the 3rd, start a 1-minute block
    const nextAttempts = attemptCount + 1;
    if (nextAttempts >= 3) {
      setBlockedUntil(now + 60_000);
      setAttemptCount(0);
      showToast({
        title: 'Chống spam',
        message: 'Bạn đã thực hiện 3 lần gửi. Tạm khóa gửi 1 phút.',
        type: 'warning'
      });
      // Allow this current attempt to proceed; subsequent clicks will be blocked for 1 minute
    } else {
      setAttemptCount(nextAttempts);
    }
    // Require login with custom dialog
    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }
    // Low-rating confirmation with custom dialog
    if (rating > 0 && rating < 4) {
      setShowLowRatingDialog(true);
      return;
    }
    // Proceed directly when rating >= 4
    submitReview();
  };

  const handleAddToWishlist = () => {
    if (book) {
      const bookForWishlist = {
        id: book.book_id,
        title: book.title,
        author: book.authors && book.authors.length > 0 ? book.authors[0].name : 'Unknown Author',
        price: formatPrice(book.price),
        cover: getBookCoverUrl(book.image_url)
      };

      addToWishlist(bookForWishlist);
      showToast({
        title: 'Added to wishlist',
        message: `${book.title}`,
        type: 'success',
        actionLabel: 'View Wishlist',
        onAction: () => navigate('/wishlist')
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008080] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading book details...</p>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">📚</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Book Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The book you are looking for does not exist.'}</p>
          <Link
            to="/books"
            className="inline-flex items-center px-6 py-3 bg-[#008080] text-white rounded-lg hover:bg-[#006666] transition-colors"
          >
            ← Browse All Books
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb - with proper spacing from header */}
      <div className="bg-white border-b mt-16 md:mt-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-xl text-gray-500">
            <Link to="/" className="hover:text-[#008080] transition-colors">Home</Link>
            <span>›</span>
            <Link to="/books" className="hover:text-[#008080] transition-colors">Books</Link>
            <span>›</span>
            <span className="text-gray-800 font-semibold truncate">{book.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <ProductDetailLayout
          title={book.title}
          images={galleryImages}
          priceText={formatPrice(book.discounted_price ?? book.price)}
          oldPriceText={formatPrice(book.price)}
          discountPriceText={book.discounted_price != null ? formatPrice(book.discounted_price) : null}
          stock={book.quantity || book.stock_quantity || 0}
          categories={(book.categories || []).map(cat => cat.name)}
          briefDescription={book.brief_description}
          fullDescription={book.full_description}
          badges={book.is_best_seller ? ['Bestseller'] : book.is_new ? ['New'] : []}
          backLink={{ href: '/books', label: 'Books' }}
          showBreadcrumb={false}
          authorText={(book.authors && book.authors.length > 0) ? book.authors.map(a => a.name).join(', ') : undefined}
          isbnText={book.isbn || undefined}
          publishDateText={book.publication_date ? new Date(book.publication_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : undefined}
          extraSections={(
            <>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
                <div className="p-6 md:p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Đánh Giá & Nhận Xét</h2>
                  <div className="mb-6 border border-gray-200 rounded-xl p-4">
                    <div className="mb-3">
                      <span className="text-sm font-semibold text-gray-700">Chọn số sao:</span>
                      <div className="mt-2 flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(star)}
                            className="p-1"
                            aria-label={`Chọn ${star} sao`}
                          >
                            <svg
                              className={(hoverRating || rating) >= star ? 'w-6 h-6 text-yellow-400' : 'w-6 h-6 text-gray-300'}
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <textarea
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Chia sẻ nhận xét của bạn..."
                        className="w-full resize-none rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 p-2 text-sm"
                      />
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={handleSubmitReview}
                        disabled={submittingReview || (blockedUntil && Date.now() < blockedUntil)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
                      >
                        {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">Bạn cần đăng nhập để gửi đánh giá.</div>
                  </div>

                  {reviewsLoading && (
                    <div className="text-gray-600">Đang tải đánh giá...</div>
                  )}
                  {reviewsError && (
                    <div className="text-red-600">{reviewsError}</div>
                  )}
                  {!reviewsLoading && !reviewsError && (
                    <div className="space-y-4">
                      {reviews.length === 0 && (
                        <div className="text-gray-500">Chưa có đánh giá nào. Hãy là người đầu tiên!</div>
                      )}
                      {reviews.map((rv, idx) => (
                        <div key={rv.id || idx} className="border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-gray-800">{rv.user?.name || rv.user_name || 'Người dùng'}</div>
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <svg
                                    key={star}
                                    className={(rv.rating || 0) >= star ? 'w-4 h-4 text-yellow-400' : 'w-4 h-4 text-gray-300'}
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">{rv.created_at ? new Date(rv.created_at).toLocaleString() : ''}</div>
                          </div>
                          {rv.comment && (
                            <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{rv.comment}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center">
                <Link
                  to="/books"
                  className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  ← Về Trang Mua Sắm
                </Link>
              </div>
            </>
          )}
          onAddToCart={(qty) => {
            if (book && qty > 0) {
              const bookForCart = {
                id: book.book_id,
                title: book.title,
                author: book.authors && book.authors.length > 0 ? book.authors[0].name : 'Unknown Author',
                price: formatPrice(book.discounted_price ?? book.price),
                cover: getBookCoverUrl(book.image_url),
                quantity: qty
              };
              addToCart(bookForCart);
              showToast({
                title: 'Added to cart',
                message: `${qty} x ${book.title}`,
                type: 'success',
                actionLabel: 'View Cart',
                onAction: () => navigate('/cart')
              });
            }
          }}
          onAddToWishlist={() => {
            if (book) {
              const bookForWishlist = {
                id: book.book_id,
                title: book.title,
                author: book.authors && book.authors.length > 0 ? book.authors[0].name : 'Unknown Author',
                price: formatPrice(book.discounted_price ?? book.price),
                cover: getBookCoverUrl(book.image_url)
              };
              addToWishlist(bookForWishlist);
              showToast({
                title: 'Added to wishlist',
                message: `${book.title}`,
                type: 'success',
                actionLabel: 'View Wishlist',
                onAction: () => navigate('/wishlist')
              });
            }
          }}
        >
          {/* Read Sample Badge */}
          <button
            className="group relative flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#008080]/5 to-[#008080]/10 hover:from-[#008080]/10 hover:to-[#008080]/20 border border-[#008080]/20 hover:border-[#008080]/30 rounded-lg transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
            onClick={() => {
              if (book.read_sample) {
                try {
                  const sampleImages = JSON.parse(book.read_sample);
                  if (sampleImages && sampleImages.length > 0) {
                    const fullUrlImages = sampleImages.map(imageUrl => getBookCoverUrl(imageUrl));
                    setReadSampleImages(fullUrlImages);
                    setShowReadSampleModal(true);
                  } else {
                    showToast({ title: 'Đọc thử', message: 'No sample pages available for this book', type: 'info' });
                  }
                } catch (error) {
                  console.error('Error parsing read sample data:', error);
                  showToast({ title: 'Đọc thử', message: 'Error loading sample pages', type: 'error' });
                }
              } else {
                showToast({ title: 'Đọc thử', message: 'Book does not have a sample page', type: 'info' });
              }
            }}
          >
            <svg className="w-4 h-4 text-[#008080] group-hover:text-[#006666] transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-sm font-medium text-[#008080] group-hover:text-[#006666] transition-colors duration-200">Đọc thử</span>
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#008080]/0 via-[#008080]/5 to-[#008080]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>

          {/* Audio Sample Badge */}
          <button
            className="group relative flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#008080]/5 to-[#008080]/10 hover:from-[#008080]/10 hover:to-[#008080]/20 border border-[#008080]/20 hover:border-[#008080]/30 rounded-lg transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
            onClick={() => {
              if (book.audio_sample) {
                setShowAudioSampleModal(true);
              } else {
                showToast({ title: 'Audio Sample', message: 'No audio sample available for this book', type: 'info' });
              }
            }}
          >
            <svg className="w-4 h-4 text-[#008080] group-hover:text-[#006666] transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a3 3 0 106 0v-3a3 3 0 00-6 0v3zm6 0a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium text-[#008080] group-hover:text-[#006666] transition-colors duration-200">Nghe thử</span>
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#008080]/0 via-[#008080]/5 to-[#008080]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </ProductDetailLayout>
      </div>


      {/* Modals */}
      <ReadSampleModal
        isOpen={showReadSampleModal}
        onClose={() => setShowReadSampleModal(false)}
        sampleImages={readSampleImages}
        bookTitle={book?.title}
      />

      <AudioSampleModal
        isOpen={showAudioSampleModal}
        onClose={() => setShowAudioSampleModal(false)}
        audioUrl={book?.audio_sample ? getBookCoverUrl(book.audio_sample) : null}
        bookTitle={book?.title}
      />

      <ImageViewerModal
        isOpen={showImageViewer}
        onClose={() => setShowImageViewer(false)}
        images={bookImages}
        title={book?.title}
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
        message="Đánh giá dưới 4 sao có thể ảnh hưởng đến thu nhập của sách. Nếu có bất tiện xin vui lòng liên hệ người bán để họ xử lý. Bạn có chắc muốn gửi đánh giá này?"
        confirmText="Gửi đánh giá"
        cancelText="Hủy"
        onConfirm={() => {
          setShowLowRatingDialog(false);
          submitReview();
        }}
        onClose={() => setShowLowRatingDialog(false)}
      />
    </div>
  );
}
