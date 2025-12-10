import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BellAlertIcon } from '@heroicons/react/24/outline';
import './AdminLayout.css';

const AdminLayout = ({ children }) => {
  const content = children || <Outlet />;
  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <NavLink to="/admin">
          <div className="brand">
            <img src="/assets/logo.png" alt="Bookstore Logo" />
            <span>Trang Quản Trị</span>
          </div>
        </NavLink>
        <nav className="top-nav">
          <NavLink to="/admin" end className={({ isActive }) => isActive ? 'active' : ''}>Tổng Quan</NavLink>
          <NavLink to="/admin/products" className={({ isActive }) => isActive ? 'active' : ''}>Kho Sách</NavLink>
          <NavLink to="/admin/stationery" className={({ isActive }) => isActive ? 'active' : ''}>Văn Phòng Phẩm & Yoga</NavLink>
          <NavLink to="/admin/orders" className={({ isActive }) => isActive ? 'active' : ''}>Đơn Hàng</NavLink>
          <NavLink to="/admin/customers" className={({ isActive }) => isActive ? 'active' : ''}>Khách Hàng</NavLink>
          <NavLink to="/admin/reviews" className={({ isActive }) => isActive ? 'active' : ''}>Đánh Giá</NavLink>
          <NavLink to="/admin/hero-slides" className={({ isActive }) => isActive ? 'active' : ''}>Slider Trang Chủ</NavLink>
        </nav>
        <div className="actions">
          <div className='p-2' title="Search">
            <BellAlertIcon className="w-6 h-6 text-gray-500" />
          </div>
          <div className="profile">
            <div className="avatar">
              <img src="/assets/ceo.jpg" alt="Phương Trịnh" className='w-full h-full rounded-full' />
            </div>
            <div className="meta">
              <span className="role">Phương Trịnh</span>
            </div>
          </div>
        </div>
      </header>

      <main className="admin-main">
        {content}
      </main>
    </div>
  );
};

export default AdminLayout;