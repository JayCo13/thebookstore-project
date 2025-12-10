import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input } from '../../components';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import './OrdersList.css';
import { getAllOrders, getAllOrdersAdmin, updateOrderStatus, syncGhnStatus } from '../../service';
import { getBookCoverUrl } from '../../service/api';
import { formatPrice } from '../../utils/currency';

// GHN Status Vietnamese translations
const GHN_STATUS_MAP = {
  'ready_to_pick': { label: 'Chờ lấy hàng', class: 'pending' },
  'picking': { label: 'Đang lấy hàng', class: 'pending' },
  'cancel': { label: 'Đã hủy', class: 'cancelled' },
  'money_collect_picking': { label: 'Thu tiền khi lấy', class: 'pending' },
  'picked': { label: 'Đã lấy hàng', class: 'in-transit' },
  'storing': { label: 'Đang lưu kho', class: 'in-transit' },
  'transporting': { label: 'Đang vận chuyển', class: 'in-transit' },
  'sorting': { label: 'Đang phân loại', class: 'in-transit' },
  'delivering': { label: 'Đang giao hàng', class: 'in-transit' },
  'money_collect_delivering': { label: 'Thu tiền khi giao', class: 'in-transit' },
  'delivered': { label: 'Đã giao hàng', class: 'fulfilled' },
  'delivery_fail': { label: 'Giao hàng thất bại', class: 'failed' },
  'waiting_to_return': { label: 'Chờ hoàn hàng', class: 'returning' },
  'return': { label: 'Đang hoàn hàng', class: 'returning' },
  'return_transporting': { label: 'Đang vận chuyển hoàn', class: 'returning' },
  'return_sorting': { label: 'Đang phân loại hoàn', class: 'returning' },
  'returning': { label: 'Đang hoàn hàng', class: 'returning' },
  'return_fail': { label: 'Hoàn thất bại', class: 'failed' },
  'returned': { label: 'Đã hoàn hàng', class: 'returned' },
  'exception': { label: 'Ngoại lệ', class: 'failed' },
  'damage': { label: 'Hàng hư hỏng', class: 'failed' },
  'lost': { label: 'Mất hàng', class: 'failed' },
  // Local statuses
  'pending': { label: 'Chờ duyệt', class: 'pending' },
  'approved': { label: 'Đã duyệt', class: 'fulfilled' },
  'processing': { label: 'Đang xử lý', class: 'in-transit' },
  'shipped': { label: 'Đã gửi', class: 'in-transit' },
  'completed': { label: 'Hoàn thành', class: 'fulfilled' },
  'cancelled': { label: 'Đã hủy', class: 'cancelled' },
};

// Get translated status info
const getStatusInfo = (status) => {
  const key = String(status || 'pending').toLowerCase();
  return GHN_STATUS_MAP[key] || { label: status || 'Không xác định', class: 'pending' };
};

// Map API order object to UI-friendly shape with safe fallbacks
// Compose a single-line shipping address from various possible fields
const composeAddress = (order) => {
  const line1 = order?.shipping_address_line1 || order?.shipping_address_line_1 || order?.shipping_details?.address_line_1 || '';
  const city = order?.shipping_city || order?.shipping_details?.city || '';
  const postal = order?.shipping_postal_code || order?.shipping_details?.postal_code || '';
  const country = order?.shipping_country || order?.shipping_details?.country || '';
  const parts = [line1, [city, postal].filter(Boolean).join(' '), country].filter(p => String(p).trim() !== '');
  return parts.length ? parts.join(', ') : '—';
};

// Identify orders that should be moved to archive: Approved and older than 3 days
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const isOrderArchived = (row) => {
  const statusLower = String(row.status).toLowerCase();
  return statusLower === 'approved' && row.dateMs > 0 && (Date.now() - row.dateMs) >= THREE_DAYS_MS;
};

