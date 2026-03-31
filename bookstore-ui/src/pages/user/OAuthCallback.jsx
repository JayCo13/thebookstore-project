import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentUser } from '../../service/api';
import api from '../../service/api';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const { setUser, setIsAuthenticated } = useAuth();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const hasProcessed = useRef(false); // Prevent double processing

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent double processing (especially on mobile)
      if (hasProcessed.current) {
        return;
      }
      hasProcessed.current = true;

      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const tokenType = urlParams.get('type');
        const error = urlParams.get('error');

        if (error) {
          console.error('OAuth error:', error);
          setStatus('error');

          // Handle different error types
          let message = 'Authentication failed. Please try again.';
          switch (error) {
            case 'account_deactivated':
              message = 'Your account has been deactivated. Please contact support.';
              break;
            case 'system_not_initialized':
              message = 'System error. Please try again later.';
              break;
            case 'authentication_failed':
              message = 'Google authentication failed. Please try again.';
              break;
            case 'server_error':
              message = 'Server error occurred. Please try again later.';
              break;
            default:
              message = 'Authentication failed. Please try again.';
          }

          setErrorMessage(message);
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        if (token && tokenType === 'bearer') {
          // IMPORTANT: Clear old state BEFORE setting new token
          // This prevents race conditions on mobile browsers
          localStorage.removeItem('user');
          localStorage.removeItem('authToken');

          // Store the token in localStorage FIRST before any API calls
          localStorage.setItem('authToken', token);

          // Also set the token in the API client
          if (api.client && api.client.setAuthToken) {
            api.client.setAuthToken(token);
          }

          // Small delay to ensure localStorage is synced (helps on mobile)
          await new Promise(resolve => setTimeout(resolve, 100));

          // Now fetch user profile with the token
          try {
            const currentUser = await getCurrentUser();

            // Create complete user data with proper structure
            const completeUserData = {
              access_token: token,
              token_type: tokenType,
              user_id: currentUser.user_id,
              first_name: currentUser.first_name,
              last_name: currentUser.last_name,
              email: currentUser.email,
              phone_number: currentUser.phone_number,
              role: currentUser.role,
              created_at: currentUser.created_at,
              is_active: currentUser.is_active,
              google_id: currentUser.google_id,
              profile_picture: currentUser.profile_picture,
              auth_provider: currentUser.auth_provider
            };

            // Store in localStorage first
            localStorage.setItem('user', JSON.stringify(completeUserData));

            // Then update React state
            setUser(completeUserData);
            setIsAuthenticated(true);

            setStatus('success');
            setTimeout(() => navigate('/'), 1500);

          } catch (profileError) {
            console.error('Error fetching user profile:', profileError);

            // Detailed error logging for debugging
            const errorDetails = {
              message: profileError.message,
              status: profileError.status,
              data: profileError.data
            };
            console.error('Profile error details:', JSON.stringify(errorDetails));

            // Clean up on error
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');

            setStatus('error');
            setErrorMessage('Failed to fetch user profile. Please try logging in again.');
            setTimeout(() => navigate('/login'), 2000);
          }
        } else {
          throw new Error('Invalid callback parameters: missing token or type');
        }

      } catch (error) {
        console.error('OAuth callback error:', error);

        // Clean up on error
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');

        setStatus('error');
        setErrorMessage('Authentication failed. Please try again.');
        setTimeout(() => navigate('/login'), 2000);
      }
    };

    handleCallback();
  }, [navigate, setUser, setIsAuthenticated]);

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
            <p className="text-gray-600">{errorMessage || 'Redirecting you back to login...'}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;