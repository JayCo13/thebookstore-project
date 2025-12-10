import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components';
import { getAllReviews, deleteReview } from '../../service';

const ManageReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getAllReviews({ limit: 200 });
        const list = Array.isArray(res) ? res : (res?.data || []);
        setReviews(list);
      } catch (e) {
        console.error('Failed to load reviews', e);
        setError('Không thể tải danh sách đánh giá.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Xóa đánh giá này?')) return;
    try {
      await deleteReview(reviewId);
      setReviews(prev => prev.filter(r => r.review_id !== reviewId));
    } catch (e) {
      alert('Xóa đánh giá thất bại');
    }
  };

  const filtered = reviews.filter(r => {
    const text = `${r.book_title || ''} ${r.user_name || ''} ${r.comment || ''}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  const formatDate = (d) => {
    try {
      const dt = new Date(d);
      return dt.toLocaleString();
    } catch { return String(d); }
  };

  return (
    <div className="content">
      <div className="grid-3">
        <section className="panel" style={{ gridColumn: '1 / -1' }}>
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Quản lý đánh giá</h2>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                placeholder="Tìm theo sách, người dùng, nội dung..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ padding: '8px 10px', border: '1px solid #eef0f2', borderRadius: 8, minWidth: 280 }}
              />
              <Button variant="outline" onClick={() => navigate('/admin/dashboard')}>Trở về trang chủ</Button>
            </div>
          </div>
          {error && (
            <div style={{ color: '#dc2626', marginBottom: 10 }}>{error}</div>
          )}
          <div className="tracking-table-wrap">
            <table className="tracking-table">
              <thead>
                <tr>
                  <th>Sách</th>
                  <th>Người dùng</th>
                  <th>Rating</th>
                  <th>Nội dung</th>
                  <th>Thời gian</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center' }}>Đang tải...</td></tr>
                ) : filtered.length ? (
                  filtered.map((r) => (
                    <tr key={r.review_id}>
                      <td>{r.book_title || `#${r.book_id}`}</td>
                      <td>{r.user_name || (r.user?.name) || r.user_id}</td>
                      <td>{'★'.repeat(Number(r.rating || 0)).padEnd(5, '☆')}</td>
                      <td style={{ maxWidth: 460 }}>
                        {r.comment || '—'}
                      </td>
                      <td>{formatDate(r.created_at)}</td>
                      <td>
                        <Button size="small" variant="danger" onClick={() => handleDelete(r.review_id)}>Xóa</Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: '#6b7280' }}>Không có đánh giá</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ManageReviews;