import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// User Pages (migrated from Next.js structure)
import HomePage from './pages/user/page.jsx';
import AboutPage from './pages/user/about/page.jsx';
import BooksPage from './pages/user/books/page.jsx';
import WishlistPage from './pages/user/wishlist/page.jsx';
import ContactPage from './pages/user/contact/page.jsx';
import NewArrivalsPage from './pages/user/new-arrivals/page.jsx';
import CartPage from './pages/user/cart/page.jsx';
import CheckoutPage from './pages/user/checkout/page.jsx';
import ProfilePage from './pages/user/profile/page.jsx';
import OrdersPage from './pages/user/orders/page.jsx';
import Login from './pages/user/Login.jsx';
import Register from './pages/user/Register.jsx';
import ForgotPassword from './pages/user/ForgotPassword.jsx';
import ResetPassword from './pages/user/ResetPassword.jsx';
import EmailVerification from './pages/user/EmailVerification.jsx';
import OAuthCallback from './pages/user/OAuthCallback.jsx';
// Use Header/Footer from user pages instead of external layouts
import Header from './pages/user/components/home/Header.jsx';
import Footer from './pages/user/components/home/Footer.jsx';
// Admin Pages
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard.js';
import ManageUsers from './pages/admin/ManageUsers.js';
import CreateBook from './pages/admin/CreateBook.jsx';
import BooksProducts from './pages/admin/BooksProducts.jsx';
import OrdersList from './pages/admin/OrdersList.jsx';
import OrderDetails from './pages/admin/OrderDetails.jsx';
import EditBook from './pages/admin/EditBook.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
 

// User Routes Component
const UserRoutes = () => {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/new-arrivals" element={<NewArrivalsPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/orders" element={<OrdersPage />} />
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </>
  );
};



// Main App Router Component
const AppRouter = () => {
  return (
    <Router>
      <Routes>
        {/* User Routes only; layouts directory removed */}
        <Route path="/*" element={<UserRoutes />} />
        {/* User auth routes without header/footer */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<EmailVerification />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        {/* Admin auth routes (standalone, no AdminLayout) */}
        <Route path="/admin/login" element={<AdminLogin />} />
        {/* Admin Routes */}
        <Route path="/admin/*" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="books/new" element={<CreateBook />} />
          {/* Admin Products -> Books list */}
          <Route path="products" element={<BooksProducts />} />
          <Route path="orders" element={<OrdersList />} />
          <Route path="orders/:id" element={<OrderDetails />} />
          <Route path="products/:id/edit" element={<EditBook />} />
          <Route path="analytics" element={<div style={{padding:20}}>Analytics coming soon.</div>} />
          <Route path="history" element={<div style={{padding:20}}>History coming soon.</div>} />
        </Route>
      </Routes>
    </Router>
  );
};

export default AppRouter;