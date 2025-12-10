import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, login as apiLogin, getGoogleAuthUrl, handleGoogleCallback, createAccountFromGuest as apiCreateAccountFromGuest } from '../service/api.js';
import sessionManager from '../utils/sessionManager';
import networkUtils from '../utils/networkUtils';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize authentication state on app load
  useEffect(() => {
    initializeAuth();

    // Initialize session manager
    sessionManager.initialize();

    // Listen for session events
    const unsubscribe = sessionManager.addEventListener((event) => {
      // Session events are now only logged by SessionManager when needed
      // Removed console.log here to reduce noise

      switch (event.event) {
        case 'tokenRefreshed':
          // Token was refreshed, update user data
          refreshUserData();
          break;
        case 'refreshFailed':
          // Token refresh failed - DON'T automatically logout
          // Let the initialization process handle auth errors appropriately
          if (process.env.NODE_ENV === 'development') {
            console.warn('Token refresh failed - user may need to re-login eventually');
          }
          // Don't call logout() here - it causes premature logouts
          break;
        case 'sessionChanged':
          // Session changed in another tab
          if (event.data.newValue) {
            // Session was updated, refresh our state (only if not already initializing)
            if (!isInitializing) {
              initializeAuth();
            }
          } else {
            // Session was cleared, logout
            logout();
          }
          break;
        case 'sessionCleared':
          // Session was cleared
          setUser(null);
          setIsAuthenticated(false);
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);



  const initializeAuth = async (retryCount = 0) => {
    const MAX_RETRY_ATTEMPTS = 1; // Reduced from 3 to 1 to prevent infinite loops
    const RETRY_DELAY_MS = 2000; // Increased delay

    // Prevent multiple simultaneous initialization attempts
    if (isInitializing && retryCount === 0) {
      sessionManager.log('Authentication initialization already in progress, skipping', 'debug');
      return;
    }

    try {
      setIsInitializing(true);
      sessionManager.log(`Initializing authentication state (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS + 1})`, 'info');
      setLoading(true);

      // Check if user data exists in localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        sessionManager.log('Found stored user data', 'info', { email: userData.email });

        // If we have a token, first restore the user state, then verify in background
        if (userData.access_token) {
          // Immediately restore the user state from localStorage
          setUser(userData);
          setIsAuthenticated(true);
          sessionManager.log('User state restored from localStorage', 'info');

          // CRITICAL FIX: Ensure HttpClient token cache is synchronized with restored state
          localStorage.removeItem('authToken'); // Clear legacy token
          try {
            const apiModule = await import('../service/api.js');
            if (apiModule.default && apiModule.default.client && apiModule.default.client.setAuthToken) {
              apiModule.default.client.setAuthToken(userData.access_token);
              sessionManager.log('HttpClient token cache synchronized with restored state', 'info');
            }
          } catch (importError) {
            sessionManager.log('Failed to synchronize HttpClient token cache', 'warn', importError);
          }

          // Check if token needs refresh
          if (sessionManager.isTokenExpiringSoon(userData)) {
            sessionManager.log('Token expiring soon, attempting refresh', 'info');
            try {
              await sessionManager.autoRefreshToken();
              sessionManager.log('Token refresh successful during initialization', 'info');
            } catch (refreshError) {
              sessionManager.log('Token refresh failed during initialization', 'warn', refreshError);

              // If refresh fails due to auth error, logout
              if (refreshError.status === 401 || refreshError.status === 403) {
                sessionManager.log('Authentication error during refresh, logging out', 'warn');
                await logout();
                return;
              }

              // For other errors, continue with verification
              sessionManager.log('Continuing with token verification despite refresh failure', 'info');
            }
          }

          // Then verify the token in the background (don't block the UI)
          try {
            const currentUser = await getCurrentUser();
            sessionManager.log('Token verification successful', 'info');

            // If verification succeeds, update with fresh data
            const completeUserData = {
              access_token: userData.access_token,
              token_type: userData.token_type,
              user_id: currentUser.user_id,
              first_name: currentUser.first_name,
              last_name: currentUser.last_name,
              email: currentUser.email,
              role: currentUser.role,
              created_at: currentUser.created_at,
              is_active: currentUser.is_active,
              google_id: currentUser.google_id,
              profile_picture: currentUser.profile_picture,
              auth_provider: currentUser.auth_provider,
              phone_number: currentUser.phone_number
            };

            setUser(completeUserData);
            localStorage.setItem('user', JSON.stringify(completeUserData));
            sessionManager.log('User data updated with fresh information', 'info');

            // Ensure HttpClient token cache stays synchronized
            try {
              const apiModule = await import('../service/api.js');
              if (apiModule.default && apiModule.default.client && apiModule.default.client.setAuthToken) {
                apiModule.default.client.setAuthToken(completeUserData.access_token);
              }
            } catch (importError) {
              sessionManager.log('Failed to synchronize HttpClient token cache after verification', 'warn', importError);
            }
          } catch (error) {
            sessionManager.log('Token verification failed', 'warn', error);

            // Only logout if it's a clear authentication error (401/403)
            if (error.status === 401 || error.status === 403) {
              sessionManager.log('Authentication error detected, logging out', 'warn');
              await logout();
            } else {
              // For network errors or other issues, keep the user logged in
              sessionManager.log('Network error during token verification, keeping user logged in', 'info', error);

              // If this is a network error and we haven't exceeded retry attempts, retry
              if (retryCount < MAX_RETRY_ATTEMPTS && networkUtils.isNetworkError(error)) {
                sessionManager.log(`Network error detected: ${networkUtils.getNetworkErrorMessage(error)}`, 'warn');

                // Wait for connectivity if offline
                if (!networkUtils.isConnected()) {
                  sessionManager.log('Device is offline, waiting for connectivity before retry', 'warn');
                  const connected = await networkUtils.waitForConnectivity(5000); // Reduced timeout
                  if (!connected) {
                    sessionManager.log('Network connectivity could not be restored', 'error');
                    setLoading(false);
                    setIsInitializing(false);
                    return;
                  }
                }

                const delay = RETRY_DELAY_MS * (retryCount + 1);
                sessionManager.log(`Retrying initialization in ${delay}ms`, 'warn');
                setTimeout(() => {
                  initializeAuth(retryCount + 1);
                }, delay);
                return;
              }
            }
          }
        } else {
          // No token, clear stored data
          sessionManager.log('No access token found, clearing stored data', 'info');
          localStorage.removeItem('user');
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        // No stored user data
        sessionManager.log('No stored user data found', 'info');
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      sessionManager.log('Initialize auth error', 'error', error);

      // If it's a parsing error or critical error, clear session
      if (error instanceof SyntaxError) {
        sessionManager.log('JSON parsing error, clearing corrupted session data', 'error');
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
      } else {
        // For other errors, retry if we haven't exceeded attempts and it's a network error
        if (retryCount < MAX_RETRY_ATTEMPTS && networkUtils.isNetworkError(error)) {
          sessionManager.log(`Network error during initialization: ${networkUtils.getNetworkErrorMessage(error)}`, 'warn');

          // Wait for connectivity if offline
          if (!networkUtils.isConnected()) {
            sessionManager.log('Device is offline, waiting for connectivity before retry', 'warn');
            const connected = await networkUtils.waitForConnectivity(5000); // Reduced timeout
            if (!connected) {
              sessionManager.log('Network connectivity could not be restored', 'error');
              setLoading(false);
              setIsInitializing(false);
              return;
            }
          }

          const delay = RETRY_DELAY_MS * (retryCount + 1);
          sessionManager.log(`Retrying initialization in ${delay}ms`, 'warn');
          setTimeout(() => {
            initializeAuth(retryCount + 1);
          }, delay);
          return;
        } else {
          sessionManager.log('Max retry attempts reached or non-network error, keeping current state', 'warn');
          // Don't clear user state on general errors after retries - could be network issues
          const storedUser = localStorage.getItem('user');
          if (!storedUser) {
            setUser(null);
            setIsAuthenticated(false);
          }
          setLoading(false);
          setIsInitializing(false);
        }
      }
    } finally {
      // Only set loading to false if we're not retrying
      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        setLoading(false);
        setIsInitializing(false);
      } else if (retryCount === 0) {
        // First attempt completed (success or failure without retry)
        setLoading(false);
        setIsInitializing(false);
      }
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);

      // Clear any existing authentication state to prevent multiple logins
      if (isAuthenticated) {
        logout();
      }

      // Call the API login function
      const result = await apiLogin(credentials);

      if (result.access_token) {
        // Store user data in localStorage
        localStorage.setItem('user', JSON.stringify(result));

        // Fetch complete user profile
        try {
          const currentUser = await getCurrentUser();

          // Create properly structured user data
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
            auth_provider: currentUser.auth_provider,
            phone_number: currentUser.phone_number
          };

          setUser(completeUserData);
          setIsAuthenticated(true);

          // Update localStorage with complete user data
          localStorage.setItem('user', JSON.stringify(completeUserData));

          // CRITICAL FIX: Ensure HttpClient token cache is synchronized
          // Clear any legacy token and set the new one
          localStorage.removeItem('authToken'); // Clear legacy token
          const apiModule = await import('../service/api.js');
          if (apiModule.default && apiModule.default.client && apiModule.default.client.setAuthToken) {
            apiModule.default.client.setAuthToken(completeUserData.access_token);
          }

          // Initialize session management for the new session
          sessionManager.log('User login successful', 'info', { email: completeUserData.email });
          sessionManager.scheduleNextRefresh();

          return { success: true, user: completeUserData };
        } catch (profileError) {
          // Even if profile fetch fails, we still have basic auth
          setUser(result);
          setIsAuthenticated(true);

          // CRITICAL FIX: Ensure HttpClient token cache is synchronized even in fallback case
          localStorage.removeItem('authToken'); // Clear legacy token
          const apiModule = await import('../service/api.js');
          if (apiModule.default && apiModule.default.client && apiModule.default.client.setAuthToken) {
            apiModule.default.client.setAuthToken(result.access_token);
          }

          return { success: true, user: result };
        }
      } else {
        return { success: false, error: 'Login failed. Please check your credentials.' };
      }
    } catch (error) {
      console.error('Login error:', error);

      let errorMessage = 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.';

      if (error.message.includes('Invalid email or password')) {
        errorMessage = 'Email hoặc mật khẩu không chính xác';
      } else if (error.message.includes('Email not verified')) {
        errorMessage = 'Email chưa được xác thực. Vui lòng kiểm tra hộp thư của bạn.';
      } else if (error.message.includes('Account not activated')) {
        errorMessage = 'Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email để kích hoạt.';
      }

      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);

      // Get Google OAuth authorization URL
      const result = await getGoogleAuthUrl();

      if (result.authorization_url) {
        // Redirect to Google OAuth
        window.location.href = result.authorization_url;
        return { success: true };
      } else {
        return { success: false, error: 'Failed to get Google authorization URL' };
      }
    } catch (error) {
      console.error('Google OAuth error:', error);
      return { success: false, error: 'Đã xảy ra lỗi khi đăng nhập với Google. Vui lòng thử lại sau.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    try {
      console.log('Logging out user');
      sessionManager.log('User logout initiated', 'info');

      // Clear user data from state
      setUser(null);
      setIsAuthenticated(false);

      // Clear session using session manager
      sessionManager.clearSession();

      // You might want to call an API logout endpoint here if available
      // await apiLogout();

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: 'Error during logout' };
    }
  };

  const updateUser = (userData) => {
    try {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);

      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, error: 'Error updating user data' };
    }
  };

  const refreshUserData = async () => {
    try {
      if (!isAuthenticated) return { success: false, error: 'Not authenticated' };

      const currentUser = await getCurrentUser();

      // Preserve token information when merging user data
      const updatedUser = {
        ...user, // Keep existing user data including tokens
        ...currentUser, // Update with fresh profile data
        // Explicitly preserve token fields to prevent overwriting
        access_token: user.access_token,
        token_type: user.token_type
      };

      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Refresh user data error:', error);

      // If refresh fails due to invalid token, logout
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        logout();
      }

      return { success: false, error: 'Error refreshing user data' };
    }
  };

  const createAccountFromGuest = async (guestData) => {
    try {
      setLoading(true);

      // Call API to create account from guest
      const result = await apiCreateAccountFromGuest(guestData);

      if (result.access_token) {
        // Fetch complete user profile
        const currentUser = await getCurrentUser();

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
          auth_provider: currentUser.auth_provider,
          phone_number: currentUser.phone_number
        };

        setUser(completeUserData);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(completeUserData));

        // Sync token with HttpClient
        const apiModule = await import('../service/api.js');
        if (apiModule.default?.client?.setAuthToken) {
          apiModule.default.client.setAuthToken(completeUserData.access_token);
        }

        sessionManager.log('Guest account created and logged in', 'info');
        sessionManager.scheduleNextRefresh();

        return { success: true, user: completeUserData };
      }

      return { success: false, error: 'Failed to create account' };
    } catch (error) {
      console.error('Create account from guest error:', error);
      return { success: false, error: error.message || 'Failed to create account' };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    loginWithGoogle,
    logout,
    updateUser,
    refreshUserData,
    initializeAuth,
    setUser,
    setIsAuthenticated,
    createAccountFromGuest
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;