import React from 'react';
import { NavLink } from 'react-router-dom';
import ResetPasswordForm from './components/auth/ResetPasswordForm.jsx';
import './Auth.css';

const ResetPassword = () => {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <ResetPasswordForm />

        <div className="footer-msg">
          <NavLink to="/login" className="link">Quay lại đăng nhập</NavLink>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;