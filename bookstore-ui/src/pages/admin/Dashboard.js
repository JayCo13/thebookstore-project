import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components';
import { formatPrice } from '../../utils/currency';
import { getAllOrders, getAllOrdersAdmin, getBooks, getCategories, getBooksByCategory, getAllReviews } from '../../service';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Link2, CheckCircle, RefreshCw, X } from 'lucide-react';
import './Dashboard.css';

// GHN Status Vietnamese translations
const GHN_STATUS_MAP = {
  'ready_to_pick': { label: 'Chờ lấy hàng', class: 'checking' },
  'picking': { label: 'Đang lấy hàng', class: 'checking' },
  'cancel': { label: 'Đã hủy', class: 'cancelled' },
  'money_collect_picking': { label: 'Thu tiền khi lấy', class: 'checking' },
  'picked': { label: 'Đã lấy hàng', class: 'in-transit' },
  'storing': { label: 'Đang lưu kho', class: 'in-transit' },
  'transporting': { label: 'Đang vận chuyển', class: 'in-transit' },
  'sorting': { label: 'Đang phân loại', class: 'in-transit' },
  'delivering': { label: 'Đang giao hàng', class: 'in-transit' },
  'money_collect_delivering': { label: 'Thu tiền khi giao', class: 'in-transit' },
  'delivered': { label: 'Đã giao hàng', class: 'delivered' },
  'delivery_fail': { label: 'Giao thất bại', class: 'cancelled' },
  'waiting_to_return': { label: 'Chờ hoàn hàng', class: 'checking' },
  'return': { label: 'Đang hoàn hàng', class: 'checking' },
  'return_transporting': { label: 'Vận chuyển hoàn', class: 'in-transit' },
  'return_sorting': { label: 'Phân loại hoàn', class: 'in-transit' },
  'returning': { label: 'Đang hoàn hàng', class: 'in-transit' },
  'return_fail': { label: 'Hoàn thất bại', class: 'cancelled' },
  'returned': { label: 'Đã hoàn hàng', class: 'delivered' },
  'exception': { label: 'Ngoại lệ', class: 'cancelled' },
  'damage': { label: 'Hư hỏng', class: 'cancelled' },
  'lost': { label: 'Mất hàng', class: 'cancelled' },
  'pending': { label: 'Chờ duyệt', class: 'checking' },
  'approved': { label: 'Đã duyệt', class: 'delivered' },
  'processing': { label: 'Đang xử lý', class: 'in-transit' },
  'shipped': { label: 'Đã gửi', class: 'in-transit' },
  'completed': { label: 'Hoàn thành', class: 'delivered' },
  'cancelled': { label: 'Đã hủy', class: 'cancelled' },
};

