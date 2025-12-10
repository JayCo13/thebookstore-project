import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Modal } from '../../components';
import './ManageUsers.css';
import { getAllUsers, getAllOrdersAdmin, updateUserStatus } from '../../service';
import { formatPrice } from '../../utils/currency';

const ManageCustomers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // All | Active | Banned
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [modalTab, setModalTab] = useState('info');
  const [updatingUserId, setUpdatingUserId] = useState(null);

  // Ban confirmation dialog
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  const [userToBan, setUserToBan] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Fetch real users from backend
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch registered users
        const usersRes = await getAllUsers({ limit: 1000 });
        const usersList = Array.isArray(usersRes) ? usersRes : (usersRes?.data || []);

        // Fetch orders for order count
        const ordersRes = await getAllOrdersAdmin({ params: { skip: 0, limit: 1000 } });
        const ordersList = Array.isArray(ordersRes) ? ordersRes : (ordersRes?.data || []);

        // Count orders per user
        const orderCountByUser = {};
        ordersList.forEach(order => {
          if (order.user_id) {
            orderCountByUser[order.user_id] = (orderCountByUser[order.user_id] || 0) + 1;
          }
        });

        // Enhance users with order count
        const enhancedUsers = usersList.map(u => ({
          ...u,
          orders_count: orderCountByUser[u.user_id] || 0
        }));

        if (mounted) {
          setUsers(enhancedUsers);
          setOrders(ordersList);
        }
      } catch (err) {
        console.error('Failed to load users:', err);
        if (mounted) setError('Không thể tải danh sách khách hàng. Vui lòng thử lại.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, []);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return users.filter(u => {
      const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim().toLowerCase();
      const matchesTerm = !q ||
        fullName.includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone_number || '').toLowerCase().includes(q);
      const isActive = u.is_active === 1 || u.is_active === true;
      const matchesStatus = statusFilter === 'All' ||
        (statusFilter === 'Active' ? isActive : !isActive);
      return matchesTerm && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  // Stats
  const activeCount = useMemo(() => users.filter(u => u.is_active === 1 || u.is_active === true).length, [users]);
  const bannedCount = useMemo(() => users.length - activeCount, [users, activeCount]);
  const totalOrders = useMemo(() => orders.filter(o => o.user_id).length, [orders]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const pageStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageEnd = pageStart + ITEMS_PER_PAGE;
  const pageUsers = filteredUsers.slice(pageStart, pageEnd);

  // Smart pagination with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  const handleBanToggle = (user) => {
    setUserToBan(user);
    setShowBanConfirm(true);
  };

  const confirmBanToggle = async () => {
    if (!userToBan) return;

    const userId = userToBan.user_id || userToBan.id;
    const isCurrentlyActive = userToBan.is_active === 1 || userToBan.is_active === true;
    const newStatus = isCurrentlyActive ? 0 : 1;
    const action = isCurrentlyActive ? 'cấm' : 'kích hoạt';

    try {
      setUpdatingUserId(userId);
      setShowBanConfirm(false);
      await updateUserStatus(userId, newStatus);
      // Update local state
      setUsers(prev => prev.map(u =>
        (u.user_id || u.id) === userId ? { ...u, is_active: newStatus } : u
      ));
    } catch (err) {
      console.error('Failed to update user status:', err);
      setError(`Không thể ${action} người dùng. Vui lòng thử lại.`);
    } finally {
      setUpdatingUserId(null);
      setUserToBan(null);
    }
  };

  const handleViewDetails = (user) => {
    setSelectedUser(user);
    setModalTab('info');
    setShowDetailsModal(true);
  };

  const selectedUserOrders = useMemo(() => {
    if (!selectedUser) return [];
    const userId = selectedUser.user_id || selectedUser.id;
    return orders.filter(o => o.user_id === userId);
  }, [orders, selectedUser]);

  const getStatusBadge = (user) => {
    const isActive = user.is_active === 1 || user.is_active === true;
    return (
      <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
        {isActive ? 'Hoạt động' : 'Bị cấm'}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const roleClass = role === 'admin' ? 'admin' : 'customer';
    const roleText = role === 'admin' ? 'Quản trị' : 'Khách hàng';
    return <span className={`role-badge ${roleClass}`}>{roleText}</span>;
  };

  if (loading) {
    return (
      <div className="manage-users-loading">
        <div className="loading-spinner"></div>
        <p>Đang tải danh sách khách hàng...</p>
      </div>
    );
  }

  return (
    <div className="manage-users">
      <div className="page-header">
        <h1>Quản Lý Khách Hàng</h1>
        <div className="header-stats">
          <div className="stat-card mini">
            <span className="stat-value">{users.length}</span>
            <span className="stat-label">Tổng số</span>
          </div>
          <div className="stat-card mini active">
            <span className="stat-value">{activeCount}</span>
            <span className="stat-label">Hoạt động</span>
          </div>
          <div className="stat-card mini inactive">
            <span className="stat-value">{bannedCount}</span>
            <span className="stat-label">Bị cấm</span>
          </div>
          <div className="stat-card mini">
            <span className="stat-value">{totalOrders}</span>
            <span className="stat-label">Đơn hàng</span>
          </div>
        </div>
      </div>

      <div className="users-controls">
        <div className="search-section">
          <Input
            placeholder="Tìm theo tên, email hoặc số điện thoại..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="search-input"
          />
        </div>
        <div className="filter-section">
          <div className="filter-item">
            <label>Trạng thái</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="ui-select"
            >
              <option value="All">Tất cả</option>
              <option value="Active">Hoạt động</option>
              <option value="Banned">Bị cấm</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th>Email</th>
              <th>Số điện thoại</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Ngày đăng ký</th>
              <th>Đơn hàng</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {pageUsers.map((u) => {
              const userId = u.user_id || u.id;
              const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Chưa cập nhật';
              const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
              const isActive = u.is_active === 1 || u.is_active === true;

              return (
                <tr key={userId} className={!isActive ? 'banned-row' : ''}>
                  <td>
                    <div className="user-info">
                      <div className={`user-avatar ${!isActive ? 'banned' : ''}`}>
                        {initials || 'KH'}
                      </div>
                      <span className="user-name">{fullName}</span>
                    </div>
                  </td>
                  <td>{u.email || '—'}</td>
                  <td>{u.phone_number || '—'}</td>
                  <td>{getRoleBadge(u.role)}</td>
                  <td>{getStatusBadge(u)}</td>
                  <td>{u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                  <td>
                    <span className="order-count">{u.orders_count || 0}</span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <Button
                        size="small"
                        variant="outline"
                        onClick={() => handleViewDetails(u)}
                      >
                        Chi tiết
                      </Button>
                      {u.role !== 'admin' && (
                        <Button
                          size="small"
                          variant={isActive ? 'danger' : 'primary'}
                          onClick={() => handleBanToggle(u)}
                          disabled={updatingUserId === userId}
                        >
                          {updatingUserId === userId ? '...' : (isActive ? 'Cấm' : 'Bỏ cấm')}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="no-users">
            <p>Không tìm thấy khách hàng phù hợp với tiêu chí tìm kiếm.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              ‹
            </button>
            {getPageNumbers().map((p, idx) =>
              p === '...' ? (
                <span key={`ellipsis-${idx}`} className="page-ellipsis">...</span>
              ) : (
                <button
                  key={p}
                  className={`page-btn ${currentPage === p ? 'active' : ''}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              )
            )}
            <button
              className="page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              ›
            </button>
            <span className="page-info">
              {pageStart + 1}-{Math.min(pageEnd, filteredUsers.length)} / {filteredUsers.length}
            </span>
          </div>
        )}
      </div>

      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Thông Tin Khách Hàng"
        size="large"
      >
        {selectedUser ? (
          <div className="modal-content">
            <div className="modal-tabs">
              <Button
                size="large"
                variant={modalTab === 'info' ? 'primary' : 'outline'}
                onClick={() => setModalTab('info')}
              >
                Thông tin
              </Button>
              <Button
                size="large"
                variant={modalTab === 'orders' ? 'primary' : 'outline'}
                onClick={() => setModalTab('orders')}
              >
                Đơn hàng ({selectedUserOrders.length})
              </Button>
            </div>

            {modalTab === 'info' ? (
              <div className="user-details">
                <div className="user-detail-header">
                  <div className={`user-avatar large ${!(selectedUser.is_active === 1 || selectedUser.is_active === true) ? 'banned' : ''}`}>
                    {`${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'KH'}
                  </div>
                  <div className="user-detail-info">
                    <h3>{`${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || 'Chưa cập nhật'}</h3>
                    <p>{selectedUser.email || '—'}</p>
                    {getRoleBadge(selectedUser.role)}
                    {getStatusBadge(selectedUser)}
                  </div>
                </div>
                <div className="user-detail-stats">
                  <div className="detail-stat">
                    <label>ID:</label>
                    <span>#{selectedUser.user_id || selectedUser.id}</span>
                  </div>
                  <div className="detail-stat">
                    <label>Số điện thoại:</label>
                    <span>{selectedUser.phone_number || '—'}</span>
                  </div>
                  <div className="detail-stat">
                    <label>Ngày đăng ký:</label>
                    <span>{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString('vi-VN') : '—'}</span>
                  </div>
                  <div className="detail-stat">
                    <label>Email xác thực:</label>
                    <span>{selectedUser.email_verified ? 'Đã xác thực' : 'Chưa xác thực'}</span>
                  </div>
                  <div className="detail-stat">
                    <label>Tổng đơn hàng:</label>
                    <span>{selectedUser.orders_count || selectedUserOrders.length}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="orders-list-modal">
                {selectedUserOrders.length === 0 ? (
                  <div className="no-orders">Không có đơn hàng nào.</div>
                ) : (
                  <table className="users-table compact">
                    <thead>
                      <tr>
                        <th>Mã ĐH</th>
                        <th>Ngày đặt</th>
                        <th>Trạng thái</th>
                        <th>Tổng tiền</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUserOrders.map(o => (
                        <tr key={o.order_id}>
                          <td>#{o.order_id}</td>
                          <td>{new Date(o.order_date).toLocaleDateString('vi-VN')}</td>
                          <td>
                            <span className={`status-badge ${o.status === 'delivered' ? 'active' : 'pending'}`}>
                              {o.status}
                            </span>
                          </td>
                          <td>{formatPrice(o.total_amount)}</td>
                          <td>
                            <Button
                              size="small"
                              variant="outline"
                              onClick={() => navigate(`/admin/orders/${o.order_id}`)}
                            >
                              Xem
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="loading-modal">Đang tải thông tin...</div>
        )}
      </Modal>

      {/* Ban/Unban Confirmation Dialog */}
      <Modal
        isOpen={showBanConfirm}
        onClose={() => { setShowBanConfirm(false); setUserToBan(null); }}
        title={userToBan?.is_active === 1 || userToBan?.is_active === true ? "Xác nhận cấm tài khoản" : "Xác nhận bỏ cấm tài khoản"}
        size="small"
      >
        {userToBan && (
          <div className="ban-confirm-content">
            <div className="ban-confirm-icon">
              {(userToBan.is_active === 1 || userToBan.is_active === true) ? (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              ) : (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )}
            </div>
            <p className="ban-confirm-message">
              {(userToBan.is_active === 1 || userToBan.is_active === true) ? (
                <>
                  Bạn có chắc muốn <strong>cấm</strong> tài khoản của{' '}
                  <strong>{userToBan.first_name} {userToBan.last_name}</strong>?
                  <br /><br />
                  <span className="ban-warning">Người dùng này sẽ không thể đăng nhập cho đến khi được bỏ cấm.</span>
                </>
              ) : (
                <>
                  Bạn có chắc muốn <strong>bỏ cấm</strong> tài khoản của{' '}
                  <strong>{userToBan.first_name} {userToBan.last_name}</strong>?
                  <br /><br />
                  <span className="ban-success">Người dùng này sẽ có thể đăng nhập lại bình thường.</span>
                </>
              )}
            </p>
            <div className="ban-confirm-actions">
              <Button
                variant="outline"
                onClick={() => { setShowBanConfirm(false); setUserToBan(null); }}
              >
                Hủy
              </Button>
              <Button
                variant={(userToBan.is_active === 1 || userToBan.is_active === true) ? "danger" : "primary"}
                onClick={confirmBanToggle}
              >
                {(userToBan.is_active === 1 || userToBan.is_active === true) ? "Cấm tài khoản" : "Bỏ cấm"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ManageCustomers;