import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyEmail } from '../../service/api';
import './Auth.css';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setVerificationStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    // Verify the email token
    const verifyEmailToken = async () => {
      try {
        const response = await verifyEmail(token);
        setVerificationStatus('success');
        setMessage(response.message || 'Email verified successfully!');
      } catch (error) {
        setVerificationStatus('error');
        setMessage(error.response?.data?.detail || 'Email verification failed. The token may be invalid or expired.');
      }
    };

    verifyEmailToken();
  }, [searchParams]);

  const handleLoginRedirect = () => {
    setIsLoading(true);
    navigate('/login');
  };

  const handleHomeRedirect = () => {
    setIsLoading(true);
    navigate('/');
  };

  if (verificationStatus === 'verifying') {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Verifying Email</h2>
          </div>
          <div className="auth-content">
            <div className="verification-spinner">
              <div className="spinner"></div>
              <p>Please wait while we verify your email address...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Email Verification</h2>
        </div>
        <div className="auth-content">
          {verificationStatus === 'success' ? (
            <div className="verification-success">
              <div className="success-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" fill="#10B981"/>
                  <path d="m9 12 2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Email Verified Successfully!</h3>
              <p className="success-message">{message}</p>
              <p>Your account is now active and you can log in to access all features.</p>
              
              <div className="verification-actions">
                <button 
                  onClick={handleLoginRedirect}
                  disabled={isLoading}
                  className="btn btn-primary"
                >
                  {isLoading ? 'Redirecting...' : 'Go to Login'}
                </button>
                <button 
                  onClick={handleHomeRedirect}
                  disabled={isLoading}
                  className="btn btn-secondary"
                >
                  {isLoading ? 'Redirecting...' : 'Continue Browsing'}
                </button>
              </div>
            </div>
          ) : (
            <div className="verification-error">
              <div className="error-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" fill="#EF4444"/>
                  <path d="m15 9-6 6m0-6 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Verification Failed</h3>
              <p className="error-message">{message}</p>
              <p>Please try registering again or contact support if the problem persists.</p>
              
              <div className="verification-actions">
                <button 
                  onClick={() => navigate('/register')}
                  className="btn btn-primary"
                >
                  Register Again
                </button>
                <button 
                  onClick={handleHomeRedirect}
                  className="btn btn-secondary"
                >
                  Go to Homepage
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;