import React, { useMemo, useState, useEffect } from 'react';
import { Button, Input } from '../../components';
import { useNavigate } from 'react-router-dom';
import { Squares2X2Icon, ListBulletIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { getStationery, deleteStationery, updateStationery, getCategories, getBookCoverUrl } from '../../service/api';
import { formatPrice } from '../../utils/currency';

const priceRanges = [
  { label: 'Tất Cả Giá', min: 0, max: 250000000 },
  { label: '0 đ – 625.000 đ', min: 0, max: 625000 },
  { label: '625.000 đ – 1.250.000 đ', min: 625000, max: 1250000 },
  { label: '1.250.000 đ – 2.500.000 đ', min: 1250000, max: 2500000 },
  { label: '2.500.000 đ+', min: 2500000, max: 250000000 },
];

const positionOptions = [
  { label: 'None', value: 'none' },
  { label: 'Best Seller', value: 'is_best_seller' },
  { label: 'New Release', value: 'is_new' },
  { label: 'Slide 1', value: 'is_slide1' },
  { label: 'Slide 2', value: 'is_slide2' },
  { label: 'Slide 3', value: 'is_slide3' },
];

const StationeryProducts = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tất Cả Danh Mục');
  const [range, setRange] = useState(priceRanges[0]);
  const [status, setStatus] = useState('Tất Cả Trạng Thái');
  const [view, setView] = useState('list');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);

  // API data states
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleResetFilters = () => {
    setQuery('');
    setCategory('Tất Cả Danh Mục');
    setRange(priceRanges[0]);
    setStatus('Tất Cả Trạng Thái');
    setCurrentPage(1);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [itemsRes, catsRes] = await Promise.all([
          // Backend enforces limit <= 100
          getStationery({ limit: 100, skip: 0 }),
          getCategories()
        ]);
        const itemsData = Array.isArray(itemsRes) ? itemsRes : (itemsRes?.data || []);
        const catsData = Array.isArray(catsRes) ? catsRes : (catsRes?.data || []);
        setItems(itemsData);
        const itemCatNames = new Set(
          (itemsData || []).flatMap(it => (it.categories || []).map(c => String(c.name).trim().toLowerCase()))
        );
        let filteredCats = catsData.filter(cat => itemCatNames.has(String(cat.name).trim().toLowerCase()));
        const yogaCat = catsData.find(c => String(c.name).trim().toLowerCase() === 'yoga');
        if (yogaCat && !filteredCats.some(c => c.category_id === yogaCat.category_id)) {
          filteredCats = [...filteredCats, yogaCat];
        }
        setCategories(filteredCats);
      } catch (err) {
        console.error('Failed to load stationery:', err);
        setError('Failed to load stationery items.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const result = items.filter(it => {
      const title = (it.title || '').toLowerCase();
      const desc = (it.brief_description || it.full_description || '').toLowerCase();
      const matchQuery = query.trim() === '' || title.includes(query.toLowerCase()) || desc.includes(query.toLowerCase());

      const categoryNames = it.categories?.map(cat => cat.name) || [];
      const matchCategory = category === 'Tất Cả Danh Mục' || categoryNames.some(catName => catName === category);

      const priceVal = typeof it.price === 'string' ? parseFloat(it.price) : (it.discounted_price ?? it.price ?? 0);
      const matchPrice = priceVal >= range.min && priceVal <= range.max;

      // For consistency with BooksProducts, treat all as "Active"
      const matchStatus = status === 'Tất Cả Trạng Thái' || status === 'Hoạt động';

      return matchQuery && matchCategory && matchPrice && matchStatus;
    }).sort((a, b) => {
      if (view === 'grid') return 0; // Keep natural order in grid
      const priceA = typeof a.price === 'string' ? parseFloat(a.price) : (a.discounted_price ?? a.price ?? 0);
      const priceB = typeof b.price === 'string' ? parseFloat(b.price) : (b.discounted_price ?? b.price ?? 0);
      // Default sort mirrors BooksProducts; can add sort state if desired
      return priceA - priceB;
    });
    return result;
  }, [items, query, category, status, range, view]);

  // Pagination logic
  const itemsPerPage = view === 'grid' ? 6 : 5;
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filtered.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, category, status, range, view]);

  const progressColor = (ratio) => {
    if (ratio > 0.8) return 'green';
    if (ratio > 0.6) return 'yellow';
    return 'orange';
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteStationery(id);
      setItems(prev => prev.filter(i => i.stationery_id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete item: ' + (err?.message || 'Unknown error'));
    }
  };

  const handlePositionChange = async (stationeryId, positionType) => {
    try {
      const updateData = {
        is_best_seller: false,
        is_new: false,
        is_slide1: false,
        is_slide2: false,
        is_slide3: false,
      };
      if (positionType !== 'none') {
        updateData[positionType] = true;
      }
      await updateStationery(stationeryId, updateData);
      setItems(prevItems => prevItems.map(it => (
        it.stationery_id === stationeryId ? { ...it, ...updateData } : it
      )));
    } catch (error) {
      console.error('Error updating stationery position:', error);
      alert(`Failed to update stationery position: ${error.message}`);
    }
  };

  const getCurrentPosition = (item) => {
    if (item.is_best_seller) return 'is_best_seller';
    if (item.is_new) return 'is_new';
    if (item.is_slide1) return 'is_slide1';
    if (item.is_slide2) return 'is_slide2';
    if (item.is_slide3) return 'is_slide3';
    return 'none';
  };

  if (loading) {
    return (
      <div className="books-products">
        <div className="loading-state" style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="books-products">
        <div className="error-state" style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
          <p>{error}</p>
          <Button onClick={() => window.location.reload()}>Thử lại</Button>
        </div>
      </div>
    );
  }

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
          <Input className="search" placeholder="Tìm kiếm..." value={query} onChange={(e)=>setQuery(e.target.value)} />
          <div className="select-row">
            <span>Hiển Thị:</span>
            <select value={'Tất Cả Sản Phẩm'} onChange={()=>{}}>
              <option>Tất Cả Sản Phẩm</option>
            </select>
          </div>
          <div className="select-row">
            <span>Sắp Xếp Theo:</span>
            <select value={'Mặc Định'} onChange={()=>{}}>
              <option>Mặc Định</option>
              <option>Giá: Từ Thấp Đến Cao</option>
              <option>Giá: Từ Cao Đến Thấp</option>
            </select>
          </div>
        </div>
        <div className="right">
          
          <Button variant="primary" onClick={()=>navigate('/admin/stationery/new')}>Thêm Văn Phòng Phẩm</Button>
          <Button variant="primary" onClick={()=>navigate('/admin/yoga/new')}>Thêm Yoga</Button>
        </div>
      </div>

      {/* Filters strip */}
      <div className="filters">
        <div className="filter">
          <label>Danh Mục</label>
          <select value={category} onChange={(e)=>setCategory(e.target.value)}>
            <option>Tất Cả Danh Mục</option>
            {categories.map(cat => (
              <option key={cat.category_id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div className="filter">
          <label>Giá</label>
          <select value={range.label} onChange={(e)=>{
            const next = priceRanges.find(r=>r.label===e.target.value) || priceRanges[0];
            setRange(next);
          }}>
            {priceRanges.map(r=> <option key={r.label}>{r.label}</option>)}
          </select>
        </div>
        <div className="filter">
          <label>Trạng Thái</label>
          <select value={status} onChange={(e)=>setStatus(e.target.value)}>
            <option>Tất Cả Trạng Thái</option>
            <option>Hoạt động</option>
          </select>
        </div>
        <div>
          <Button variant="outline" onClick={handleResetFilters}>Reset Bộ Lọc</Button>
        </div>
      </div>

      {/* No items found message */}
      {filtered.length === 0 && !loading && (
        <div className="no-books-message" style={{ 
          textAlign: 'center', 
          padding: '3rem', 
          color: '#666',
          fontSize: '1.1rem'
        }}>
          <p>Không tìm thấy sản phẩm nào phù hợp với tiêu chí tìm kiếm.</p>
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Thử thay đổi tiêu chí tìm kiếm hoặc phạm vi giá.
          </p>
        </div>
      )}

      {filtered.length > 0 && view === 'list' ? (
        <div className="list">
          <div className="list-header">
            <div className="col col-checkbox"></div>
            <div className="col col-product">Thông Tin Sản Phẩm</div>
            <div className="col col-price">Giá</div>
            <div className="col col-metric">Trạng Thái</div>
            <div className="col col-status">Trạng Thái Hoạt Động</div>
            <div className="col col-actions">Hành Động</div>
          </div>
          {paginatedItems.map(it => {
            const currentStock = it.stock_quantity || 0;
            const maxStock = 100; // Assume max stock for progress calculation
            const ratio = Math.min(currentStock / maxStock, 1);
            const imageUrl = it.image_url ? getBookCoverUrl(it.image_url) : '/assets/placeholder-book.jpg';

            return (
              <div key={it.stationery_id} className="list-row">
                <div className="col col-checkbox"><input type="checkbox" /></div>
                <div className="col col-product">
                  <img src={imageUrl} alt={it.title} className="thumb" width={400}/>
                  <div className="info">
                    <div className="title" title={it.title} style={{ fontSize: '16px' }}>{it.title}</div>
                    <div className="sub" style={{ fontSize: '14px' }}>SKU: {it.sku || '—'}</div>
                    <div className="sub" style={{ fontSize: '14px' }}>Danh mục: {it.categories?.map(c => c.name).join(', ') || '—'}</div>
                  </div>
                </div>
                <div className="col col-price">
                  {it.discounted_price != null ? (
                    <span>
                      <span>{formatPrice(it.discounted_price)}</span>
                      <span style={{ marginLeft: '8px' }} className="line-through text-gray-500">{formatPrice(it.price)}</span>
                    </span>
                  ) : (
                    formatPrice(it.price ?? 0)
                  )}
                </div>
                <div className="col col-metric">
                  <div className={`progress ${progressColor(ratio)}`}
                       aria-label={`Stock: ${currentStock}`}>
                    <div className="bar" style={{width: `${Math.min(100, Math.round(ratio*100))}%`}}></div>
                  </div>
                  <div className="metric-text">Số Lượng Hiện Tại: {currentStock}</div>
                </div>
                <div className="col col-status" style={{ display: 'flex', justifyContent: 'center' }}>
                  <label className="switch">
                    <input type="checkbox" defaultChecked={true} />
                    <span className="slider" />
                  </label>
                </div>
                <div className="col col-actions">
                  <button className="edit-btn" onClick={() => navigate(`/admin/stationery/${it.stationery_id}/edit`)}>
                    <PencilSquareIcon className="h-4 w-4"/> Edit
                  </button>
                  <button className="delete-btn" onClick={() => handleDelete(it.stationery_id, it.title)}>
                    <TrashIcon className="h-4 w-4"/> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : filtered.length > 0 ? (
        <div className="cards-grid">
          {paginatedItems.map(it => {
            const currentStock = it.stock_quantity || 0;
            const maxStock = 100;
            const ratio = Math.min(currentStock / maxStock, 1);
            const imageUrl = it.image_url ? getBookCoverUrl(it.image_url) : '/assets/placeholder-book.jpg';

            return (
              <div key={it.stationery_id} className="card">
                <div className="card-head">
                  <img src={imageUrl} alt={it.title} className="cover" />
                  <div className="meta">
                    <div className="title p-1" title={it.title}>{it.title}</div>
                    <div className="sub p-1">SKU: {it.sku || '—'}</div>
                    <div className="sub p-1">Danh mục: {it.categories?.map(c => c.name).join(', ') || '—'}</div>
                  </div>
                  <label className="switch small">
                    <input type="checkbox" defaultChecked={true} />
                    <span className="slider" />
                  </label>
                </div>
                <div className="card-row">
                  <span className="label">Giá</span>
                  <span className="value">
                    {it.discounted_price != null ? (
                      <span>
                        <span>{formatPrice(it.discounted_price)}</span>
                        <span style={{ marginLeft: '8px' }} className="line-through text-gray-500">{formatPrice(it.price)}</span>
                      </span>
                    ) : (
                      formatPrice(it.price ?? 0)
                    )}
                  </span>
                </div>
                <div className="card-row">
                  <span className="label">Stock:</span>
                  <div className={`progress ${progressColor(ratio)}`}>
                    <div className="bar" style={{width: `${Math.min(100, Math.round(ratio*100))}%`}}></div>
                  </div>
                  <span className="metric-text">{currentStock}</span>
                </div>
                <div className="card-row">
                  <div className="position-dropdown">
                    <label className="text-sm font-medium text-gray-500">Vị Trí:</label>
                    <select 
                      value={getCurrentPosition(it)} 
                      onChange={(e) => handlePositionChange(it.stationery_id, e.target.value)}
                      className="position-select"
                    >
                      {positionOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="card-row">
                  <button className="edit-btn" onClick={() => navigate(`/admin/stationery/${it.stationery_id}/edit`)}>
                    <PencilSquareIcon className="h-4 w-4"/> Edit
                  </button>
                  <button className="delete-btn" onClick={() => handleDelete(it.stationery_id, it.title)}>
                    <TrashIcon className="h-4 w-4"/> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Pagination Controls */}
      {filtered.length > 0 && totalPages > 1 && (
        <div className="pagination-container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '2rem',
          padding: '1rem 0',
          borderTop: '1px solid #e5e7eb'
        }}>
          {/* Results info */}
          <div className="pagination-info" style={{
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            Showing {startIndex + 1}-{Math.min(endIndex, filtered.length)} of {filtered.length} stationery
          </div>

          {/* Pagination controls */}
          <div className="pagination-controls" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {/* Previous button */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                backgroundColor: currentPage === 1 ? '#f9fafb' : '#ffffff',
                color: currentPage === 1 ? '#9ca3af' : '#374151',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Previous
            </button>

            {/* Page numbers */}
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                const showPage = pageNum === 1 || 
                                pageNum === totalPages || 
                                Math.abs(pageNum - currentPage) <= 1;
                if (!showPage && pageNum === 2 && currentPage > 4) {
                  return <span key="ellipsis1" style={{ padding: '0.5rem', color: '#9ca3af' }}>...</span>;
                }
                if (!showPage && pageNum === totalPages - 1 && currentPage < totalPages - 3) {
                  return <span key="ellipsis2" style={{ padding: '0.5rem', color: '#9ca3af' }}>...</span>;
                }
                if (!showPage) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      backgroundColor: currentPage === pageNum ? '#3b82f6' : '#ffffff',
                      color: currentPage === pageNum ? '#ffffff' : '#374151',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Next button */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                backgroundColor: currentPage === totalPages ? '#f9fafb' : '#ffffff',
                color: currentPage === totalPages ? '#9ca3af' : '#374151',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StationeryProducts;
