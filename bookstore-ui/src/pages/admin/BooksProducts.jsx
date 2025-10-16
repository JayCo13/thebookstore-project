import React, { useMemo, useState } from 'react';
import { Button, Input } from '../../components';
import { useNavigate } from 'react-router-dom';
import { Squares2X2Icon, ListBulletIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import './BooksProducts.css';

const mockBooks = [
  { id: 'BK0001', title: 'Atomic Habits', author: 'James Clear', price: 18.99, collection: 'All Collection', status: 'Active', store: 'Main', progress: { current: 900, total: 1000 }, cover: '/assets/placeholder-book.jpg' },
  { id: 'BK0002', title: 'Clean Code', author: 'Robert C. Martin', price: 24.5, collection: 'Programming', status: 'Active', store: 'Main', progress: { current: 600, total: 1000 }, cover: '/assets/placeholder-book.jpg' },
  { id: 'BK0003', title: 'Soft and Light Break', author: 'Jane Doe', price: 15.2, collection: 'Fiction', status: 'Active', store: 'Main', progress: { current: 420, total: 1000 }, cover: '/assets/placeholder-book.jpg' },
  { id: 'BK0004', title: 'Bot Chelsea With Tor Protect...', author: 'John Roe', price: 12.7, collection: 'Children', status: 'No Active', store: 'Outlet', progress: { current: 900, total: 1000 }, cover: '/assets/placeholder-book.jpg' },
  { id: 'BK0005', title: 'Shirt With Patterned Design', author: 'Mary Major', price: 22.4, collection: 'Business', status: 'Active', store: 'Main', progress: { current: 820, total: 1000 }, cover: '/assets/placeholder-book.jpg' },
];

const priceRanges = [
  { label: '$0 – $25', min: 0, max: 25 },
  { label: '$25 – $50', min: 25, max: 50 },
  { label: '$50 – $100', min: 50, max: 100 },
];

const BooksProducts = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All Collection');
  const [range, setRange] = useState(priceRanges[0]);
  const [status, setStatus] = useState('All Status');
  const [store, setStore] = useState('All Collection');
  const [sort, setSort] = useState('Default');
  const [view, setView] = useState('list');

  const filtered = useMemo(() => {
    return mockBooks.filter(b => {
      const matchQuery = query.trim() === '' || b.title.toLowerCase().includes(query.toLowerCase()) || b.id.toLowerCase().includes(query.toLowerCase());
      const matchCategory = category === 'All Collection' || b.collection === category;
      const matchStatus = status === 'All Status' || b.status === status;
      const matchStore = store === 'All Collection' || b.store === store;
      const matchPrice = b.price >= range.min && b.price <= range.max;
      return matchQuery && matchCategory && matchStatus && matchStore && matchPrice;
    }).sort((a, b) => {
      if (sort === 'Default') return 0;
      if (sort === 'Price: Low to High') return a.price - b.price;
      if (sort === 'Price: High to Low') return b.price - a.price;
      return 0;
    });
  }, [query, category, status, store, range, sort]);

  const formatPrice = (p) => `$${p.toFixed(2)}`;
  const progressColor = (ratio) => {
    if (ratio > 0.8) return 'green';
    if (ratio > 0.6) return 'yellow';
    return 'orange';
  };

  return (
    <div className="books-products">
      {/* Top controls */}
      <div className="toolbar">
        <div className="left">
          <button className={`icon-btn ${view==='grid' ? 'active' : ''} p-1`} aria-label="grid" onClick={()=>setView('grid')}>
            <Squares2X2Icon className="h-6 w-6"/>
          </button>
          <button className={`icon-btn ${view==='list' ? 'active' : ''} p-1`} aria-label="list" onClick={()=>setView('list')}>
            <ListBulletIcon className="h-6 w-6" />
          </button>
          <Input className="search" placeholder="Search…" value={query} onChange={(e)=>setQuery(e.target.value)} />
          <div className="select-row">
            <span>Show:</span>
            <select value={'All Products'} onChange={()=>{}}>
              <option>All Products</option>
            </select>
          </div>
          <div className="select-row">
            <span>Sort by:</span>
            <select value={sort} onChange={(e)=>setSort(e.target.value)}>
              <option>Default</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
            </select>
          </div>
        </div>
        <div className="right">
          <Button variant="outline">Filter</Button>
          <Button variant="primary" onClick={()=>navigate('/admin/books/new')}>Add new product</Button>
        </div>
      </div>

      {/* Filters strip */}
      <div className="filters">
        <div className="filter">
          <label>Category</label>
          <select value={category} onChange={(e)=>setCategory(e.target.value)}>
            <option>All Collection</option>
            <option>Fiction</option>
            <option>Programming</option>
            <option>Children</option>
            <option>Business</option>
          </select>
        </div>
        <div className="filter">
          <label>Price</label>
          <select value={range.label} onChange={(e)=>{
            const next = priceRanges.find(r=>r.label===e.target.value) || priceRanges[0];
            setRange(next);
          }}>
            {priceRanges.map(r=> <option key={r.label}>{r.label}</option>)}
          </select>
        </div>
        <div className="filter">
          <label>Status</label>
          <select value={status} onChange={(e)=>setStatus(e.target.value)}>
            <option>All Status</option>
            <option>Active</option>
            <option>No Active</option>
          </select>
        </div>
        <div className="filter">
          <label>Store</label>
          <select value={store} onChange={(e)=>setStore(e.target.value)}>
            <option>All Collection</option>
            <option>Main</option>
            <option>Outlet</option>
          </select>
        </div>
      </div>

      {view === 'list' ? (
        <div className="list">
          <div className="list-header">
            <div className="col col-checkbox"></div>
            <div className="col col-product">Product info</div>
            <div className="col col-price">Price</div>
            <div className="col col-metric">Metric</div>
            <div className="col col-status">Active</div>
            <div className="col col-actions">Actions</div>
          </div>
          {filtered.map(b => {
            const ratio = b.progress.current / b.progress.total;
            return (
              <div key={b.id} className="list-row">
                <div className="col col-checkbox"><input type="checkbox" /></div>
                <div className="col col-product">
                  <img src={b.cover} alt={b.title} className="thumb" />
                  <div className="info">
                    <div className="title" title={b.title}>{b.title}</div>
                    <div className="sub">ID : {b.id}</div>
                  </div>
                </div>
                <div className="col col-price">{formatPrice(b.price)}</div>
                <div className="col col-metric">
                  <div className={`progress ${progressColor(ratio)}`}
                       aria-label={`progress ${b.progress.current}/${b.progress.total}`}>
                    <div className="bar" style={{width: `${Math.min(100, Math.round(ratio*100))}%`}}></div>
                  </div>
                  <div className="metric-text">{b.progress.current}/{b.progress.total}</div>
                </div>
                <div className="col col-status">
                  <label className="switch">
                    <input type="checkbox" defaultChecked={b.status==='Active'} />
                    <span className="slider" />
                  </label>
                </div>
                <div className="col col-actions">
                  <button className="edit-btn" onClick={() => navigate(`/admin/products/${b.id}/edit`)}>
                    <PencilSquareIcon className="h-4 w-4"/> Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="cards-grid">
          {filtered.map(b => {
            const ratio = b.progress.current / b.progress.total;
            return (
              <div key={b.id} className="card">
                <div className="card-head">
                  <img src={b.cover} alt={b.title} className="cover" />
                  <div className="meta">
                    <div className="title" title={b.title}>{b.title}</div>
                    <div className="sub">ID : {b.id}</div>
                  </div>
                  <label className="switch small">
                    <input type="checkbox" defaultChecked={b.status==='Active'} />
                    <span className="slider" />
                  </label>
                </div>
                <div className="card-row">
                  <span className="label">Price</span>
                  <span className="value">{formatPrice(b.price)}</span>
                </div>
                <div className="card-row">
                  <span className="label">Metric</span>
                  <div className={`progress ${progressColor(ratio)}`}>
                    <div className="bar" style={{width: `${Math.min(100, Math.round(ratio*100))}%`}}></div>
                  </div>
                  <span className="metric-text">{b.progress.current}/{b.progress.total}</span>
                </div>
                <div className="card-row">
                  <button className="edit-btn" onClick={() => navigate(`/admin/products/${b.id}/edit`)}>
                    <PencilSquareIcon className="h-4 w-4"/> Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BooksProducts;