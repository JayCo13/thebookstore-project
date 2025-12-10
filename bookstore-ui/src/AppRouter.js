import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import NotificationBanner from './components/NotificationBanner.jsx';
import ChatbotWidget from './components/ChatbotWidget.jsx';

// User Pages (migrated from Next.js structure)
import HomePage from './pages/user/page.jsx';
import AboutPage from './pages/user/about/page.jsx';
import BooksPage from './pages/user/books/page.jsx';
import BookDetailsPage from './pages/user/book/page.jsx';
import StationeryPage from './pages/user/stationery/page.jsx';
import StationeryDetailsPage from './pages/user/stationery/item.jsx';
import YogaPage from './pages/user/yoga/page.jsx';
import WishlistPage from './pages/user/wishlist/page.jsx';
import ContactPage from './pages/user/contact/page.jsx';
import CartPage from './pages/user/cart/page.jsx';
import CheckoutPage from './pages/user/checkout/page.jsx';
import CheckoutSuccessPage from './pages/user/checkout/success/page.jsx';
import ProfilePage from './pages/user/profile/page.jsx';
import OrdersPage from './pages/user/orders/page.jsx';
import Login from './pages/user/Login.jsx';
import Register from './pages/user/Register.jsx';
import ForgotPassword from './pages/user/ForgotPassword.jsx';
import ResetPassword from './pages/user/ResetPassword.jsx';
import EmailVerification from './pages/user/EmailVerification.jsx';
import OAuthCallback from './pages/user/OAuthCallback.jsx';
// Support Pages
import FAQPage from './pages/user/cau-hoi-thuong-gap/page.jsx';
import ShippingReturnsPage from './pages/user/van-chuyen-doi-tra/page.jsx';
import PrivacyPolicyPage from './pages/user/chinh-sach-bao-mat/page.jsx';
import TermsConditionsPage from './pages/user/dieu-khoan-dich-vu/page.jsx';
import AccessibilityPage from './pages/user/kha-nang-truy-cap/page.jsx';
// Use Header/Footer from user pages instead of external layouts
import Header from './pages/user/components/home/Header.jsx';
import Footer from './pages/user/components/home/Footer.jsx';
// Admin Pages
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard.js';
import ManageUsers from './pages/admin/ManageUsers.js';
import CreateBook from './pages/admin/CreateBook.jsx';
import BooksProducts from './pages/admin/BooksProducts.jsx';
import CreateYoga from './pages/admin/CreateYoga.jsx';
import EditYoga from './pages/admin/EditYoga.jsx';
import OrdersList from './pages/admin/OrdersList.jsx';
import OrdersArchive from './pages/admin/OrdersArchive.jsx';
import OrderDetails from './pages/admin/OrderDetails.jsx';
import EditBook from './pages/admin/EditBook.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
import ManageCustomers from './pages/admin/ManageCustomers.jsx';
import ManageReviews from './pages/admin/ManageReviews.jsx';
import StationeryProducts from './pages/admin/StationeryProducts.jsx';
import CreateStationery from './pages/admin/CreateStationery.jsx';
import EditStationery from './pages/admin/EditStationery.jsx';
import AdminHeroSlides from './pages/admin/AdminHeroSlides.jsx';
import NotificationManagement from './pages/admin/NotificationManagement.jsx';


// Conditional Widgets - Only show on certain pages
const ConditionalWidgets = () => {
  const { pathname } = useLocation();

  // Hide on admin, auth, and checkout pages
  const hiddenPaths = [
    '/admin',
    '/login',
    '/register',
    '/auth/',
    '/verify-email',
    '/checkout',
  ];

  const shouldHide = hiddenPaths.some(path => pathname.startsWith(path));

  if (shouldHide) return null;

  return (
    <>
      <ChatbotWidget />
      <NotificationBanner />
    </>
  );
};


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
        <Route path="/book/:slug" element={<BookDetailsPage />} />
        <Route path="/book/:id" element={<BookDetailsPage />} />
        <Route path="/yoga" element={<YogaPage />} />
        <Route path="/yoga/:slug" element={<StationeryDetailsPage />} />
        <Route path="/yoga/:id" element={<StationeryDetailsPage />} />
        <Route path="/van-phong-pham" element={<StationeryPage />} />
        <Route path="/van-phong-pham/:slug" element={<StationeryDetailsPage />} />
        <Route path="/van-phong-pham/:id" element={<StationeryDetailsPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/orders" element={<OrdersPage />} />
        {/* Support Pages */}
        <Route path="/cau-hoi-thuong-gap" element={<FAQPage />} />
        <Route path="/van-chuyen-doi-tra" element={<ShippingReturnsPage />} />
        <Route path="/chinh-sach-bao-mat" element={<PrivacyPolicyPage />} />
        <Route path="/dieu-khoan-dich-vu" element={<TermsConditionsPage />} />
        <Route path="/kha-nang-truy-cap" element={<AccessibilityPage />} />
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
      <ScrollToTop />
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
        {/* Redirect /admin to /admin/ */}
        <Route path="/admin" element={<Navigate to="/admin/" replace />} />
        {/* Admin Routes - Protected */}
        <Route path="/admin/*" element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="books/new" element={<CreateBook />} />
          {/* Admin Products -> Books list */}
          <Route path="products" element={<BooksProducts />} />
          {/* Admin Stationery */}
          <Route path="stationery" element={<StationeryProducts />} />
          <Route path="stationery/new" element={<CreateStationery />} />
          <Route path="stationery/:id/edit" element={<EditStationery />} />
          <Route path="yoga/new" element={<CreateYoga />} />
          <Route path="yoga/:id/edit" element={<EditYoga />} />
          <Route path="orders" element={<OrdersList />} />
          <Route path="orders/archive" element={<OrdersArchive />} />
          <Route path="orders/:id" element={<OrderDetails />} />
          <Route path="customers" element={<ManageCustomers />} />
          <Route path="reviews" element={<ManageReviews />} />
          <Route path="products/:id/edit" element={<EditBook />} />
          <Route path="hero-slides" element={<AdminHeroSlides />} />
          <Route path="notifications" element={<NotificationManagement />} />
          <Route path="analytics" element={<div style={{ padding: 20 }}>Analytics coming soon.</div>} />
          <Route path="history" element={<div style={{ padding: 20 }}>History coming soon.</div>} />
        </Route>
      </Routes>
      {/* Conditional Widgets - hidden on admin, auth, checkout */}
      <ConditionalWidgets />
    </Router>
  );
};

export default AppRouter;

