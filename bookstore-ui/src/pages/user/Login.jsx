import React from 'react';
import { NavLink } from 'react-router-dom';
import LoginForm from './components/auth/LoginForm.jsx';
import OAuthButtons from './components/auth/OAuthButtons.jsx';
import './Auth.css';

const Login = () => {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Log in to your account</h1>
        <div className="auth-sub">Welcome back! Please enter your details.</div>

        <div className="tabs">
          <NavLink to="/register" className="tab">Sign up</NavLink>
          <button className="tab active">Log in</button>
        </div>

        <LoginForm />

        <div className="divider"><span>Or</span></div>
        <div className="social">
          <OAuthButtons />
        </div>

        <div className="footer-msg">Don't have an account? <NavLink to="/register" className="link">Sign up</NavLink></div>
      </div>
    </div>
  );
};

export default Login;