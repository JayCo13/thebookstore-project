import React, { useMemo, useState, useEffect } from 'react';
import { Button, Input } from '../../components';
import { useNavigate } from 'react-router-dom';
import { Squares2X2Icon, ListBulletIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { getBooks, getCategories, getAuthors, deleteBook, updateBook } from '../../service';
import { formatPrice } from '../../utils/currency';
import './BooksProducts.css';

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

const BooksProducts = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All Collection');
  const [range, setRange] = useState(priceRanges[0]);
  const [status, setStatus] = useState('All Status');
  const [store, setStore] = useState('All Collection');
  const [sort, setSort] = useState('Default');
  const [view, setView] = useState('list');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  
  // API data states
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reset filters handler
  const handleResetFilters = () => {
    setQuery('');
    setCategory('All Collection');
    setRange(priceRanges[0]);
    setStatus('All Status');
    setSort('Default');
    setCurrentPage(1);
  };

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch books
      const booksResponse = await getBooks();
      const categoriesResponse = await getCategories();
      const authorsResponse = await getAuthors();
        
        // Handle both direct response and response.data structure
        const booksData = Array.isArray(booksResponse) ? booksResponse : (booksResponse?.data || []);
        const categoriesData = Array.isArray(categoriesResponse) ? categoriesResponse : (categoriesResponse?.data || []);
        const authorsData = Array.isArray(authorsResponse) ? authorsResponse : (authorsResponse?.data || []);
        
        setBooks(booksData);
        setCategories(categoriesData);
        setAuthors(authorsData);
      } catch (err) {
        console.error('Detailed error information:', {
          error: err,
          message: err.message,
          stack: err.stack,
          name: err.name,
          status: err.status
        });
        setError(`Failed to load data: ${err.message}`);
      } finally {
        setLoading(false);
        console.log('Loading completed');
      }
    };

    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const result = books.filter(b => {
      // Extract author names from the authors array
      const authorNames = b.authors?.map(author => author.name).join(', ') || '';
      
      // Extract category names from the categories array
      const categoryNames = b.categories?.map(cat => cat.name) || [];
      
      const matchQuery = query.trim() === '' || 
        b.title.toLowerCase().includes(query.toLowerCase()) || 
        b.isbn?.toLowerCase().includes(query.toLowerCase()) ||
        authorNames.toLowerCase().includes(query.toLowerCase());
      
      const matchCategory = category === 'All Collection' || 
        categoryNames.some(catName => catName === category);
      
      // Convert price to number for comparison (handle string prices)
      const bookPrice = typeof b.price === 'string' ? parseFloat(b.price) : b.price;
      const matchPrice = bookPrice >= range.min && bookPrice <= range.max;
      
      // For now, we'll consider all books as "Active" since the API doesn't have status field
      const matchStatus = status === 'All Status' || status === 'Active';
      
      return matchQuery && matchCategory && matchPrice && matchStatus;
    }).sort((a, b) => {
      if (sort === 'Mặc Định') return 0;
      const priceA = typeof a.price === 'string' ? parseFloat(a.price) : a.price;
      const priceB = typeof b.price === 'string' ? parseFloat(b.price) : b.price;
      if (sort === 'Giá: Thấp Đến Cao') return priceA - priceB;
      if (sort === 'Giá: Cao Đến Thấp') return priceB - priceA;
      return 0;
    });
    return result;
  }, [books, query, category, status, range, sort]);

  // Pagination logic
  const itemsPerPage = view === 'grid' ? 6 : 5;
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBooks = filtered.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, category, status, range, sort, view]);


  const progressColor = (ratio) => {
    if (ratio > 0.8) return 'green';
    if (ratio > 0.6) return 'yellow';
    return 'orange';
  };

  const handleDeleteBook = async (bookId, bookTitle) => {
    if (window.confirm(`Are you sure you want to delete "${bookTitle}"? This action cannot be undone.`)) {
      try {
        await deleteBook(bookId);
        // Refresh the books list by removing the deleted book from state
        setBooks(prevBooks => prevBooks.filter(book => book.book_id !== bookId));
        // Book deleted successfully
      } catch (error) {
        console.error('Error deleting book:', error);
        alert(`Failed to delete book: ${error.message}`);
      }
    }
  };

  const handlePositionChange = async (bookId, positionType) => {
    try {
      // Create update object - reset all position fields first (except is_discount which is auto-calculated)
      const updateData = {
        is_best_seller: false,
        is_new: false,
        is_slide1: false,
        is_slide2: false,
        is_slide3: false,
      };

      // Set the selected position to true (if not 'none')
      if (positionType !== 'none') {
        updateData[positionType] = true;
      }

      await updateBook(bookId, updateData);
      
      // Update the local state to reflect the change
      setBooks(prevBooks => 
        prevBooks.map(book => 
          book.book_id === bookId 
            ? { ...book, ...updateData }
            : book
        )
      );
      
      // Book position updated successfully
    } catch (error) {
      console.error('Error updating book position:', error);
      alert(`Failed to update book position: ${error.message}`);
    }
  };

  const getCurrentPosition = (book) => {
    if (book.is_best_seller) return 'is_best_seller';
    if (book.is_new) return 'is_new';
    if (book.is_slide1) return 'is_slide1';
    if (book.is_slide2) return 'is_slide2';
    if (book.is_slide3) return 'is_slide3';
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
            <select value={'All Products'} onChange={()=>{}}>
              <option>Tất Cả Sản Phẩm</option>
            </select>
          </div>
          <div className="select-row">
            <span>Sắp Xếp Theo:</span>
            <select value={sort} onChange={(e)=>setSort(e.target.value)}>
              <option>Mặc Định</option>
              <option>Giá: Từ Thấp Đến Cao</option>
              <option>Giá: Từ Cao Đến Thấp</option>
            </select>
          </div>
        </div>
        <div className="right">
          <Button variant="outline" onClick={handleResetFilters}>Reset Bộ Lọc</Button>
          <Button variant="primary" onClick={()=>navigate('/admin/books/new')}>Thêm Sản Phẩm Mới</Button>
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
            <option>Không Hoạt Động</option>
          </select>
        </div>
      </div>

      {/* No books found message */}
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
          {paginatedBooks.map(b => {
            // Use stock as a metric (current stock / initial stock assumption)
            const currentStock = b.stock_quantity || 0;
            const maxStock = 100; // Assume max stock for progress calculation
            const ratio = Math.min(currentStock / maxStock, 1);
            const imageUrl = b.image_url ? `http://localhost:8000${b.image_url}` : '/assets/placeholder-book.jpg';
            
            return (
              <div key={b.book_id} className="list-row">
                <div className="col col-checkbox"><input type="checkbox" /></div>
                <div className="col col-product">
                  <img src={imageUrl} alt={b.title} className="thumb" width={500}/>
                  <div className="info">
                    <div className="title" title={b.title} style={{ fontSize: '16px' }}>{b.title}</div>
                    <div className="sub" style={{ fontSize: '14px' }}>ISBN: {b.isbn}</div>
                    <div className="sub" style={{ fontSize: '14px' }}>Author: {b.authors?.map(author => author.name).join(', ') || 'No author'}</div>
                  </div>
                </div>
                <div className="col col-price">
                  {b.discounted_price != null ? (
                    <span>
                      <span>{formatPrice(b.discounted_price)}</span>
                      <span style={{ marginLeft: '8px' }} className="line-through text-gray-500">{formatPrice(b.price)}</span>
                    </span>
                  ) : (
                    formatPrice(b.price)
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
                  <button className="edit-btn" onClick={() => navigate(`/admin/products/${b.book_id}/edit`)}>
                    <PencilSquareIcon className="h-4 w-4"/> Edit
                  </button>
                  <button className="delete-btn" onClick={() => handleDeleteBook(b.book_id, b.title)}>
                    <TrashIcon className="h-4 w-4"/> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : filtered.length > 0 ? (
        <div className="cards-grid">
          {paginatedBooks.map(b => {
            const currentStock = b.stock_quantity || 0;
            const maxStock = 100;
            const ratio = Math.min(currentStock / maxStock, 1);
            const imageUrl = b.image_url ? `http://localhost:8000${b.image_url}` : '/assets/placeholder-book.jpg';
            
            return (
              <div key={b.book_id} className="card">
                <div className="card-head">
                  <img src={imageUrl} alt={b.title} className="cover" />
                  <div className="meta">
                    <div className="title p-1" title={b.title}>{b.title}</div>
                    <div className="sub p-1">ISBN: {b.isbn}</div>
                    <div className="sub p-1">Author: {b.authors?.map(author => author.name).join(', ') || 'No author'}</div>
                  </div>
                  <label className="switch small">
                    <input type="checkbox" defaultChecked={true} />
                    <span className="slider" />
                  </label>
                </div>
                <div className="card-row">
                  <span className="label">Giá</span>
                  <span className="value">
                    {b.discounted_price != null ? (
                      <span>
                        <span>{formatPrice(b.discounted_price)}</span>
                        <span style={{ marginLeft: '8px' }} className="line-through text-gray-500">{formatPrice(b.price)}</span>
                      </span>
                    ) : (
                      formatPrice(b.price)
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
                      value={getCurrentPosition(b)} 
                      onChange={(e) => handlePositionChange(b.book_id, e.target.value)}
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
                  <button className="edit-btn" onClick={() => navigate(`/admin/products/${b.book_id}/edit`)}>
                    <PencilSquareIcon className="h-4 w-4"/> Edit
                  </button>
                  <button className="delete-btn" onClick={() => handleDeleteBook(b.book_id, b.title)}>
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
            Showing {startIndex + 1}-{Math.min(endIndex, filtered.length)} of {filtered.length} books
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
                // Show first page, last page, current page, and pages around current
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
                      fontSize: '0.875rem',
                      minWidth: '2.5rem'
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

export default BooksProducts;