const mapOrderToRow = (order) => {
  const id = order?.order_id ?? order?.id ?? '—';
  const createdAt = order?.created_at || order?.order_date || order?.date;
  const dateObj = createdAt ? new Date(createdAt) : null;
  const date = dateObj ? dateObj.toLocaleDateString('en-US') : '—';
  const dateKey = dateObj ? dateObj.toISOString().slice(0, 10) : '';
  const dateMs = dateObj ? dateObj.getTime() : 0;
  const firstName = order?.user?.first_name || order?.customer?.first_name || '';
  const lastName = order?.user?.last_name || order?.customer?.last_name || '';
  const customer = order?.customer_name || `${firstName} ${lastName}`.trim() || order?.user?.email || 'Khách vãn lai';
  const address = composeAddress(order);
  const paymentMethod = order?.payment_method || order?.payment?.method || '—';
  // Compute total with fallbacks and formatting
  const items = order?.order_items || order?.items || [];
  const subtotal = Array.isArray(items)
    ? items.reduce((sum, it) => {
      const unit = (it.price ?? it.price_at_purchase ?? it.unit_price ?? it.book?.price ?? 0);
      return sum + (Number(unit) || 0) * (Number(it.quantity) || 0);
    }, 0)
    : 0;
  const shipping = Number(order?.shipping_fee || order?.shipping || 0);
  const tax = Number(order?.tax || 0);
  const totalRaw = Number(order?.total_amount ?? order?.total ?? 0) || (subtotal + shipping + tax);
  const total = formatPrice(totalRaw);
  const status = order?.status || 'pending';
  const ghnCode = order?.ghn_order_code || null;
  const idNum = parseInt(String(id).replace(/[^0-9]/g, ''), 10) || 0;
  return { id, idNum, date, dateKey, dateMs, customer, address, paymentMethod, total, status, ghnCode, raw: order };
};


