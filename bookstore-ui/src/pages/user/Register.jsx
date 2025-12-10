import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { register } from '../../service/api.js';
import OAuthButtons from './components/auth/OAuthButtons.jsx';
import { ShieldCheck, Eye, EyeOff, Check } from 'lucide-react';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const passwordChecks = {
    minLength: formData.password.length >= 8,
    hasUppercase: /[A-Z]/.test(formData.password),
    hasLowercase: /[a-z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!agreeToTerms) {
      setError('Bạn phải đồng ý với Điều khoản Dịch vụ');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (!passwordChecks.minLength) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const nameParts = formData.fullName.trim().split(' ');
      await register({
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        email: formData.email,
        password: formData.password,
      });

      setSuccess(true);
      setTimeout(() => navigate('/login'), 5000);
    } catch (error) {
      if (error.message.includes('Email already exists') || error.message.includes('already registered')) {
        setError('Email này đã được sử dụng');
      } else {
        setError('Đăng ký thất bại. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = formData.confirmPassword && formData.password === formData.confirmPassword;

  if (success) {
    return (
      <div className="reg-page">
        <div className="reg-success">
          <img src="/assets/logo-left.png" alt="Logo" className="reg-logo" />
          <div className="success-icon"><Check size={28} /></div>
          <h2>Đăng ký thành công!</h2>
          <p>Vui lòng kiểm tra email để xác nhận tài khoản.</p>
          <span>Chuyển hướng sau 5 giây...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="reg-page">
      <div className="reg-container">
        {/* Left - Branding */}
        <div className="reg-brand">
          <img src="/assets/logo-left.png" alt="Logo" className="mt-10" width={500} />
          <div className="mt-5">
            <span className="reg-brand-text"><ShieldCheck size={18} className="inline-flex mr-1 mb-1" />Bảo mật thông tin</span>
            <p className="reg-brand-desc">Thông tin của bạn được bảo vệ an toàn với mã hóa tiên tiến. Chúng tôi cam kết không chia sẻ dữ liệu cá nhân với bên thứ ba.</p>
          </div>
          <div className="reg-oauth">
            <span>Đăng ký nhanh</span>
            <OAuthButtons />
          </div>

          <div className="reg-login-link">
            Đã có tài khoản? <NavLink to="/login">Đăng nhập</NavLink>
          </div>
        </div>

        {/* Right - Form */}
        <div className="reg-form-wrap">
          {error && <div className="reg-error">{error}</div>}

          <form onSubmit={handleSubmit} className="reg-form">
            <div className="reg-row">
              <div className="reg-field">
                <label className="text-black">Họ và tên</label>
                <input
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div className="reg-field">
                <label className="text-black">Email</label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="reg-row">
              <div className="reg-field">
                <label>Mật khẩu</label>
                <div className="reg-pw-wrap">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Ít nhất 8 ký tự"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="reg-field">
                <label className="text-black">Xác nhận mật khẩu</label>
                <div className="reg-pw-wrap">
                  <input
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Nhập lại mật khẩu"
                    className={formData.confirmPassword ? (passwordsMatch ? 'ok' : 'err') : ''}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>



            <div className="reg-bottom">
              <label className="reg-terms">
                <input
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={() => setAgreeToTerms(!agreeToTerms)}
                />
                <span>Tôi đồng ý với <a href="/dieu-khoan-dich-vu">Điều khoản</a></span>
              </label>
              <button type="submit" disabled={loading} className="reg-submit">
                {loading ? 'Đang xử lý...' : 'Tạo tài khoản'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;