const getStatusInfo = (status) => {
  const key = String(status || 'pending').toLowerCase();
  return GHN_STATUS_MAP[key] || { label: status || 'Không xác định', class: 'checking' };
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalBooks: 0,
    pendingOrders: 0,
    deliveriesToday: 0,
    revenue: 0
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('Dec 2024');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dailyIncome, setDailyIncome] = useState({ today: 0, yesterday: 0 });
  const [monthlyIncomeByYear, setMonthlyIncomeByYear] = useState({});
  const [topCategories, setTopCategories] = useState([]);
  const [userActivity, setUserActivity] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);
  const [scale, setScale] = useState(1); // chart vertical scale (zoom)
  const chartRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(720);
  const [hoverIdx, setHoverIdx] = useState(null);
  const navigate = useNavigate();

  // Zalo OA connection status
  const [zaloStatus, setZaloStatus] = useState({ connected: false, message: '', loading: true });

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        // Fetch orders (admin) with fallback to alternative endpoint
        // Pass high limit to get all orders for accurate monthly income data
        let ordersRes;
        try {
          ordersRes = await getAllOrders({ limit: 10000 });
        } catch (e) {
          ordersRes = await getAllOrdersAdmin({ limit: 10000 });
        }
        let orders = Array.isArray(ordersRes) ? ordersRes : (ordersRes?.orders || ordersRes?.data || []);

        // NOTE: GHN status is now stored in the order's status field by the backend
        // Removed individual GHN API calls here to improve loading speed

        // Fetch total books count efficiently
        let booksRes = await getBooks({ page: 1, per_page: 1 });
        const totalBooks = Number(booksRes?.total || (Array.isArray(booksRes) ? booksRes.length : 0));

        // Derive KPI stats
        const revenue = orders.reduce((sum, o) => sum + Number(o?.total_amount || o?.total || 0), 0);
        const pendingOrders = orders.filter(o => String(o?.status || '').toLowerCase() === 'pending').length;
        const todayKey = new Date().toISOString().slice(0, 10);
        const deliveriesToday = orders.filter(o => {
          const status = String(o?.status || '').toLowerCase();
          const date = o?.order_date || o?.created_at || o?.date;
          const dkey = date ? new Date(date).toISOString().slice(0, 10) : '';
          return (status === 'delivered' || status === 'shipped') && dkey === todayKey;
        }).length;
        console.groupCollapsed('[Admin Dashboard] KPI status counters');
        console.log('pendingOrders:', pendingOrders);
        console.log('deliveriesToday:', deliveriesToday);
        console.groupEnd();

        setStats({ totalBooks, pendingOrders, deliveriesToday, revenue });

        // Recent orders (latest 5)
        const sorted = [...orders].sort((a, b) => new Date(b?.order_date || b?.created_at || 0) - new Date(a?.order_date || a?.created_at || 0));
        const recent = sorted.slice(0, 6).map(o => {
          const id = o?.order_id ?? o?.id ?? '—';
          const createdAt = o?.order_date || o?.created_at || o?.date;
          const dateObj = createdAt ? new Date(createdAt) : null;
          const time = dateObj ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
          const firstItem = Array.isArray(o?.order_items) ? o.order_items[0] : null;
          const bookTitle = firstItem?.book?.title || `Order ${id}`;
          const firstName = o?.user?.first_name || o?.customer?.first_name || '';
          const lastName = o?.user?.last_name || o?.customer?.last_name || '';
          const customer = o?.customer_name || `${firstName} ${lastName}`.trim() || o?.user?.email || 'Khách vãn lai';
          const amount = Number(o?.total_amount || o?.total || 0);
          const status = o?.status || 'pending';
          return { id, customer, book: bookTitle, amount, status, time };
        });
        setRecentOrders(recent);

        // Build monthly income per year from orders
        const map = {};
        orders.forEach(o => {
          const date = o?.order_date || o?.created_at || o?.date;
          if (!date) return;
          const d = new Date(date);
          const y = d.getFullYear();
          const m = d.getMonth(); // 0..11
          const amount = Number(o?.total_amount || o?.total || 0) || 0;
          if (!map[y]) map[y] = Array(12).fill(0);
          map[y][m] += amount;
        });

        // Debug: Log the monthly income data for verification
        console.groupCollapsed('[Admin Dashboard] Monthly Income Data');
        console.log('Raw orders count:', orders.length);
        console.log('Monthly income by year:', map);
        console.log('Current year data:', map[new Date().getFullYear()]);
        console.groupEnd();
        // Ensure current year and previous year exist for better data continuity
        const curY = new Date().getFullYear();
        const prevY = curY - 1;
        if (!map[curY]) map[curY] = Array(12).fill(0);
        if (!map[prevY]) map[prevY] = Array(12).fill(0);
        setMonthlyIncomeByYear(map);
        setSelectedYear(curY);

        // Daily income: today vs yesterday
        const today = new Date();
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const toKey = today.toISOString().slice(0, 10);
        const yKey = yesterday.toISOString().slice(0, 10);
        const todayIncome = orders.reduce((sum, o) => {
          const d = o?.order_date || o?.created_at || o?.date;
          const key = d ? new Date(d).toISOString().slice(0, 10) : '';
          return key === toKey ? sum + Number(o?.total_amount || o?.total || 0) : sum;
        }, 0);
        const yIncome = orders.reduce((sum, o) => {
          const d = o?.order_date || o?.created_at || o?.date;
          const key = d ? new Date(d).toISOString().slice(0, 10) : '';
          return key === yKey ? sum + Number(o?.total_amount || o?.total || 0) : sum;
        }, 0);
        setDailyIncome({ today: todayIncome, yesterday: yIncome });

        // Top Categories: prefer deriving from orders' item.book.categories; fallback to catalog distribution
        const catCounts = {};
        orders.forEach(o => {
          const items = o?.order_items || [];
          items.forEach(it => {
            const qty = Number(it?.quantity || 1);
            const catList = it?.book?.categories || it?.book?.category || [];
            if (Array.isArray(catList)) {
              catList.forEach(c => {
                const name = typeof c === 'string' ? c : (c?.name || c?.category_name || c?.title || 'Unknown');
                if (!name) return;
                catCounts[name] = (catCounts[name] || 0) + qty;
              });
            } else if (typeof catList === 'string') {
              const name = catList;
              catCounts[name] = (catCounts[name] || 0) + qty;
            }
          });
        });

        let topCats = [];
        const catEntries = Object.entries(catCounts);
        if (catEntries.length > 0) {
          const sorted = catEntries.sort((a, b) => b[1] - a[1]).slice(0, 5);
          const max = Math.max(sorted[0]?.[1] || 1, 1);
          topCats = sorted.map(([name, count]) => ({ name, percent: Math.round((count / max) * 100) }));
        } else {
          try {
            const catsRes = await getCategories();
            const cats = Array.isArray(catsRes) ? catsRes : (catsRes?.data || []);
            const picks = cats.slice(0, 6);
            const totals = [];
            for (const c of picks) {
              const id = c?.category_id || c?.id;
              if (!id) continue;
              try {
                const r = await getBooksByCategory(id, { page: 1, per_page: 1 });
                const total = Number(r?.total || (Array.isArray(r) ? r.length : 0));
                totals.push({ name: c?.name || `Category ${id}`, value: total });
              } catch (err) {
                // skip category if API fails
              }
            }
            const sortedTotals = totals.sort((a, b) => b.value - a.value).slice(0, 5);
            const max = Math.max(sortedTotals[0]?.value || 1, 1);
            topCats = sortedTotals.map(t => ({ name: t.name, percent: Math.round((t.value / max) * 100) }));
          } catch (err) {
            topCats = [];
          }
        }
        setTopCategories(topCats);

        // User Activity: summarize orders per user (include stationery)
        const activityMap = new Map();
        orders.forEach(o => {
          // Use user_id as key, or 'guest-{order_id}' for guests
          const userId = o?.user_id || `guest-${o?.order_id}`;

          // For registered users, we only have user_id (no email in order response)
          // For guests, we have guest_email and shipping_full_name
          const isGuest = !o?.user_id;
          const email = isGuest ? (o?.guest_email || 'Không có mail') : `User #${o?.user_id}`;
          const name = o?.shipping_full_name || (isGuest ? 'Khách vãn lai' : `Khách hàng #${o?.user_id}`);

          const createdAt = new Date(o?.order_date || o?.created_at || Date.now());
          const allItems = Array.isArray(o?.order_items) ? o.order_items : [];
          const firstIt = allItems[0];

          // Get activity description from first item
          let lastActivity = 'Đã đặt hàng';
          if (firstIt?.book?.title) {
            lastActivity = `Đã mua "${firstIt.book.title}"`;
          } else if (firstIt?.stationery?.title) {
            lastActivity = `Đã mua "${firstIt.stationery.title}"`;
          }

          const prev = activityMap.get(userId) || { orders: 0, totalQty: 0, totalAmount: 0, lastMs: 0 };
          const ordersCount = prev.orders + 1;
          const lastMs = Math.max(prev.lastMs, createdAt.getTime());
          const qtySum = allItems.reduce((s, it) => s + Number(it?.quantity || 0), 0);
          const amount = Number(o?.total_amount || o?.total || 0) || 0;

          activityMap.set(userId, {
            user: prev.user || name,
            email: prev.email || email,
            lastActivity,
            orders: ordersCount,
            totalQty: prev.totalQty + qtySum,
            totalAmount: prev.totalAmount + amount,
            lastMs
          });
        });

        const now = Date.now();
        const activities = Array.from(activityMap.values())
          .map(a => ({
            ...a,
            status: now - a.lastMs < 1000 * 60 * 60 * 24 * 7 ? 'Active' : 'Idle'
          }))
          .sort((a, b) => b.lastMs - a.lastMs)
          .slice(0, 10);
        setUserActivity(activities);

        // Recent reviews (latest 5)
        try {
          const revRes = await getAllReviews({ limit: 5 });
          const list = Array.isArray(revRes) ? revRes : (revRes?.data || []);
          setRecentReviews(list);
        } catch (err) {
          setRecentReviews([]);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  // Responsive chart width observer
  useEffect(() => {
    const handleResize = () => {
      const w = chartRef.current?.clientWidth || 720;
      setChartWidth(w);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const StatCard = ({ title, value, trend, icon }) => (
    <div className="stat-card compact">
      <div className="stat-icon circle">{icon}</div>
      <div className="stat-content">
        <h3 className="stat-value">{value}</h3>
        <div className="stat-sub">
          <span className="stat-title">{title}</span>
          {trend && <span className={`trend ${trend.direction}`}>{trend.value}</span>}
        </div>
      </div>
    </div>
  );

  const revenuePercent = 52; // placeholder for potential gauge usage
  const monthNames = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
  const incomeData = monthlyIncomeByYear[selectedYear] || [];
  const maxIncome = Math.max(...(incomeData.length > 0 ? incomeData : [0]), 1);
  const niceMax = Math.ceil(maxIncome / 50000) * 50000; // round up to nearest 50k
  const displayMax = Math.max(1, Math.round(niceMax / Math.max(scale, 0.1))); // apply scale factor
  const chartH = 230; // increased height to better contain data and labels
  const xPadLeft = 12;
  const xPadRight = 12;
  const innerW = Math.max(0, chartWidth - xPadLeft - xPadRight);
  const stepX = incomeData.length > 1 ? innerW / (incomeData.length - 1) : innerW; // responsive spacing inside padding
  const chartW = chartWidth; // keep coordinate space equal to rendered width
  const points = incomeData.map((val, idx) => {
    const x = xPadLeft + idx * stepX;
    const y = chartH - (val / displayMax) * chartH; // baseline at 0, scaled
    return `${x},${y}`;
  }).join(' ');
  const ticksCount = 5;
  const yTicks = Array.from({ length: ticksCount + 1 }, (_, i) => Math.round((displayMax / ticksCount) * i));
  const yGridPositions = yTicks.map((t) => chartH - (t / displayMax) * chartH);
  const xGridPositions = incomeData.map((_, idx) => xPadLeft + idx * stepX);
  const totalIncomeYear = (monthlyIncomeByYear[selectedYear] || []).reduce((a, b) => a + (b || 0), 0);
  const currentMonthIndex = new Date().getMonth();
  const totalIncomeMonth = (monthlyIncomeByYear[selectedYear] || [])[currentMonthIndex] || 0;
  const pulsePercent = Math.min(100, Math.max(0, (dailyIncome.today / Math.max(dailyIncome.yesterday, 1)) * 100));
  const diffPercent = (((dailyIncome.today - dailyIncome.yesterday) / Math.max(dailyIncome.yesterday, 1)) * 100).toFixed(1);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/** navigation helper */}

      <div className="page-intro">

        <div>
          <p className="hello">Chào mừng trở lại,</p>
          <h1 className="headline">Trang Quản Trị</h1>
        </div>
        <div className="intro-actions">
          <div className="timeframe">
            <label>Thời gian</label>
            <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
              <option>Tháng 12/2024</option>
              <option>Tháng 11/2024</option>
              <option>30 ngày qua</option>
            </select>
          </div>
          <Button variant="outline">Xuất CSV</Button>
          <ZaloConnectButton status={zaloStatus} setStatus={setZaloStatus} />
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpi-row">
        <StatCard
          title="Tổng Sản Phẩm"
          value={stats.totalBooks.toLocaleString()}
          trend={null}
          icon={<IconBooks />}
        />
        <StatCard
          title="Đơn Chờ Xử Lý"
          value={stats.pendingOrders.toLocaleString()}
          trend={null}
          icon={<IconReceipt />}
        />
        <StatCard
          title="Doanh Thu Tháng"
          value={formatPrice(totalIncomeMonth)}
          trend={null}
          icon={<IconReceipt />}
        />
        <StatCard
          title="Doanh Thu Năm"
          value={formatPrice(totalIncomeYear)}
          trend={null}
          icon={<IconReceipt />}
        />
      </div>

      {/* Grid sections */}
      <div className="grid-3">
        {/* Monthly Revenue Bar Chart */}
        <section className="panel wide">
          <div className="section-header">
            <h2>Doanh thu theo tháng</h2>
            <div className="section-tools">
              <div className="legend"><span className="dot dark"></span> Doanh thu</div>
              <div className="year-switcher">
                <label>Năm</label>
                <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}>
                  {Object.keys(monthlyIncomeByYear).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart
                data={monthNames.map((name, idx) => ({
                  name,
                  revenue: (monthlyIncomeByYear[selectedYear] || [])[idx] || 0
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis
                  tickFormatter={(value) => formatPrice(value)}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  width={100}
                />
                <Tooltip
                  formatter={(value) => [formatPrice(value), 'Doanh thu']}
                  labelFormatter={(label) => `${label} ${selectedYear}`}
                  contentStyle={{
                    backgroundColor: '#111',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    padding: '10px 14px'
                  }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: 4 }}
                />
                <Bar
                  dataKey="revenue"
                  fill="#0d9488"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Daily Revenue Comparison */}
        <section className="panel pulse-panel">
          <div className="section-header">
            <h2 className='text-center'>Tỉ lệ doanh thu theo ngày</h2>
          </div>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Hôm nay', value: dailyIncome.today || 0 },
                    { name: 'Hôm qua', value: dailyIncome.yesterday || 0 }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  <Cell fill="#0d9488" />
                  <Cell fill="#9ca3af" />
                </Pie>
                <Tooltip
                  formatter={(value) => formatPrice(value)}
                  contentStyle={{
                    backgroundColor: '#111',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff'
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry) => {
                    const amount = entry.payload.value;
                    return `${value}: ${formatPrice(amount)}`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="pulse-meta" style={{ textAlign: 'center', marginTop: 8 }}>
            <div className={`pulse-diff ${diffPercent >= 0 ? 'up' : 'down'}`} style={{ fontSize: 18, fontWeight: 'bold' }}>
              {diffPercent >= 0 ? '▲' : '▼'} {Math.abs(diffPercent)}% so với hôm qua
            </div>
          </div>
        </section>

        {/* Column: Top Genres + Reviews stacked next to Tracking Orders */}
        <div className="stacked-panels">
          <section className="panel">
            <div className="section-header">
              <h2>Đơn hàng gần nhất</h2>
            </div>
            <div className="tracking-table-wrap">
              <table className="tracking-table">
                <thead>
                  <tr>
                    <th>Mã đơn hàng</th>
                    <th>Người mua</th>
                    <th>Sách</th>
                    <th>Tổng tiền</th>
                    <th>Trạng thái</th>
                    <th>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length ? (
                    recentOrders.slice(0, 6).map((o) => (
                      <tr key={o.id}>
                        <td>
                          <button
                            onClick={() => navigate(`/admin/orders/${o.id}`)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#0d9488',
                              cursor: 'pointer',
                              fontWeight: '600',
                              textDecoration: 'underline',
                              padding: 0
                            }}
                          >
                            #{o.id}
                          </button>
                        </td>
                        <td>{o.customer}</td>
                        <td>{o.book}</td>
                        <td>{formatPrice(o.amount)}</td>
                        <td>
                          {(() => {
                            const info = getStatusInfo(o.status);
                            return <span className={`badge ${info.class}`}>{info.label}</span>;
                          })()}
                        </td>
                        <td>{o.time}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="6" style={{ textAlign: 'center', color: '#6b7280' }}>Không có đơn hàng gần đây</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel">
            <div className="section-header">
              <h2>Đánh giá gần nhất</h2>
              <div>
                <Button variant="outline" size="small" onClick={() => navigate('/admin/reviews')}>Xem đầy đủ</Button>
              </div>
            </div>
            <ul className="reviews-list">
              {recentReviews.length ? (
                recentReviews.map((r) => (
                  <li key={r.review_id}>
                    <div className="review-meta">
                      <strong>{r.book_title || `#${r.book_id}`}</strong>
                      <span className="stars">{('★'.repeat(Number(r.rating || 0))).padEnd(5, '☆')}</span>
                    </div>
                    <p>{r.comment || '—'}</p>
                  </li>
                ))
              ) : (
                <li style={{ textAlign: 'center', color: '#6b7280' }}>Không có đánh giá gần đây</li>
              )}
            </ul>
          </section>
        </div>
      </div>

      {/* Extended full-width User Tracking table (replaces Inventory Health) */}
      <section className="panel full">
        <div className="section-header">
          <h2>Hoạt đông khách hàng</h2>
        </div>
        <div className="tracking-table-wrap">
          <table className="tracking-table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Email</th>
                <th>Hoạt động</th>
                <th>Số lượng</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {userActivity.length ? (
                userActivity.map((u, idx) => (
                  <tr key={u.email || idx}>
                    <td>{u.user}</td>
                    <td>{u.email}</td>
                    <td>{u.lastActivity}</td>
                    <td>{u.totalQty}</td>
                    <td>{formatPrice(u.totalAmount)}</td>
                    <td><span className={`badge ${u.status === 'Active' ? 'delivered' : 'checking'}`}>{u.status}</span></td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" style={{ textAlign: 'center', color: '#6b7280' }}>Không có hoạt động gần đây</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

// Small helper component to navigate to create-book
const AddBookButton = () => {
  const navigate = useNavigate();
  return (
    <Button variant="primary" onClick={() => navigate('/admin/books/new')}>Thêm sách mới</Button>
  );
};

// Backend API base URL
const API_BASE_URL = 'http://localhost:8000';

// Zalo OA Connection Button with status check
const ZaloConnectButton = ({ status, setStatus }) => {
  const [checking, setChecking] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);
  const [accessToken, setAccessToken] = React.useState('');
  const [refreshToken, setRefreshToken] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  // Check status on mount and when URL has zalo params
  React.useEffect(() => {
    const checkZaloStatus = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const token = userData.access_token;
        if (!token) {
          setStatus({ connected: false, message: 'Chưa đăng nhập', loading: false });
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/v1/auth/zalo/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          const isConnected = data.message.includes('Đã kết nối');
          setStatus({
            connected: isConnected,
            message: data.message,
            loading: false
          });
        } else {
          setStatus({ connected: false, message: 'Chưa kết nối Zalo', loading: false });
        }
      } catch (err) {
        setStatus({ connected: false, message: 'Lỗi kết nối', loading: false });
      }
    };

    checkZaloStatus();
  }, [setStatus]);

  const handleSaveTokens = async () => {
    if (!accessToken.trim() || !refreshToken.trim()) {
      alert('Vui lòng nhập cả Access Token và Refresh Token');
      return;
    }

    setSaving(true);
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const token = userData.access_token;

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/zalo/set-tokens`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          access_token: accessToken.trim(),
          refresh_token: refreshToken.trim(),
          oa_id: 'default'
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setShowModal(false);
        setAccessToken('');
        setRefreshToken('');
        setStatus({ connected: true, message: 'Zalo OA đã kết nối!', loading: false });
      } else {
        const error = await response.json();
        alert(`Lỗi: ${error.detail || 'Không thể lưu tokens'}`);
      }
    } catch (err) {
      console.error('Error saving Zalo tokens:', err);
      alert('Lỗi kết nối với server');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const token = userData.access_token;
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/zalo/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const isConnected = data.message.includes('Đã kết nối');
        setStatus({ connected: isConnected, message: data.message, loading: false });
      }
    } catch (err) {
      console.error('Error checking Zalo status:', err);
    } finally {
      setChecking(false);
    }
  };

  if (status.loading) {
    return <Button variant="outline" disabled>Đang kiểm tra Zalo...</Button>;
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {status.connected ? (
          <>
            <span style={{
              fontSize: '13px',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ecfdf5',
              padding: '6px 12px',
              borderRadius: '8px',
              fontWeight: '500'
            }}>
              <CheckCircle size={16} />
              Zalo đã kết nối
            </span>
            <Button variant="outline" size="small" onClick={handleCheckStatus} disabled={checking} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
              {checking ? '' : 'Kiểm tra'}
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            onClick={() => setShowModal(true)}
            style={{
              background: 'linear-gradient(135deg, #0068ff 0%, #0052cc 100%)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(0,104,255,0.3)'
            }}
          >
            <Link2 size={18} />
            Kết nối Zalo OA
          </Button>
        )}
      </div>

      {/* Token Input Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '24px',
            maxWidth: '500px', width: '90%', boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#0068ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link2 size={20} /> Kết nối Zalo OA
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} color="#666" />
              </button>
            </div>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
              Nhập Access Token và Refresh Token từ Zalo Developer Console:
            </p>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Access Token:</label>
              <textarea
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Dán access_token tại đây..."
                style={{
                  width: '100%', padding: '8px', borderRadius: '6px',
                  border: '1px solid #ddd', minHeight: '60px', resize: 'vertical'
                }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Refresh Token:</label>
              <textarea
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                placeholder="Dán refresh_token tại đây..."
                style={{
                  width: '100%', padding: '8px', borderRadius: '6px',
                  border: '1px solid #ddd', minHeight: '60px', resize: 'vertical'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
              <Button variant="primary" onClick={handleSaveTokens} disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu Tokens'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Modern inline SVG icons
const IconBooks = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="7" height="16" rx="2" stroke="#111" strokeWidth="1.5" />
    <rect x="14" y="4" width="7" height="16" rx="2" stroke="#111" strokeWidth="1.5" />
    <path d="M10 7H6" stroke="#111" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M21 7H17" stroke="#111" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconReceipt = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 3h12v18l-2-1-2 1-2-1-2 1-2-1-2 1V3z" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M8 8h8M8 12h8M8 16h5" stroke="#111" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconTruck = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="5" width="10" height="10" rx="2" stroke="#111" strokeWidth="1.5" />
    <path d="M13 8h4l3 3v4h-3" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="7" cy="17" r="2" stroke="#111" strokeWidth="1.5" />
    <circle cx="18" cy="17" r="2" stroke="#111" strokeWidth="1.5" />
  </svg>
);

export default Dashboard;
