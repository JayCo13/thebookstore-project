import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../../components';
import { formatPrice } from '../../utils/currency';
import './OrderDetails.css';
import { getOrder, getOrderShippingStatus } from '../../service';
import { getBookCoverUrl } from '../../service/api';

const OrderDetails = () => {
  const params = useParams();
  // Route is defined as "/admin/orders/:id"; use that param directly
  const orderId = params.id || window.location.pathname.split('/').pop();
  const [order, setOrder] = useState(null);
  const [ghnStatus, setGhnStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getOrder(orderId);
        if (!mounted) return;
        setOrder(data);
        // Fetch GHN status if code exists
        try {
          const code = data?.ghn_order_code;
          if (code) {
            const s = await getOrderShippingStatus(orderId);
            const status = s?.status || s?.data?.status || null;
            console.groupCollapsed(`[Admin OrderDetails] GHN status for order #${orderId}`);
            console.log('ghn_order_code:', code);
            console.log('status response:', s);
            console.log('applied status:', status);
            console.groupEnd();
            if (mounted) setGhnStatus(status);
          } else {
            console.info(`[Admin OrderDetails] No GHN code for order #${orderId} — skipping status fetch`);
            if (mounted) setGhnStatus(null);
          }
        } catch {}
      } catch (e) {
        console.error('Load order failed', e);
        if (!mounted) return;
        setError('Không thể tải đơn hàng');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [orderId]);

  if (loading) {
    return (
      <div className="order-details">
        <header className="od-header">
          <h1>Order #{orderId}</h1>
        </header>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-details">
        <header className="od-header">
          <h1>Order #{orderId}</h1>
        </header>
        <p style={{ color: '#dc2626' }}>{error}</p>
      </div>
    );
  }

  if (!order) return null;

  const status = String((ghnStatus ?? order.status) || 'Pending');
  const createdAt = order.order_date;
  const formattedDate = createdAt ? new Date(createdAt).toLocaleString() : '—';

  // Canonical items per backend schema
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  const subtotal = items.reduce((sum, it) => {
    const unit = Number(it.price_at_purchase ?? it.book?.price ?? 0);
    const qty = Number(it.quantity) || 0;
    return sum + unit * qty;
  }, 0);
  const shipping = Number(order.shipping_fee ?? 0);
  const grandTotal = Number(order.total_amount ?? subtotal + shipping);

  const getItemImageSrc = (item) => {
    const imgUrl = item.book?.image_url || item.image_url || item.book?.cover_image || item.cover_image;
    if (imgUrl) return getBookCoverUrl(imgUrl);
    return item.book?.cover || item.cover || item.book?.thumbnail || item.image || '/assets/book-placeholder.jpg';
  };

  return (
    <div className="order-details">
      <header className="od-header">
        <div className="od-title">
          <h1>Order #{order.order_id}</h1>
          <span className="od-status" title="Order status">{status}</span>
        </div>
      </header>

      <div className="od-grid">
        {/* Left column */}
        <div className="left">
          <section className="card">
            <div className="card-header">Danh sách sản phẩm</div>
            <div className="items-table">
              <div className="items-row items-header">
                <div className="col col-image">Ảnh</div>
                <div className="col col-product">Sản phẩm</div>
                <div className="col col-price">Giá</div>
                <div className="col col-qty">Số lượng</div>
                <div className="col col-total">Tổng cộng</div>
              </div>
              {items.map((item, idx) => {
                const unit = Number(item.price_at_purchase ?? item.book?.price ?? 0);
                const qty = Number(item.quantity) || 0;
                const lineTotal = unit * qty;
                return (
                  <div key={idx} className="items-row">
                    <div className="col col-image">
                      <img src={getItemImageSrc(item)} alt="" className="thumb" />
                    </div>
                    <div className="col col-product">
                      <div className="name">{item.book?.title || `Book #${item.book_id}`}</div>
                      {item.book?.isbn && (
                        <div className="attrs">ISBN: {item.book.isbn}</div>
                      )}
                    </div>
                    <div className="col col-price">{formatPrice(unit)}</div>
                    <div className="col col-qty">{qty}</div>
                    <div className="col col-total">{formatPrice(lineTotal)}</div>
                  </div>
                );
              })}
              {items.length === 0 && (
                <div className="items-row"><div className="col">No items</div></div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-header">Phương thức vận chuyển</div>

            <div className="delivery-row">
              <div className="carrier">{order.shipping_method || '—'}</div>
              <div className="desc">{order.shipping_service_id ? `Service ID: ${order.shipping_service_id}` : ''}</div>
            </div>
            <div className="fee">{formatPrice(shipping)}</div>
          </section>

          <section className="card">
            <div className="card-header">Tổng Bill</div>
            <div className="summary-row">
              <span> ({items.length} sản phẩm)</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Phí vận chuyển</span>
              <span>{formatPrice(shipping)}</span>
            </div>
             <div className="summary-row">
              <span>Phương thức thanh toán</span>
              <span>{String(order.payment_method || '').toUpperCase()}</span>
            </div>
            <div className="summary-total">
              <span>Tổng cộng</span>
              <span>{formatPrice(grandTotal)}</span>
            </div>
          </section>
        </div>

        {/* Right column */}
        <aside className="right">
          <section className="card">
            <div className="card-header">Thông tin khách hàng</div>
            <div className="customer">
              <div className="avatar"></div>
              <div className="info">
                <div className="name">{order.shipping_full_name || '—'}</div>
                <div className="contact">
                  <p>Email: {order.guest_email || '—'}</p>
                  <p>Điện thoại: {order.shipping_phone_number || '—'}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-header">Địa chỉ giao hàng</div>
            <div className="address">
              <p>Ngày đặt: {formattedDate}</p>
              <p>Địa chỉ: {order.shipping_address_line1 || '—'}</p>
              {(order.shipping_city || order.shipping_postal_code) && (
                <>
                  {order.shipping_city || ''}
                  {(order.shipping_city && order.shipping_postal_code) ? ', ' : ''}
                  {order.shipping_postal_code || ''}
                  <br />
                </>
              )}
              {order.shipping_country && (<>{order.shipping_country}</>)}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default OrderDetails;
