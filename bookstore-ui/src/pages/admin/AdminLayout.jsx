import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BellAlertIcon } from '@heroicons/react/24/outline';
import './AdminLayout.css';

const AdminLayout = ({ children }) => {
  const content = children || <Outlet />;
  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="brand">
          <img src="/assets/logo.png" alt="Bookstore Logo" />
          <span>Trang Quản Trị</span>
        </div>
        <nav className="top-nav">
          <NavLink to="/admin" end className={({isActive})=> isActive? 'active' : ''}>Overview</NavLink>
          <NavLink to="/admin/products">Products</NavLink>
          <NavLink to="/admin/orders">Orders</NavLink>
          <NavLink to="/admin/analytics">Analytics</NavLink>
          <NavLink to="/admin/history">History</NavLink>
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