const OrdersList = () => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState([]); // list of expanded order ids
  const [fromDate, setFromDate] = useState(''); // YYYY-MM-DD
  const [toDate, setToDate] = useState(''); // YYYY-MM-DD
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const [dateError, setDateError] = useState('');
  const [syncing, setSyncing] = useState(false);

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setStatusFilter('All Status');
    setQuery('');
    setDateError('');
    setCurrentPage(1);
  };

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        // Try primary admin endpoint
        const res = await getAllOrders();
        const list = Array.isArray(res) ? res : (res?.orders || res?.data || []);
        const rows = list.map(mapOrderToRow);
        // NOTE: GHN status is stored in order.status by the backend
        // Removed individual GHN API calls to improve loading speed
        setOrders(rows);
      } catch (err) {
        console.warn('Primary admin orders endpoint failed, trying alternative...', err);
        try {
          // Fallback to alternative endpoint
          const res2 = await getAllOrdersAdmin();
          const list2 = Array.isArray(res2) ? res2 : (res2?.orders || res2?.data || []);
          const rows2 = list2.map(mapOrderToRow);
          setOrders(rows2);
        } catch (err2) {
          console.error('Failed to load admin orders from both endpoints:', err2);
          setError('Không thể tải danh sách đơn hàng');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filtered = useMemo(() => {
    let rows = [...orders];
    // Exclude archived orders (Approved and older than 3 days)
    rows = rows.filter(o => !isOrderArchived(o));
    // Date range filter with robust validation and local timezone
    if (!dateError) {
      if (fromDate) {
        const fromMs = new Date(`${fromDate}T00:00:00`).getTime();
        rows = rows.filter(o => o.dateMs >= fromMs);
      }
      if (toDate) {
        const toMs = new Date(`${toDate}T23:59:59.999`).getTime();
        rows = rows.filter(o => o.dateMs <= toMs);
      }
    }
    // Status filter
    if (statusFilter && statusFilter !== 'All Status') {
      rows = rows.filter(o => String(o.status).toLowerCase() === String(statusFilter).toLowerCase());
    }
    // Search by id or customer
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(o => String(o.id).toLowerCase().includes(q) || String(o.customer).toLowerCase().includes(q));
    }
    // Sort by Order ID (highest to lowest)
    rows.sort((a, b) => b.idNum - a.idNum);
    return rows;
  }, [orders, statusFilter, fromDate, toDate, query, dateError]);

  // Reset to first page when filters change
  useEffect(() => { setCurrentPage(1); }, [fromDate, toDate, statusFilter, query]);

  // Validate date range
  useEffect(() => {
    if (fromDate && toDate) {
      if (fromDate > toDate) {
        setDateError('Invalid date range: From date is after To date.');
      } else {
        setDateError('');
      }
    } else {
      setDateError('');
    }
  }, [fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageEnd = pageStart + ITEMS_PER_PAGE;
  const pageRows = filtered.slice(pageStart, pageEnd);

  const toggleExpand = (id) => {
    setExpanded((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getItemImageSrc = (item) => {
    // Check for image URL in book, stationery, or yoga object
    const imgUrl = item.book?.image_url ||
      item.stationery?.image_url ||
      item.yoga?.image_url ||
      item.image_url ||
      item.book?.cover_image ||
      item.cover_image;
    if (imgUrl) return getBookCoverUrl(imgUrl);
    return item.book?.cover || item.cover || item.book?.thumbnail || item.image || '/assets/book-placeholder.jpg';
  };

  const getItemPrice = (item) => {
    const p = item.price ??
      item.unit_price ??
      item.book?.price ??
      item.stationery?.price ??
      item.yoga?.price ??
      0;
    return formatPrice(p);
  };

  const handleApproveStatus = async (orderId) => {
    try {
      setUpdatingOrderId(orderId);
      await updateOrderStatus(orderId, 'Approved');
      setOrders((prev) => prev.map((o) => (
        o.id === orderId
          ? { ...o, status: 'Approved', raw: { ...o.raw, status: 'Approved' } }
          : o
      )));
    } catch (e) {
      console.error('Update order status failed', e);
      alert('Không thể cập nhật trạng thái đơn hàng');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleSyncGhn = async () => {
    try {
      setSyncing(true);
      const result = await syncGhnStatus();
      alert(result?.message || 'Đã đồng bộ trạng thái GHN');
      // Refresh orders after sync
      const res = await getAllOrders();
      const list = Array.isArray(res) ? res : (res?.orders || res?.data || []);
      setOrders(list.map(mapOrderToRow));
    } catch (e) {
      console.error('Sync GHN failed', e);
      alert('Không thể đồng bộ trạng thái GHN');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="orders-page">
      <h1 className="page-title text-2xl font-bold text-gray-900">Danh sách đơn hàng</h1>

      {/* Top bar */}
      <div className="orders-toolbar">
        <Input className="search" placeholder="Tìm kiếm theo mã đơn hàng hoặc khách hàng" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="actions">
          <Button variant="outline" onClick={handleSyncGhn} disabled={syncing}>
            {syncing ? 'Đang đồng bộ...' : 'Sync GHN'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/orders/archive')}>Xem Lưu trữ</Button>
          <Button variant="primary">Xuất file Excel</Button>
        </div>
      </div>

      {/* Filters row */}
      <div className="filters-row">
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="Pending">Đã duyệt</option>
          <option value="Approved">Chờ duyệt</option>
        </select>
        <select value={'desc'} readOnly>
          <option value={'desc'}>Mã đơn hàng: Cao → Thấp</option>
        </select>
        <Button variant="outline" onClick={handleResetFilters}>Đặt lại bộ lọc</Button>
      </div>
      {dateError && (
        <div className="validation-error">{dateError}</div>
      )}

      {/* Table */}
      <div className="orders-table">
        <div className="orders-header">
          <div className="col col-check"></div>
          <div className="col col-id">Mã đơn hàng</div>
          <div className="col col-date">Ngày đặt</div>
          <div className="col col-customer">Khách hàng</div>
          <div className="col col-address">Địa chỉ</div>
          <div className="col col-payment">Phương thức thanh toán</div>
          <div className="col col-total">Tổng cộng</div>
          <div className="col col-status">Trạng thái</div>
          <div className="col col-expand">Hiển thị</div>
        </div>
        {loading && (
          <div className="order-row">
            <div className="col col-check"></div>
            <div className="col col-id">Loading...</div>
            <div className="col col-date">—</div>
            <div className="col col-customer">—</div>
            <div className="col col-address">—</div>
            <div className="col col-payment">—</div>
            <div className="col col-total">—</div>
            <div className="col col-status">—</div>
            <div className="col col-expand"></div>
          </div>
        )}
        {error && !loading && (
          <div className="order-row">
            <div className="col col-check"></div>
            <div className="col col-id">Error</div>
            <div className="col col-date" style={{ color: '#dc2626' }}>{error}</div>
          </div>
        )}
        {!loading && !error && pageRows.map(order => {
          const isOpen = expanded.includes(order.id);
          return (
            <div key={order.id} className="order-block">
              <div className="order-row">
                <div className="col col-check"><input type="checkbox" /></div>
                <div className="col col-id">
                  <button className="link" onClick={() => navigate(`/admin/orders/${order.id}`)}>
                    {order.ghnCode || `#${order.id}`}
                  </button>
                </div>
                <div className="col col-date">{order.date}</div>
                <div className="col col-customer">{order.customer}</div>
                <div className="col col-address">{order.address}</div>
                <div className="col col-payment">{order.paymentMethod}</div>
                <div className="col col-total">{order.total}</div>
                <div className="col col-status">
                  {(() => {
                    const statusInfo = getStatusInfo(order.status);
                    const isPending = String(order.status).toLowerCase() === 'pending';
                    return isPending ? (
                      <button
                        className="status-btn pending"
                        disabled={updatingOrderId === order.id}
                        onClick={() => handleApproveStatus(order.id)}
                      >
                        {statusInfo.label}
                      </button>
                    ) : (
                      <span className={`status-badge ${statusInfo.class}`}>
                        {statusInfo.label}
                      </span>
                    );
                  })()}
                </div>
                <div className="col col-expand">
                  <button className="icon" onClick={() => toggleExpand(order.id)} aria-label="expand">
                    {isOpen ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              {isOpen && order.raw && (order.raw.order_items || order.raw.items)?.length > 0 && (
                <div className="items-panel">
                  {(order.raw.order_items || order.raw.items).map((item, idx) => {
                    // Determine product type and get appropriate data
                    const product = item.book || item.stationery || item.yoga || item;
                    const productId = item.book_id || item.stationery_id || item.yoga_id || item.product_id;
                    const productType = item.book_id ? 'Book' : item.stationery_id ? 'Stationery' : item.yoga_id ? 'Yoga' : 'Product';
                    const productCode = product?.isbn || product?.sku || item.code || '';

                    return (
                      <div key={idx} className="item-row">
                        <img src={getItemImageSrc(item)} alt="" className="thumb" />
                        <div className="item-main">
                          <div className="name">{product?.title || item.title || `${productType} #${productId}`}</div>
                          <div className="code">{productCode}</div>
                        </div>
                        <div className="item-meta">
                          <div className="cell"><span className="label">Số lượng:</span> <span className="value">{item.quantity}</span></div>
                          <div className="cell"><span className="label">Giá:</span> <span className="value">{getItemPrice(item)}</span></div>
                          <div className="cell"><span className="label">Mã {productType}:</span> <span className="value">{productId}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination centered */}
      {!loading && !error && (
        <div className="pagination">
          <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Prev</button>
          {(() => {
            // Smart pagination: show first, last, current ±2 neighbors, with ellipsis
            const pages = [];
            const delta = 2; // number of pages around current page
            const left = Math.max(2, currentPage - delta);
            const right = Math.min(totalPages - 1, currentPage + delta);

            // Always show first page
            pages.push(1);

            // Add ellipsis after first page if needed
            if (left > 2) {
              pages.push('...');
            }

            // Add pages around current
            for (let i = left; i <= right; i++) {
              if (i > 1 && i < totalPages) {
                pages.push(i);
              }
            }

            // Add ellipsis before last page if needed
            if (right < totalPages - 1) {
              pages.push('...');
            }

            // Always show last page if more than 1 page
            if (totalPages > 1) {
              pages.push(totalPages);
            }

            return pages.map((page, idx) => {
              if (page === '...') {
                return <span key={`ellipsis-${idx}`} className="page-ellipsis">...</span>;
              }
              return (
                <button
                  key={page}
                  className={`page-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              );
            });
          })()}
          <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      )}
    </div>
  );
};

export default OrdersList;
