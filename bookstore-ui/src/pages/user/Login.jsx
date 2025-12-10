import React from 'react';
import { NavLink } from 'react-router-dom';
import LoginForm from './components/auth/LoginForm.jsx';
import OAuthButtons from './components/auth/OAuthButtons.jsx';
import './Auth.css';

const Login = () => {
  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <img src="/assets/logo-left.png" alt="Tâm Nguồn Book" />
        </div>

        <h1 className="auth-title">Đăng nhập tài khoản</h1>
        <div className="auth-sub">Chào mừng bạn trở lại! Vui lòng nhập thông tin đăng nhập.</div>

        <LoginForm />

        <div className="divider"><span>Hoặc</span></div>
        <div className="social">
          <OAuthButtons />
        </div>

        <div className="footer-msg">Chưa có tài khoản? <NavLink to="/register" className="link">Đăng ký ngay</NavLink></div>
      </div>
    </div>
  );
};

export default Login;