import React from 'react';
import { NavLink } from 'react-router-dom';
import ForgotPasswordForm from './components/auth/ForgotPasswordForm.jsx';
import './Auth.css';

const ForgotPassword = () => {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Forgot Password</h1>
        <div className="auth-sub">Enter your email to reset your password.</div>

        <div className="tabs">
          <NavLink to="/login" className="tab">Log in</NavLink>
          <NavLink to="/register" className="tab">Sign up</NavLink>
        </div>

        <ForgotPasswordForm />
      </div>
    </div>
  );
};

export default ForgotPassword;