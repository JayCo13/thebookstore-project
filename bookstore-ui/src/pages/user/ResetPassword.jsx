import React from 'react';
import { NavLink } from 'react-router-dom';
import ResetPasswordForm from './components/auth/ResetPasswordForm.jsx';
import './Auth.css';

const ResetPassword = () => {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Reset Password</h1>
        <div className="auth-sub">Enter your new password below.</div>

        <div className="tabs">
          <NavLink to="/login" className="tab">Log in</NavLink>
          <NavLink to="/register" className="tab">Sign up</NavLink>
        </div>

        <ResetPasswordForm />
      </div>
    </div>
  );
};

export default ResetPassword;