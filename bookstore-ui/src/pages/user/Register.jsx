import React from 'react';
import { NavLink } from 'react-router-dom';
import RegisterForm from './components/auth/RegisterForm.jsx';
import OAuthButtons from './components/auth/OAuthButtons.jsx';
import './Auth.css';

const Register = () => {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Create your account</h1>
        <div className="auth-sub">Sign up to start exploring books.</div>

        <div className="tabs">
          <button className="tab active">Sign up</button>
          <NavLink to="/login" className="tab">Log in</NavLink>
        </div>

        <RegisterForm />

        <div className="divider"><span>Or</span></div>
        <div className="social">
          <OAuthButtons/>
        </div>

        <div className="footer-msg">Already have an account? <NavLink to="/login" className="link">Log in</NavLink></div>
      </div>
    </div>
  );
};

export default Register;