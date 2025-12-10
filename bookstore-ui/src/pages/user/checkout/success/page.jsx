import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext';
import { getOrder } from '../../../../service/api';
import { formatPrice } from '../../../../utils/currency';

export default function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNewAccount, setIsNewAccount] = useState(false);

  const orderId = searchParams.get('orderId');

  useEffect(() => {
    const loadOrderDetails = async () => {
      if (!orderId) {
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
        const orderData = await getOrder(orderId);
        console.groupCollapsed('[Checkout Success] Loaded order');
        console.log('order_id:', orderData?.order_id || orderData?.id);
        console.log('ghn_order_code:', orderData?.ghn_order_code || '(none)');
        console.log('status:', orderData?.status);
        if (orderData?.ghn_order_code) {
          console.log('Zalo ZNS: backend attempted send after GHN creation.');
          const normalizePhone = (phone) => {
            if (!phone) return null;
            const raw = String(phone).replace(/\D+/g, '');
            if (!raw) return null;
            if (raw.startsWith('0')) return '84' + raw.slice(1);
            if (raw.startsWith('84')) return raw;
            if (raw.length >= 9) return '84' + raw;
            return raw;
          };
          const phoneNormalized = normalizePhone(orderData?.shipping_phone_number);
          const totalVnd = Number(orderData?.total_amount || 0);
          const shippingVnd = Number(orderData?.shipping_fee || 0);
          const totalNumber = totalVnd + shippingVnd;
          const parts = [
            orderData?.shipping_address_line1,
            orderData?.ghn_ward_name,
            orderData?.ghn_district_name,
            orderData?.ghn_province_name,
          ].filter(Boolean);
          const addressJoined = parts.join(', ');
          const template_data = {
            order_code: orderData?.ghn_order_code,
            total: totalNumber,
            address: addressJoined || '',
            deli_code: orderData?.ghn_order_code,
            customer_name: orderData?.shipping_full_name || orderData?.customer_name || '',
            payment_method: String(orderData?.payment_method || '').toUpperCase(),
            tracking_id: '(generated server-side)',
            items: (() => {
              const arr = Array.isArray(orderData?.order_items) ? orderData.order_items : [];
              const parts2 = arr.map(it => {
                const t = it?.book?.title || it?.stationery?.title || '';
                const q = Number(it?.quantity || 0);
                return t && q > 0 ? `${t} x${q}` : null;
              }).filter(Boolean);
              let s = parts2.join(', ');
              if (s.length > 200) s = s.slice(0, 197) + '...';
              return s;
            })(),
          };
          console.groupCollapsed('[Checkout Success] ZNS payload preview');
          console.log('phone:', phoneNormalized);
          console.log('template_id:', '(server configured)');
          console.log('template_data:', template_data);
          console.groupEnd();
        } else {
          console.log('Zalo ZNS: GHN code missing; notification likely not sent.');
        }
        console.groupEnd();
        setOrder(orderData);
      } catch (err) {
        console.error('Failed to load order details:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    loadOrderDetails();
  }, [orderId]);



  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  return (
    <div className="container mx-auto px-4 pt-28 pb-16">
      <div className="max-w-3xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Đơn hàng đã được xác nhận!</h1>
          <p className="text-gray-600 text-lg">Cảm ơn bạn đã đặt hàng. Đơn hàng của bạn đã được đặt thành công.</p>
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
                  <h2 className="text-xl font-bold text-gray-900">Đơn hàng #{order.id}</h2>
                  <p className="text-gray-600">Đặt hàng vào {formatDate(order.created_at)}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                    }`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="space-y-4 mb-6">
              <h3 className="font-semibold text-gray-900">Danh sách sản phẩm</h3>
              {order.items && order.items.map((item, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-16 h-20 bg-gray-200 rounded flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.book_title || `Book ID: ${item.book_id}`}</h4>
                    <p className="text-gray-600">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatPrice(item.price)}</p>
                    <p className="text-sm text-gray-600">each</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Shipping Details */}
            {order.shipping_details && (
              <div className="border-t border-gray-200 pt-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Địa chỉ giao hàng</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-900">
                    {order.shipping_details.first_name} {order.shipping_details.last_name}
                  </p>
                  <p className="text-gray-600">{order.shipping_details.address_line_1}</p>
                  <p className="text-gray-600">
                    {order.shipping_details.city}, {order.shipping_details.postal_code}
                  </p>
                  <p className="text-gray-600">{order.shipping_details.country}</p>
                  {order.shipping_details.phone_number && (
                    <p className="text-gray-600 mt-2">Số điện thoại: {order.shipping_details.phone_number}</p>
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
              Cảm ơn bạn đã đặt hàng. Thông tin chi tiết đã được gửi qua Zalo của bạn.
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Bạn có thể theo dõi trạng thái đơn hàng qua zalo.
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Mọi câu hỏi hoặc vấn đề liên quan đến đơn hàng, vui lòng liên hệ với chúng tôi qua zalo.
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
