import React from 'react';
import { NavLink } from 'react-router-dom';
import ForgotPasswordForm from './components/auth/ForgotPasswordForm.jsx';
import './Auth.css';

const ForgotPassword = () => {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <ForgotPasswordForm />

        <div className="footer-msg">
          Nhớ mật khẩu rồi? <NavLink to="/login" className="link">Đăng nhập</NavLink>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;