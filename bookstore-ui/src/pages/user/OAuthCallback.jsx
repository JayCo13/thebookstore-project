import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { handleGoogleCallback, getCurrentUser } from '../../service/api';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const { setUser, setIsAuthenticated, logout } = useAuth();
  const [status, setStatus] = useState('processing'); // processing, success, error

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const tokenType = urlParams.get('type');
        const error = urlParams.get('error');

        if (error) {
          console.error('OAuth error:', error);
          setStatus('error');
          
          // Handle different error types
          let errorMessage = 'Authentication failed. Please try again.';
          switch (error) {
            case 'account_deactivated':
              errorMessage = 'Your account has been deactivated. Please contact support.';
              break;
            case 'system_not_initialized':
              errorMessage = 'System error. Please try again later.';
              break;
            case 'authentication_failed':
              errorMessage = 'Google authentication failed. Please try again.';
              break;
            case 'server_error':
              errorMessage = 'Server error occurred. Please try again later.';
              break;
          }
          
          alert(errorMessage);
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        if (token && tokenType === 'bearer') {
          // Clear any existing authentication state to prevent multiple logins
          logout();
          
          // Handle successful authentication
          const result = handleGoogleCallback(token);
          
          if (result.access_token) {
            // Fetch complete user profile
            try {
              const currentUser = await getCurrentUser();
              
              // Create complete user data with proper structure
              const completeUserData = {
                access_token: result.access_token,
                token_type: result.token_type,
                user_id: currentUser.user_id,
                first_name: currentUser.first_name,
                last_name: currentUser.last_name,
                email: currentUser.email,
                role: currentUser.role,
                created_at: currentUser.created_at,
                is_active: currentUser.is_active,
                google_id: currentUser.google_id,
                profile_picture: currentUser.profile_picture,
                auth_provider: currentUser.auth_provider
              };
              
              setUser(completeUserData);
              setIsAuthenticated(true);
              
              // Store complete user data consistently (only 'user' key)
              localStorage.setItem('user', JSON.stringify(completeUserData));
              
              setStatus('success');
              setTimeout(() => navigate('/'), 1500);
              
            } catch (profileError) {
              console.error('Error fetching user profile:', profileError);
              // If profile fetch fails, show error and redirect to login
              setStatus('error');
              alert('Failed to fetch user profile. Please try logging in again.');
              setTimeout(() => navigate('/login'), 2000);
            }
          } else {
            throw new Error('No access token received');
          }
        } else {
          throw new Error('Invalid callback parameters');
        }
        
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        alert('Authentication failed. Please try again.');
        setTimeout(() => navigate('/login'), 2000);
      }
    };

    handleCallback();
  }, [navigate, setUser, setIsAuthenticated, logout]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008080] mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Authentication</h2>
            <p className="text-gray-600">Please wait while we complete your sign-in...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="rounded-full h-12 w-12 bg-green-100 mx-auto mb-4 flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Successful</h2>
            <p className="text-gray-600">Redirecting you to the homepage...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="rounded-full h-12 w-12 bg-red-100 mx-auto mb-4 flex items-center justify-center">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Failed</h2>
            <p className="text-gray-600">Redirecting you back to login...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;