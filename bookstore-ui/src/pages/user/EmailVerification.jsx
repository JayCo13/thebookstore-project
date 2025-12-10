import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyEmail } from '../../service/api';
import './Auth.css';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setVerificationStatus('error');
      setMessage('Liên kết xác minh không hợp lệ. Không có mã token.');
      return;
    }

    const verifyEmailToken = async () => {
      try {
        const response = await verifyEmail(token);
        setVerificationStatus('success');
        setMessage(response.message || 'Email đã được xác minh thành công!');
      } catch (error) {
        setVerificationStatus('error');
        setMessage(error.response?.data?.detail || 'Xác minh email thất bại. Mã token có thể không hợp lệ hoặc đã hết hạn.');
      }
    };

    verifyEmailToken();
  }, [searchParams]);

  // Auto-redirect countdown for success
  useEffect(() => {
    if (verificationStatus === 'success') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/login');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [verificationStatus, navigate]);

  if (verificationStatus === 'verifying') {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
          {/* Logo */}
          <div style={{ marginBottom: '30px' }}>
            <img
              src="/assets/logo-left.png"
              alt="Book Tâm Nguồn"
              style={{ maxWidth: '200px', height: 'auto', display: 'block', margin: '0 auto' }}
            />
          </div>

          <div className="auth-header">
            <h2>Đang Xác Minh Email</h2>
          </div>
          <div className="auth-content">
            <div className="verification-spinner">
              <div className="spinner"></div>
              <p style={{ marginTop: '20px', color: '#666' }}>
                Vui lòng đợi trong khi chúng tôi xác minh địa chỉ email của bạn...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
        {/* Logo */}
        <div style={{ marginBottom: '30px' }}>
          <img
            src="/assets/logo-left.png"
            alt="Book Tâm Nguồn"
            style={{ maxWidth: '200px', height: 'auto', display: 'block', margin: '0 auto' }}
          />
        </div>

        <div className="auth-content">
          {verificationStatus === 'success' ? (
            <div className="verification-success">
              <div className="success-icon" style={{ margin: '0 auto 20px' }}>
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" fill="#10B981" />
                  <path d="m9 12 2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 style={{ color: '#10B981', marginBottom: '15px' }}>
                Email Đã Được Xác Minh Thành Công!
              </h2>
              <p style={{ color: '#666', fontSize: '16px', lineHeight: '1.6', marginBottom: '20px' }}>
                {message}
              </p>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '30px' }}>
                Tài khoản của bạn hiện đã được kích hoạt.
              </p>

              {/* Countdown */}
              <div style={{
                padding: '15px',
                backgroundColor: '#f0f9ff',
                borderRadius: '8px',
                border: '1px solid #bae6fd'
              }}>
                <p style={{ color: '#0369a1', margin: 0, fontSize: '14px' }}>
                  Đang chuyển hướng đến trang đăng nhập trong <strong>{countdown}</strong> giây...
                </p>
              </div>
            </div>
          ) : (
            <div className="verification-error">
              <div className="error-icon" style={{ margin: '0 auto 20px' }}>
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" fill="#EF4444" />
                  <path d="m15 9-6 6m0-6 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 style={{ color: '#EF4444', marginBottom: '15px' }}>
                Xác Minh Thất Bại
              </h2>
              <p style={{ color: '#666', fontSize: '16px', lineHeight: '1.6', marginBottom: '20px' }}>
                {message}
              </p>
              <p style={{ color: '#666', fontSize: '14px' }}>
                Vui lòng thử đăng ký lại hoặc liên hệ hỗ trợ nếu vấn đề vẫn tiếp tục.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;