import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext';
import { getOrder, getOrderByPayosCode, createPayOSLink } from '../../../../service/api';
import { useCart } from '../../../../hooks/useCart';
import { formatPrice } from '../../../../utils/currency';

export default function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { clearCart } = useCart();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNewAccount, setIsNewAccount] = useState(false);

  // Two ways to land here:
  //   `orderId`   — our own redirect after a COD order, which already exists.
  //   `orderCode` — PayOS's return URL. This is the checkout code, NOT an order
  //                 id: for a PayOS checkout the order is created by the webhook
  //                 when payment confirms, so it may not exist yet (or ever, if
  //                 the customer walked away from the payment page).
  const orderIdParam = searchParams.get('orderId');
  const payosCode = searchParams.get('orderCode');
  const payosStatus = searchParams.get('status');
  const payosCancelled = searchParams.get('cancel') === 'true';
  const paymentAbandoned = payosCancelled || payosStatus === 'CANCELLED';

  useEffect(() => {
    let abandonedEffect = false;

    const loadOrderDetails = async () => {
      if (!orderIdParam && !payosCode) {
        setError('No order ID provided');
        setLoading(false);
        return;
      }

      // Check if user just created an account
      const accountJustCreated = sessionStorage.getItem('account_just_created');
      if (accountJustCreated === 'true') {
        setIsNewAccount(true);
        sessionStorage.removeItem('account_just_created');
      }

      try {
        let orderData = null;

        if (orderIdParam) {
          orderData = await getOrder(orderIdParam);
        } else if (!paymentAbandoned) {
          // Paid: the webhook is creating the order right about now, and PayOS
          // redirects the browser back at the same time. Poll for a bit rather
          // than telling a paying customer their order does not exist.
          for (let attempt = 0; attempt < 12 && !abandonedEffect; attempt++) {
            orderData = await getOrderByPayosCode(payosCode);
            if (orderData) break;
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } else {
          // Cancelled payment: nothing was created, and nothing will be.
          orderData = await getOrderByPayosCode(payosCode);
        }

        if (abandonedEffect) return;

        if (orderData) {
          console.log('[Checkout Success] order', orderData.order_id,
            'payment:', orderData.payment_status, 'GHN:', orderData.ghn_order_code || '(none)');
          setOrder(orderData);
          // The basket is only spent once an order actually exists for it — an
          // abandoned PayOS payment leaves the cart intact on purpose.
          if (String(orderData.payment_status || '').toLowerCase() === 'paid'
              || String(orderData.payment_method || '').toLowerCase() !== 'payos') {
            clearCart();
          }
        } else if (!paymentAbandoned) {
          setError('Chưa nhận được xác nhận thanh toán từ PayOS. Nếu bạn đã thanh toán, '
            + 'đơn hàng sẽ xuất hiện trong ít phút — vui lòng tải lại trang.');
        }
      } catch (err) {
        console.error('Failed to load order details:', err);
        if (!abandonedEffect) setError('Failed to load order details');
      } finally {
        if (!abandonedEffect) setLoading(false);
      }
    };

    loadOrderDetails();
    return () => { abandonedEffect = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderIdParam, payosCode, paymentAbandoned]);



  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Re-open PayOS. With an order in hand we ask by order id; with only a parked
  // checkout (payment cancelled before it ever became an order) we ask by its
  // code, and payos-create-link hands back the same link it issued before.
  const retryPayment = async () => {
    try {
      const resp = await createPayOSLink(
        order ? (order.order_id || order.id) : { payos_order_code: Number(payosCode) },
      );
      if (resp?.checkout_url) window.location.href = resp.checkout_url;
    } catch (e) {
      console.error('Re-create PayOS link failed:', e);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 pt-28 pb-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008080] mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải thông tin đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (!order && payosCode) {
    return (
      <div className="container mx-auto px-4 pt-28 pb-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Chưa hoàn tất thanh toán</h1>
          <p className="text-gray-600 mb-8">
            {paymentAbandoned
              ? 'Thanh toán đã bị huỷ nên đơn hàng chưa được tạo. Giỏ hàng của bạn vẫn còn nguyên.'
              : (error || 'Chúng tôi chưa nhận được xác nhận thanh toán từ PayOS.')}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={retryPayment}
              className="bg-[#008080] text-white px-6 py-3 rounded-md hover:bg-[#006666] transition-colors font-medium"
            >
              Thanh toán lại
            </button>
            <button
              onClick={() => navigate('/cart')}
              className="border border-gray-300 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-50 transition-colors"
            >
              Quay lại giỏ hàng
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 pt-28 pb-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Đơn hàng không tìm thấy</h1>
          <p className="text-gray-600 mb-8">{error || 'Không thể tìm thấy đơn hàng bạn đang tìm kiếm.'}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-[#008080] text-white px-6 py-3 rounded-md hover:bg-[#006666] transition-colors"
          >
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  const isGuestView = !isAuthenticated;

  // Payment-aware state. A PayOS order is only "successful" once actually paid;
  // until then (or if cancelled) the page must NOT claim success.
  const isPayos = String(order.payment_method || '').toLowerCase() === 'payos';
  const isPaid = String(order.payment_status || '').toLowerCase() === 'paid' || payosStatus === 'PAID';
  const isCancelled = payosCancelled || payosStatus === 'CANCELLED';
  const pendingPayment = isPayos && !isPaid; // unpaid PayOS (cancelled or just not paid yet)

  const orderItems = order.order_items || order.items || [];
  const grandTotal = (order.total_amount || 0) + (order.shipping_fee || 0);

  return (
    <div className="container mx-auto px-4 pt-28 pb-16">
      <div className="max-w-3xl mx-auto">
        {/* Header — reflects real payment state */}
        <div className="text-center mb-8">
          {pendingPayment ? (
            <>
              <div className="w-20 h-20 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Đơn hàng đang chờ thanh toán</h1>
              <p className="text-gray-600 text-lg">
                {isCancelled
                  ? 'Bạn đã huỷ/chưa hoàn tất thanh toán PayOS. Đơn hàng được giữ ở trạng thái chờ thanh toán.'
                  : 'Đơn hàng của bạn đã được tạo nhưng chưa nhận được xác nhận thanh toán từ PayOS.'}
              </p>
              <button
                onClick={retryPayment}
                className="mt-4 bg-[#008080] text-white px-6 py-3 rounded-md hover:bg-[#006666] transition-colors font-medium"
              >
                Thanh toán ngay
              </button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Đơn hàng đã được xác nhận!</h1>
              <p className="text-gray-600 text-lg">
                {isPayos
                  ? 'Thanh toán PayOS thành công. Đơn hàng của bạn đã được xác nhận.'
                  : 'Cảm ơn bạn đã đặt hàng. Đơn hàng của bạn đã được đặt thành công (thanh toán khi nhận hàng).'}
              </p>
            </>
          )}
        </div>

        {/* Order Summary Card */}
        {/* Success Messages */}
        {isNewAccount && (
          <div className="bg-green-50 border border-green-200 rounded-lg shadow-md p-4 mb-4">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-green-800 font-bold text-lg">Quý khách đã tạo tài khoản và mua hàng thành công!</p>
                <p className="text-green-700 text-sm mt-1">Bạn có thể quản lý đơn hàng và theo dõi lịch sử mua hàng trong tài khoản của mình.</p>
              </div>
            </div>
          </div>
        )}

        {isGuestView ? (
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <p className="text-lime-700 font-bold">Đối với những tính năng như quản lí lịch sử đơn hàng, vui lòng đăng ký tài khoản để trải nghiệm.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="border-b border-gray-200 pb-4 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Đơn hàng #{order.order_id || order.id}</h2>
                  <p className="text-gray-600">Đặt hàng vào {formatDate(order.order_date || order.created_at)}</p>
                </div>
                <div className="text-right">
                  {(() => {
                    const st = String(order.status || '').toLowerCase();
                    const cls = st === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      st === 'processing' ? 'bg-blue-100 text-blue-800' :
                        st === 'shipped' ? 'bg-purple-100 text-purple-800' :
                          st === 'delivered' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800';
                    return (
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${cls}`}>
                        {String(order.status || '').charAt(0).toUpperCase() + String(order.status || '').slice(1)}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="space-y-4 mb-6">
              <h3 className="font-semibold text-gray-900">Danh sách sản phẩm</h3>
              {orderItems.map((item, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-16 h-20 bg-gray-200 rounded flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.book?.title || item.stationery?.title || item.book_title || `#${item.book_id || item.stationery_id}`}</h4>
                    <p className="text-gray-600">Số lượng: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatPrice(item.price_at_purchase ?? item.price)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Shipping Details */}
            {order.shipping_address_line1 && (
              <div className="border-t border-gray-200 pt-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Địa chỉ giao hàng</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-900">{order.shipping_full_name}</p>
                  <p className="text-gray-600">
                    {[order.shipping_address_line1, order.ghn_ward_name, order.ghn_district_name, order.ghn_province_name]
                      .filter(Boolean).join(', ')}
                  </p>
                  {order.shipping_phone_number && (
                    <p className="text-gray-600 mt-2">Số điện thoại: {order.shipping_phone_number}</p>
                  )}
                </div>
              </div>
            )}

            {/* Order Total */}
            <div className="border-t border-gray-200 pt-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-gray-600">
                  <span>Tạm tính</span>
                  <span>{formatPrice(order.total_amount)}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span>Phí vận chuyển</span>
                  <span>{order.shipping_fee ? formatPrice(order.shipping_fee) : 'Miễn phí'}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-lg font-semibold text-gray-900">Tổng cộng</span>
                  <span className="text-2xl font-bold text-[#008080]">
                    {formatPrice((order.total_amount || 0) + (order.shipping_fee || 0))}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">Phương thức thanh toán: {order.payment_method}</p>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Hướng dẫn tiếp theo</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {pendingPayment
                ? 'Đơn hàng sẽ được xử lý ngay sau khi thanh toán PayOS được xác nhận.'
                : 'Email xác nhận đơn hàng đã được gửi tới bạn.'}
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Bạn có thể theo dõi trạng thái đơn hàng trong mục "Đơn hàng".
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Mọi câu hỏi liên quan đến đơn hàng, vui lòng liên hệ với chúng tôi.
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/orders')}
            className="bg-[#008080] text-white px-6 py-3 rounded-md hover:bg-[#006666] transition-colors font-medium"
          >
            Xem tất cả đơn hàng
          </button>
          <button
            onClick={() => navigate('/')}
            className="border border-gray-300 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-50 transition-colors font-medium"
          >
            Tiếp tục mua sắm
          </button>
        </div>
      </div>
    </div>
  );
}
