import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Input } from '../../components';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { adminLogin, getCurrentUser } from '../../service/api.js';
import './AdminAuth.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setIsAuthenticated, isAuthenticated, user } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Security state
  const [isBlocked, setIsBlocked] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isBlacklistedEmail, setIsBlacklistedEmail] = useState(false);

  // Security constants
  const MAX_ATTEMPTS = 3;
  const BLOCK_DURATIONS = [60000, 300000, 900000]; // 1min, 5min, 15min in milliseconds
  const STORAGE_KEY = 'admin_login_attempts';

  // Email blacklist - known malicious actors
  const BLACKLISTED_EMAILS = [
    'thebookstore.vn@gmail.com',
    'the.bookstore.vn@gmail.com',
    'thebookstore.vn@gmail.com'.toLowerCase()
  ];

  // Check if user is already authenticated and is admin
  useEffect(() => {
    if (isAuthenticated && user && user.role && user.role.role_name === 'Admin') {
      const from = location.state?.from?.pathname || '/admin';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

  // Initialize security state from localStorage
  useEffect(() => {
    checkBlockStatus();
  }, []);

  // Update remaining time every second when blocked
  useEffect(() => {
    let interval;
    if (isBlocked && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1000) {
            setIsBlocked(false);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isBlocked, remainingTime]);

  // Check for blacklisted email in real-time
  useEffect(() => {
    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      const isBlacklisted = BLACKLISTED_EMAILS.some(
        blacklistedEmail => blacklistedEmail.toLowerCase() === normalizedEmail
      );
      setIsBlacklistedEmail(isBlacklisted);

      if (isBlacklisted) {
        setError('🚫 Access denied. This email has been blocked for security reasons.');
      } else if (error === '🚫 Access denied. This email has been blocked for security reasons.') {
        setError('');
      }
    } else {
      setIsBlacklistedEmail(false);
    }
  }, [email]);

  const checkBlockStatus = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();

        // Check if still within block period
        if (data.blockedUntil && now < data.blockedUntil) {
          setIsBlocked(true);
          setRemainingTime(data.blockedUntil - now);
          setAttemptCount(data.attempts || 0);
        } else if (data.blockedUntil && now >= data.blockedUntil) {
          // Block period expired, reset attempts
          localStorage.removeItem(STORAGE_KEY);
          setAttemptCount(0);
        } else {
          setAttemptCount(data.attempts || 0);
        }
      }
    } catch (error) {
      console.error('Error checking block status:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const recordFailedAttempt = () => {
    try {
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);

      if (newAttemptCount >= MAX_ATTEMPTS) {
        // Calculate block duration (progressive delays)
        const blockIndex = Math.min(newAttemptCount - MAX_ATTEMPTS, BLOCK_DURATIONS.length - 1);
        const blockDuration = BLOCK_DURATIONS[blockIndex];
        const blockedUntil = Date.now() + blockDuration;

        const data = {
          attempts: newAttemptCount,
          blockedUntil,
          lastAttempt: Date.now()
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        setIsBlocked(true);
        setRemainingTime(blockDuration);

        setError(`Too many failed attempts. Account blocked for ${Math.ceil(blockDuration / 60000)} minutes.`);
      } else {
        const data = {
          attempts: newAttemptCount,
          lastAttempt: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

        const remaining = MAX_ATTEMPTS - newAttemptCount;
        setError(`Invalid credentials. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before account lock.`);
      }
    } catch (error) {
      console.error('Error recording failed attempt:', error);
    }
  };

  const clearFailedAttempts = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setAttemptCount(0);
      setIsBlocked(false);
      setRemainingTime(0);
    } catch (error) {
      console.error('Error clearing failed attempts:', error);
    }
  };

  const validateInput = (email, password) => {
    // Basic input validation and sanitization
    if (!email || !password) {
      return 'Email and password are required.';
    }

    // Check blacklist first (critical security check)
    const normalizedEmail = email.trim().toLowerCase();
    if (BLACKLISTED_EMAILS.some(blacklisted => blacklisted.toLowerCase() === normalizedEmail)) {
      return '🚫 Access denied. This email has been blocked for security reasons.';
    }

    if (email.length > 255) {
      return 'Email is too long.';
    }

    if (password.length > 255) {
      return 'Password is too long.';
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address.';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isBlocked) {
      setError(`Account is blocked. Please wait ${Math.ceil(remainingTime / 60000)} minutes.`);
      return;
    }

    // Block blacklisted emails immediately
    if (isBlacklistedEmail) {
      setError('🚫 Access denied. This email has been blocked for security reasons.');
      recordFailedAttempt();
      return;
    }

    // Validate input
    const validationError = validateInput(email, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Sanitize inputs
      const sanitizedEmail = email.trim().toLowerCase();
      const credentials = {
        email: sanitizedEmail,
        password: password,
        login_code: loginCode.trim()
      };

      // Call admin login API
      const result = await adminLogin(credentials);

      if (result.access_token) {
        // Clear failed attempts on successful login
        clearFailedAttempts();

        // Fetch complete user profile with role information
        const userProfile = await getCurrentUser();

        // Create complete user data with token information
        const completeUserData = {
          access_token: result.access_token,
          token_type: result.token_type,
          user_id: userProfile.user_id,
          first_name: userProfile.first_name,
          last_name: userProfile.last_name,
          email: userProfile.email,
          role: userProfile.role,
          created_at: userProfile.created_at,
          is_active: userProfile.is_active,
          google_id: userProfile.google_id,
          profile_picture: userProfile.profile_picture,
          auth_provider: userProfile.auth_provider,
          phone_number: userProfile.phone_number,
          addresses: userProfile.addresses
        };

        // Set complete user data in context
        setUser(completeUserData);
        setIsAuthenticated(true);

        // Store complete user data securely
        localStorage.setItem('user', JSON.stringify(completeUserData));

        // Navigate to admin dashboard or return URL
        const from = location.state?.from?.pathname || '/admin';
        navigate(from, { replace: true });
      } else {
        recordFailedAttempt();
      }
    } catch (error) {
      console.error('Admin login error:', error);
      recordFailedAttempt();

      // Handle specific error messages
      if (error.message.includes('Admin access required') || error.message.includes('Admin privileges')) {
        setError('🔒 Access denied. Admin privileges required. Regular user accounts cannot access this area.');
      } else if (error.message.includes('Invalid email or password')) {
        // Don't reveal specific error details for security
        setError('Invalid credentials. Please check your email and password.');
      } else if (error.message.includes('Account not activated')) {
        setError('Admin account is not activated. Please contact system administrator.');
      } else if (error.message.includes('blocked')) {
        setError('🚫 Access denied. This email has been blocked for security reasons.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Show error from location state (e.g., insufficient privileges)
  useEffect(() => {
    if (location.state?.error === 'insufficient_privileges') {
      setError('Access denied. Admin privileges required.');
    }
  }, [location.state]);

  return (
    <div className="admin-auth">
      <div className="admin-card">
        <h1 className="admin-title">🔒 Admin Login</h1>
        <div className="admin-sub">Secure administrative access</div>


        {/* Blacklisted Email Warning - Highest Priority */}
        {isBlacklistedEmail && (
          <div style={{
            background: '#dc3545',
            border: '2px solid #bd2130',
            borderRadius: '6px',
            padding: '15px',
            marginBottom: '15px',
            fontSize: '14px',
            color: '#ffffff',
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            🚫 <strong>SECURITY ALERT</strong><br />
            This email address has been permanently blocked.<br />
            <small style={{ fontWeight: 'normal' }}>Unauthorized access attempts are logged and monitored.</small>
          </div>
        )}

        {/* Security Status */}
        {attemptCount > 0 && !isBlocked && !isBlacklistedEmail && (
          <div style={{
            background: '#fef3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '6px',
            padding: '10px',
            marginBottom: '15px',
            fontSize: '14px',
            color: '#856404'
          }}>
            ⚠️ Security Alert: {attemptCount} failed attempt{attemptCount !== 1 ? 's' : ''} detected
          </div>
        )}

        {isBlocked && (
          <div style={{
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '6px',
            padding: '15px',
            marginBottom: '15px',
            fontSize: '14px',
            color: '#721c24',
            textAlign: 'center'
          }}>
            🚫 <strong>Account Temporarily Blocked</strong><br />
            Time remaining: <strong>{formatTime(remainingTime)}</strong><br />
            <small>Multiple failed login attempts detected</small>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email Address</label>
            <Input
              type="email"
              placeholder=""
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || isBlocked || isBlacklistedEmail}
              required
              autoComplete="username"
              maxLength={255}
            />
          </div>

          <div className="field">
            <label>Password</label>
            <Input
              type="password"
              placeholder=""
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || isBlocked || isBlacklistedEmail}
              required
              autoComplete="current-password"
              maxLength={255}
            />
          </div>

          <div className="field">
            <label>Weekly Login Code</label>
            <Input
              type="text"
              placeholder=""
              value={loginCode}
              onChange={(e) => {
                // Only allow digits and limit to 6 characters
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setLoginCode(value);
              }}
              disabled={loading || isBlocked || isBlacklistedEmail}
              required
              maxLength={6}
              pattern="[0-9]{6}"
              inputMode="numeric"
            />
            <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '5px', display: 'block' }}>
              📧 Check your email for the weekly code (valid for 7 days)
            </small>
          </div>

          {error && (

            <div style={{
              background: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '6px',
              padding: '10px',
              marginBottom: '15px',
              fontSize: '14px',
              color: '#721c24'
            }}>
              {error}
            </div>
          )}

          <Button
            variant="primary"
            style={{ width: '100%' }}
            type="submit"
            disabled={loading || isBlocked || isBlacklistedEmail}
          >
            {loading ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                Authenticating...
              </>
            ) : (
              'Secure Sign In'
            )}
          </Button>
        </form>

        <div style={{ marginTop: 15, textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
          🔐 This is a secure administrative area<br />
          All login attempts are monitored and logged
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;