import React, { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { Button, Input } from '../../components';
import './AdminAuth.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: admin authentication
    navigate('/admin');
  };

  return (
    <div className="admin-auth">
      <div className="admin-card">
        <h1 className="admin-title">Admin Login</h1>
        <div className="admin-sub">Enter your admin credentials.</div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <Input placeholder="admin@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Password</label>
            <Input type="password" placeholder="••••••••" value={password} onChange={(e)=>setPassword(e.target.value)} />
          </div>
          <Button variant="primary" style={{width:'100%'}} type="submit">Sign in</Button>
        </form>
        <div style={{marginTop:10, textAlign:'center'}}>
          <span>Need an admin account?</span> <NavLink to="/admin/register" className="link">Register</NavLink>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;