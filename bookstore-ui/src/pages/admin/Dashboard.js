import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components';
import './Dashboard.css';

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
  const [selectedYear, setSelectedYear] = useState(2024);
  const [dailyIncome, setDailyIncome] = useState({ today: 12850, yesterday: 11940 });

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setStats({
        totalBooks: 1250,
        pendingOrders: 42,
        deliveriesToday: 16,
        revenue: 272980.19
      });

      // sales graph now uses monthly income by year (see below)

      setRecentOrders([
        { id: 172989, customer: 'John Doe', book: 'The Great Gatsby', amount: 15.99, status: 'In transit', time: '10:23 AM' },
        { id: 172990, customer: 'Jane Smith', book: 'To Kill a Mockingbird', amount: 12.99, status: 'Checking', time: '09:10 AM' },
        { id: 172991, customer: 'Bob Johnson', book: '1984', amount: 13.99, status: 'Delivered', time: '08:42 AM' },
      ]);

      // Simulate daily income values
      setDailyIncome({ today: 12850, yesterday: 11940 });

      setLoading(false);
    }, 600);
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

  const revenuePercent = 52; // mock +2.52% => 52% of arc for illustration

  // Monthly Income data by year (mocked). Values represent income per month.
  const monthlyIncomeByYear = {
    2023: [
      182_000, 195_500, 205_300, 212_800, 225_400, 238_900,
      245_100, 251_700, 248_200, 255_600, 261_300, 268_900
    ],
    2024: [
      198_400, 207_900, 219_200, 231_500, 244_300, 259_100,
      272_800, 281_400, 296_900, 310_500, 324_200, 339_800
    ]
  };
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const incomeData = monthlyIncomeByYear[selectedYear] || [];
  const maxIncome = Math.max(...incomeData, 1);
  const niceMax = Math.ceil(maxIncome / 50000) * 50000; // round up to nearest 50k
  const chartH = 230; // increased height to better contain data and labels
  const stepX = 80; // virtual step for equal spacing; scales via viewBox
  const chartW = Math.max((incomeData.length - 1) * stepX, stepX);
  const points = incomeData.map((val, idx) => {
    const x = idx * stepX;
    const y = chartH - (val / niceMax) * chartH; // baseline at 0
    return `${x},${y}`;
  }).join(' ');
  const ticksCount = 5;
  const yTicks = Array.from({ length: ticksCount + 1 }, (_, i) => Math.round((niceMax / ticksCount) * i));
  const yGridPositions = yTicks.map((t) => chartH - (t / niceMax) * chartH);
  const xGridPositions = incomeData.map((_, idx) => idx * stepX);
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
          <p className="hello">Hello Admin,</p>
          <h1 className="headline">Good Morning</h1>
        </div>
        <div className="intro-actions">
          <div className="timeframe">
            <label>Timeframe</label>
            <select value={timeframe} onChange={(e)=>setTimeframe(e.target.value)}>
              <option>Dec 2024</option>
              <option>Nov 2024</option>
              <option>Last 30 days</option>
            </select>
          </div>
          <Button variant="outline">Export CSV</Button>
          <AddBookButton />
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpi-row">
        <StatCard
          title="Total Titles"
          value={stats.totalBooks.toLocaleString()}
          trend={{ direction: 'up', value: '+1.92%' }}
          icon="📚"
        />
        <StatCard
          title="Pending Orders"
          value={stats.pendingOrders.toLocaleString()}
          trend={{ direction: 'up', value: '+1.89%' }}
          icon="🧾"
        />
        <StatCard
          title="Deliveries Today"
          value={stats.deliveriesToday.toLocaleString()}
          trend={{ direction: 'down', value: '-0.98%' }}
          icon="🚚"
        />
      </div>

      {/* Grid sections */}
      <div className="grid-3">
        <section className="panel wide">
          <div className="section-header">
            <h2>Sales Statistics</h2>
            <div className="section-tools">
              <div className="legend"><span className="dot dark"></span> Income</div>
              <div className="year-switcher">
                <label>Year</label>
                <select value={selectedYear} onChange={(e)=>setSelectedYear(parseInt(e.target.value, 10))}>
                  {Object.keys(monthlyIncomeByYear).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="line-chart">
            <div className="y-axis" style={{height: chartH}}>
              {yTicks.slice().reverse().map((t) => (
                <div className="y-tick" key={t}><span>${t.toLocaleString()}</span></div>
              ))}
            </div>
            <div className="chart-area" style={{height: chartH}}>
              <svg className="line-svg" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
                <g className="grid">
                  {yGridPositions.map((y, i) => (
                    <line key={`h-${i}`} x1={0} x2={chartW} y1={y} y2={y} className="grid-line h" />
                  ))}
                  {xGridPositions.map((x, i) => (
                    <line key={`v-${i}`} x1={x} x2={x} y1={0} y2={chartH} className="grid-line v" />
                  ))}
                </g>
                <polyline points={points} className="line" />
              </svg>
              <div className="x-axis">
                {monthNames.map((m, idx) => (
                  <span className="x-label" key={m+idx}>{m}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Column: Daily Income Pulse gauge */}
        <section className="panel pulse-panel">
          <div className="section-header">
            <h2>Daily Income Pulse</h2>
          </div>
          <div className="half-gauge" style={{"--deg": `${(pulsePercent/100)*180}deg`}}></div>
          <div className="pulse-legend"><span className="dot"></span> Today <span className="dot light"></span> Yesterday</div>
          <div className="pulse-meta">
            <div>
              <div className="pulse-amount">Today: ${dailyIncome.today.toLocaleString()}</div>
              <div className="pulse-amount muted">Yesterday: ${dailyIncome.yesterday.toLocaleString()}</div>
            </div>
            <div className={`pulse-diff ${diffPercent >= 0 ? 'up' : 'down'}`}>{diffPercent >= 0 ? '▲' : '▼'} {Math.abs(diffPercent)}%</div>
          </div>
        </section>

        {/* Column: Top Genres + Reviews stacked next to Tracking Orders */}
        <div className="stacked-panels">
          <section className="panel">
            <div className="section-header">
              <h2>Top Genres</h2>
            </div>
            <div className="hbars">
              <div className="hbar"><span>Fiction</span><div style={{width:'78%'}} /></div>
              <div className="hbar"><span>Self‑Help</span><div style={{width:'64%'}} /></div>
              <div className="hbar"><span>Business</span><div style={{width:'52%'}} /></div>
              <div className="hbar"><span>Children</span><div style={{width:'47%'}} /></div>
              <div className="hbar"><span>Science</span><div style={{width:'41%'}} /></div>
            </div>
          </section>
          <section className="panel">
            <div className="section-header">
              <h2>Recent Reviews</h2>
            </div>
            <ul className="reviews-list">
              <li>
                <div className="review-meta">
                  <strong>The Great Gatsby</strong>
                  <span className="stars">★★★★★</span>
                </div>
                <p>“Beautiful edition and fast delivery.”</p>
              </li>
              <li>
                <div className="review-meta">
                  <strong>Atomic Habits</strong>
                  <span className="stars">★★★★☆</span>
                </div>
                <p>“Insightful, customers love it.”</p>
              </li>
              <li>
                <div className="review-meta">
                  <strong>Clean Code</strong>
                  <span className="stars">★★★★☆</span>
                </div>
                <p>“Popular among students this week.”</p>
              </li>
            </ul>
          </section>
        </div>
      </div>

      {/* Extended full-width User Tracking table (replaces Inventory Health) */}
      <section className="panel full">
        <div className="section-header">
          <h2>User Activity Tracking</h2>
        </div>
        <div className="tracking-table-wrap">
          <table className="tracking-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Last Activity</th>
                <th>Orders</th>
                <th>Wishlist</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>John Doe</td>
                <td>john@example.com</td>
                <td>Viewed “The Hobbit”</td>
                <td>5</td>
                <td>3</td>
                <td><span className="badge in-transit">Active</span></td>
              </tr>
              <tr>
                <td>Jane Smith</td>
                <td>jane@example.com</td>
                <td>Purchased “Atomic Habits”</td>
                <td>12</td>
                <td>6</td>
                <td><span className="badge delivered">Active</span></td>
              </tr>
              <tr>
                <td>Bob Johnson</td>
                <td>bob@example.com</td>
                <td>Added “Clean Code” to cart</td>
                <td>3</td>
                <td>2</td>
                <td><span className="badge checking">Idle</span></td>
              </tr>
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
    <Button variant="primary" onClick={() => navigate('/admin/books/new')}>Add new book</Button>
  );
};

export default Dashboard;