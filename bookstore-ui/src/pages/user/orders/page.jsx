import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { getOrders, cancelOrder, getBookCoverUrl } from '../../../service/api';
import { formatPrice } from '../../../utils/currency';
import Image from "../compat/Image";

const ORDERS_PER_PAGE = 5;

export default function OrdersPage() {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [ghnStatuses, setGhnStatuses] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await getOrders();
      setOrders(response || []);

      if (response && response.length > 0) {
        fetchGHNStatuses(response);
      }
    } catch (error) {
      console.error('[Orders Page] Error loading orders:', error);
      showToast('Không thể tải đơn hàng. Vui lòng thử lại.', 'error');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGHNStatuses = async (ordersList) => {
    const statusPromises = ordersList
      .filter(order => order.ghn_order_code)
      .map(async (order) => {
        try {
          const { getMyOrderShippingStatus } = await import('../../../service/api');
          const status = await getMyOrderShippingStatus(order.order_id || order.id);
          return { orderId: order.order_id || order.id, status };
        } catch (error) {
          return { orderId: order.order_id || order.id, status: null };
        }
      });

    const results = await Promise.all(statusPromises);
    const statusMap = {};
    results.forEach(({ orderId, status }) => {
      if (status) statusMap[orderId] = status;
    });
    setGhnStatuses(statusMap);
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) return;

    try {
      setCancellingOrder(orderId);
      await cancelOrder(orderId);
      showToast('Đã hủy đơn hàng thành công', 'success');
      await loadOrders();
    } catch (error) {
      showToast('Không thể hủy đơn hàng. Vui lòng thử lại.', 'error');
    } finally {
      setCancellingOrder(null);
    }
  };

  const getStatusConfig = (status) => {
    const s = status?.toLowerCase();
    const configs = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '🕐' },
      processing: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '⏳' },
      ready_to_pick: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '📦' },
      picking: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '🚚' },
      picked: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '✓' },
      storing: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '🏪' },
      transporting: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: '🚛' },
      sorting: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: '📋' },
      delivering: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '🛵' },
      shipped: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '📬' },
      delivered: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '✅' },
      delivery_success: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '✅' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', icon: '✕' },
      cancel: { bg: 'bg-red-100', text: 'text-red-700', icon: '✕' },
      delivery_fail: { bg: 'bg-red-100', text: 'text-red-700', icon: '❌' },
    };
    return configs[s] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: '•' };
  };

  const translateStatus = (status) => {
    if (!status) return 'Đang xử lý';
    const statusMap = {
      'pending': 'Chờ xử lý',
      'processing': 'Đang xử lý',
      'shipped': 'Đang giao',
      'delivered': 'Đã giao',
      'cancelled': 'Đã hủy',
      'ready_to_pick': 'Chờ lấy hàng',
      'picking': 'Đang lấy hàng',
      'picked': 'Đã lấy hàng',
      'storing': 'Đang lưu kho',
      'transporting': 'Đang vận chuyển',
      'sorting': 'Đang phân loại',
      'delivering': 'Đang giao hàng',
      'delivery_success': 'Giao hàng thành công',
      'delivery_fail': 'Giao hàng thất bại',
      'waiting_to_return': 'Chờ hoàn hàng',
      'return': 'Hoàn hàng',
      'return_transporting': 'Đang hoàn hàng',
      'return_sorting': 'Đang phân loại hoàn',
      'returning': 'Đang trả hàng',
      'return_success': 'Hoàn hàng thành công',
      'cancel': 'Đã hủy',
    };
    return statusMap[status.toLowerCase()] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getGHNTrackingUrl = (ghnOrderCode) => `https://donhang.ghn.vn/?order_code=${ghnOrderCode}`;

  const getDisplayStatus = (order) => {
    const ghnStatus = ghnStatuses[order.order_id || order.id];
    if (ghnStatus?.status) return translateStatus(ghnStatus.status);
    return translateStatus(order.status || 'pending');
  };

  const getRawStatus = (order) => {
    const ghnStatus = ghnStatuses[order.order_id || order.id];
    return ghnStatus?.status || order.status || 'pending';
  };

  const getItemTitle = (item) => item.book?.title || item.stationery?.title || item.title || 'Sản phẩm';

  const getItemImage = (item) => {
    const imageUrl = item.book?.image_url || item.stationery?.image_url || item.image;
    return imageUrl ? getBookCoverUrl(imageUrl) : '/assets/book-placeholder.jpg';
  };

  const getItemAuthor = (item) => {
    if (item.book?.authors?.length > 0) return item.book.authors.map(a => a.name).join(', ');
    return item.book?.author || item.author || '';
  };

  const totalPages = Math.ceil(orders.length / ORDERS_PER_PAGE);
  const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
  const paginatedOrders = orders.slice(startIndex, startIndex + ORDERS_PER_PAGE);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isAuthenticated) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 pt-32 pb-20 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-200">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Vui lòng đăng nhập</h1>
          <p className="text-gray-500 mb-8">Bạn cần đăng nhập để xem đơn hàng của mình.</p>
          <a
            href="/login"
            className="inline-flex items-center px-8 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold shadow-lg shadow-teal-200 hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Đăng nhập
          </a>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-teal-100 border-t-teal-500 animate-spin"></div>
          <p className="text-gray-500">Đang tải đơn hàng...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 pt-32 pb-20 px-4 md:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-teal-200/50 ring-4 ring-white">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Đơn hàng của bạn</h1>
          <p className="text-gray-500">Theo dõi và quản lý tất cả đơn hàng</p>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Chưa có đơn hàng nào</h3>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">Khi bạn đặt hàng, đơn hàng sẽ xuất hiện ở đây để bạn theo dõi.</p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold shadow-lg shadow-teal-200 hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Bắt đầu mua sắm
            </a>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200/50 border border-gray-100">
                <div className="text-3xl font-bold text-gray-900">{orders.length}</div>
                <div className="text-sm text-gray-500 mt-1">Tổng đơn hàng</div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200/50 border border-gray-100">
                <div className="text-3xl font-bold text-amber-600">{orders.filter(o => ['pending', 'processing', 'ready_to_pick'].includes(o.status?.toLowerCase())).length}</div>
                <div className="text-sm text-gray-500 mt-1">Đang xử lý</div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200/50 border border-gray-100">
                <div className="text-3xl font-bold text-blue-600">{orders.filter(o => ['shipped', 'delivering', 'transporting'].includes(o.status?.toLowerCase())).length}</div>
                <div className="text-sm text-gray-500 mt-1">Đang giao</div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200/50 border border-gray-100">
                <div className="text-3xl font-bold text-emerald-600">{orders.filter(o => o.status?.toLowerCase() === 'delivered').length}</div>
                <div className="text-sm text-gray-500 mt-1">Đã giao</div>
              </div>
            </div>

            {/* Pagination info */}
            <div className="flex justify-between items-center mb-6">
              <p className="text-sm text-gray-500">
                Hiển thị <span className="font-semibold text-gray-900">{startIndex + 1}-{Math.min(startIndex + ORDERS_PER_PAGE, orders.length)}</span> trong số <span className="font-semibold text-gray-900">{orders.length}</span> đơn hàng
              </p>
            </div>

            {/* Orders List */}
            <div className="space-y-5">
              {paginatedOrders.map((order) => {
                const statusConfig = getStatusConfig(getRawStatus(order));
                const isExpanded = selectedOrder === (order.order_id || order.id);

                return (
                  <div
                    key={order.order_id || order.id}
                    className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl"
                  >
                    {/* Order Header */}
                    <div className="p-5 md:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">
                              Đơn hàng #{order.order_id || order.id}
                            </h3>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                              <span>{statusConfig.icon}</span>
                              {getDisplayStatus(order)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(order.order_date || order.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">
                            {formatPrice((order.total_amount || 0) + (order.shipping_fee || 0))}
                          </div>
                          {order.shipping_fee > 0 && (
                            <p className="text-xs text-gray-400 mt-1">
                              Bao gồm {formatPrice(order.shipping_fee)} phí ship
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Quick Preview */}
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        {(order.order_items || order.items || []).slice(0, 3).map((item, index) => (
                          <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                            <span className="text-sm text-gray-700 font-medium truncate max-w-[150px]">{getItemTitle(item)}</span>
                            <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">×{item.quantity}</span>
                          </div>
                        ))}
                        {(order.order_items || order.items || []).length > 3 && (
                          <span className="text-sm text-gray-500">
                            +{(order.order_items || order.items).length - 3} sản phẩm khác
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => setSelectedOrder(isExpanded ? null : (order.order_id || order.id))}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                        >
                          <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          {isExpanded ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                        </button>

                        {order.ghn_order_code && (
                          <a
                            href={getGHNTrackingUrl(order.ghn_order_code)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            Theo dõi GHN
                          </a>
                        )}

                        {['pending', 'processing'].includes(order.status?.toLowerCase()) && (
                          <button
                            onClick={() => handleCancelOrder(order.order_id || order.id)}
                            disabled={cancellingOrder === (order.order_id || order.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {cancellingOrder === (order.order_id || order.id) ? (
                              <>
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                                Đang hủy...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Hủy đơn
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50/50 p-5 md:p-6 animate-[fadeIn_0.3s_ease-out]">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          Chi tiết sản phẩm
                        </h4>
                        <div className="space-y-3">
                          {(order.order_items || order.items || []).map((item, index) => (
                            <div key={index} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100">
                              <div className="w-16 h-20 relative flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                                <Image
                                  src={getItemImage(item)}
                                  alt={getItemTitle(item)}
                                  fill
                                  className="object-cover"
                                  sizes="64px"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className="font-semibold text-gray-900 truncate">{getItemTitle(item)}</h5>
                                {getItemAuthor(item) && (
                                  <p className="text-sm text-gray-500 truncate">Tác giả: {getItemAuthor(item)}</p>
                                )}
                                <p className="text-sm text-gray-500">Số lượng: {item.quantity}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-gray-900">{formatPrice(item.price_at_purchase || item.price || 0)}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Shipping Info */}
                        {(order.shipping_full_name || order.shipping_address_line1) && (
                          <div className="mt-6 p-4 bg-white rounded-xl border border-gray-100">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              Địa chỉ giao hàng
                            </h4>
                            <div className="text-sm text-gray-600 space-y-1">
                              {order.shipping_full_name && <p className="font-medium text-gray-900">{order.shipping_full_name}</p>}
                              {order.shipping_phone_number && <p>📞 {order.shipping_phone_number}</p>}
                              {order.shipping_address_line1 && <p>{order.shipping_address_line1}</p>}
                              {order.ghn_ward_name && <p>{order.ghn_ward_name}, {order.ghn_district_name}, {order.ghn_province_name}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Trước
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`w-11 h-11 rounded-xl font-semibold transition-all ${currentPage === page
                          ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-200'
                          : 'border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  Sau
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}