import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, login as apiLogin, getGoogleAuthUrl, handleGoogleCallback } from '../service/api.js';

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

  // Initialize authentication state on app start
  useEffect(() => {
    initializeAuth();
  }, []);



  const initializeAuth = async () => {
    try {
      setLoading(true);
      
      // Check if user data exists in localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        
        // If we have a token, verify it's still valid by fetching current user
        if (userData.access_token) {
          try {
            const currentUser = await getCurrentUser();
            
            // Create properly structured user data
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
              auth_provider: currentUser.auth_provider
            };
            
            setUser(completeUserData);
            setIsAuthenticated(true);
            
            // Update localStorage with complete user data
            localStorage.setItem('user', JSON.stringify(completeUserData));
          } catch (error) {
            // Token is invalid or expired, clear stored data
            console.log('Token expired or invalid, clearing stored data');
            localStorage.removeItem('user');
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          // No token, clear stored data
          localStorage.removeItem('user');
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
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
            auth_provider: currentUser.auth_provider
          };
          
          setUser(completeUserData);
          setIsAuthenticated(true);
          
          // Update localStorage with complete user data
          localStorage.setItem('user', JSON.stringify(completeUserData));
          
          return { success: true, user: completeUserData };
        } catch (profileError) {
          // Even if profile fetch fails, we still have basic auth
          setUser(result);
          setIsAuthenticated(true);
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
      // Clear user data from state
      setUser(null);
      setIsAuthenticated(false);
      
      // Clear user data from localStorage
      localStorage.removeItem('user');
      
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
      const updatedUser = { ...user, ...currentUser };
      
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
    setIsAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;