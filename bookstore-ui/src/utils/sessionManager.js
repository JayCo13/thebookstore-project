/**
 * Session Management Utility
 * Handles automatic token refresh, session persistence, and authentication state management
 */

import { refreshToken as apiRefreshToken } from '../service';
import networkUtils from './networkUtils';

class SessionManager {
  constructor() {
    this.refreshTimer = null;
    this.isRefreshing = false;
    this.refreshPromise = null;
    this.listeners = new Set();
    this.logLevel = 'info'; // 'debug', 'info', 'warn', 'error'
    this.isInternalOperation = false; // Flag to prevent infinite recursion

    // Token refresh settings
    this.REFRESH_THRESHOLD_MINUTES = 5; // Refresh 5 minutes before expiration
    this.TOKEN_EXPIRY_MINUTES = 30; // Default token expiry from backend
    this.MAX_RETRY_ATTEMPTS = 3;
    this.RETRY_DELAY_MS = 1000;

    this.log('SessionManager initialized', 'info');
  }

  /**
   * Enhanced logging with session context
   */
  log(message, level = 'info', data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      sessionId: this.getSessionId(),
      data
    };

    // Only log errors and warnings to console to reduce noise
    const shouldLogToConsole = level === 'error' || level === 'warn';

    if (shouldLogToConsole) {
      const logMethod = console[level] || console.log;
      if (data) {
        logMethod(`[SessionManager ${timestamp}] ${message}`, data);
      } else {
        logMethod(`[SessionManager ${timestamp}] ${message}`);
      }
    }

    // Store critical logs in localStorage for debugging
    if (level === 'error' || level === 'warn') {
      this.storeCriticalLog(logEntry);
    }

    // Only notify listeners if not in an internal operation to prevent infinite recursion
    if (!this.isInternalOperation) {
      this.notifyListeners('log', logEntry);
    }
  }

  /**
   * Store critical logs for debugging
   */
  storeCriticalLog(logEntry) {
    try {
      const logs = JSON.parse(localStorage.getItem('session_logs') || '[]');
      logs.push(logEntry);

      // Keep only last 50 critical logs
      if (logs.length > 50) {
        logs.splice(0, logs.length - 50);
      }

      localStorage.setItem('session_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to store critical log:', error);
    }
  }

  /**
   * Get session ID for tracking
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Add event listener for session events
   */
  addEventListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of session events
   */
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback({ event, data, timestamp: new Date().toISOString() });
      } catch (error) {
        console.error('Session listener error:', error);
      }
    });
  }

  /**
   * Get user data from localStorage with validation
   */
  getUserData() {
    // Set flag to prevent infinite recursion
    this.isInternalOperation = true;

    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        this.log('No user data found in localStorage', 'debug');
        return null;
      }

      const userData = JSON.parse(userStr);

      // Validate required fields
      if (!userData.access_token || !userData.email) {
        this.log('Invalid user data structure', 'warn', userData);
        return null;
      }

      return userData;
    } catch (error) {
      this.log('Error parsing user data from localStorage', 'error', error);
      return null;
    } finally {
      // Always reset the flag
      this.isInternalOperation = false;
    }
  }

  /**
   * Check if token is expired or will expire soon
   */
  isTokenExpiringSoon(userData) {
    if (!userData || !userData.access_token) {
      return true;
    }

    // Set flag to prevent infinite recursion
    this.isInternalOperation = true;

    try {
      // Decode JWT payload (without verification - just for expiry check)
      const payload = JSON.parse(atob(userData.access_token.split('.')[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiry = expiryTime - currentTime;
      const thresholdTime = this.REFRESH_THRESHOLD_MINUTES * 60 * 1000;

      this.log(`Token expiry check: ${Math.round(timeUntilExpiry / 1000 / 60)} minutes remaining`, 'debug');

      return timeUntilExpiry <= thresholdTime;
    } catch (error) {
      this.log('Error checking token expiry', 'warn', error);
      return true; // Assume expired if we can't parse
    } finally {
      // Always reset the flag
      this.isInternalOperation = false;
    }
  }

  /**
   * Refresh token with retry logic
   */
  async refreshTokenWithRetry(attempt = 1) {
    try {
      this.log(`Attempting token refresh (attempt ${attempt}/${this.MAX_RETRY_ATTEMPTS})`, 'info');

      // Check network connectivity before attempting refresh
      if (!networkUtils.isConnected()) {
        this.log('Device is offline, waiting for connectivity', 'warn');
        const connected = await networkUtils.waitForConnectivity(10000);
        if (!connected) {
          throw new Error('Network connectivity could not be restored');
        }
        this.log('Network connectivity restored, proceeding with refresh', 'info');
      }

      const response = await apiRefreshToken();

      if (response && response.access_token) {
        // Update user data with new token
        const userData = this.getUserData();
        if (userData) {
          userData.access_token = response.access_token;
          userData.token_type = response.token_type || 'bearer';
          localStorage.setItem('user', JSON.stringify(userData));

          // CRITICAL FIX: Update the HttpClient's token cache to ensure API calls use the new token
          // Import the apiService and update its HttpClient token
          const apiModule = await import('../service/api.js');
          if (apiModule.default && apiModule.default.client && apiModule.default.client.setAuthToken) {
            apiModule.default.client.setAuthToken(response.access_token);
          }

          this.log('Token refreshed successfully', 'info');
          this.notifyListeners('tokenRefreshed', { token: response.access_token });

          return response;
        }
      }

      throw new Error('Invalid refresh response');
    } catch (error) {
      this.log(`Token refresh attempt ${attempt} failed`, 'warn', error);

      // Check if this is a network error
      const isNetworkError = networkUtils.isNetworkError(error);

      if (attempt < this.MAX_RETRY_ATTEMPTS) {
        // For network errors, use longer delays and wait for connectivity
        if (isNetworkError) {
          this.log('Network error detected during token refresh', 'warn');

          if (!networkUtils.isConnected()) {
            this.log('Device is offline, waiting for connectivity before retry', 'info');
            const connected = await networkUtils.waitForConnectivity(15000);
            if (!connected) {
              this.log('Network connectivity could not be restored, aborting refresh', 'error');
              throw new Error('Network connectivity could not be restored');
            }
          }

          // Longer delay for network errors
          const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1) * 2;
          this.log(`Network error - retrying token refresh in ${delay}ms`, 'info');
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Standard exponential backoff for non-network errors
          const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          this.log(`Retrying token refresh in ${delay}ms`, 'info');
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        return this.refreshTokenWithRetry(attempt + 1);
      }

      // Log appropriate error message based on error type
      if (isNetworkError) {
        this.log(`Token refresh failed after all attempts due to network issues: ${networkUtils.getNetworkErrorMessage(error)}`, 'error', error);
      } else {
        this.log('Token refresh failed after all attempts', 'error', error);
      }

      throw error;
    }
  }

  /**
   * Automatic token refresh
   */
  async autoRefreshToken() {
    if (this.isRefreshing) {
      this.log('Token refresh already in progress, waiting...', 'debug');
      return this.refreshPromise;
    }

    const userData = this.getUserData();
    if (!userData) {
      this.log('No user data available for token refresh', 'debug');
      return null;
    }

    if (!this.isTokenExpiringSoon(userData)) {
      this.log('Token not expiring soon, skipping refresh', 'debug');
      return userData;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.refreshTokenWithRetry()
      .then(response => {
        this.scheduleNextRefresh();
        return response;
      })
      .catch(error => {
        this.log('Auto refresh failed, user may need to re-login', 'error', error);
        this.notifyListeners('refreshFailed', error);
        throw error;
      })
      .finally(() => {
        this.isRefreshing = false;
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  /**
   * Schedule the next token refresh
   */
  scheduleNextRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const userData = this.getUserData();
    if (!userData) {
      return;
    }

    try {
      const payload = JSON.parse(atob(userData.access_token.split('.')[1]));
      const expiryTime = payload.exp * 1000;
      const currentTime = Date.now();
      const timeUntilRefresh = expiryTime - currentTime - (this.REFRESH_THRESHOLD_MINUTES * 60 * 1000);

      if (timeUntilRefresh > 0) {
        this.log(`Next token refresh scheduled in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`, 'info');

        this.refreshTimer = setTimeout(() => {
          this.autoRefreshToken().catch(error => {
            this.log('Scheduled token refresh failed', 'error', error);
          });
        }, timeUntilRefresh);
      } else {
        this.log('Token already expired, immediate refresh needed', 'warn');
        this.autoRefreshToken().catch(error => {
          this.log('Immediate token refresh failed', 'error', error);
        });
      }
    } catch (error) {
      this.log('Error scheduling next refresh', 'error', error);
    }
  }

  /**
   * Initialize session management
   */
  initialize() {
    this.log('Initializing session management', 'info');

    // Check for existing session
    const userData = this.getUserData();
    if (userData) {
      this.log('Existing session found, checking token status', 'info');
      this.scheduleNextRefresh();

      // Immediate refresh if token is expiring soon
      if (this.isTokenExpiringSoon(userData)) {
        this.log('Token expiring soon, triggering immediate refresh', 'info');
        this.autoRefreshToken().catch(error => {
          this.log('Initial token refresh failed', 'error', error);
        });
      }
    } else {
      this.log('No existing session found', 'info');
    }

    // Listen for storage changes (multi-tab support)
    window.addEventListener('storage', (event) => {
      if (event.key === 'user') {
        this.log('User data changed in another tab', 'info');
        this.scheduleNextRefresh();
        this.notifyListeners('sessionChanged', { newValue: event.newValue });
      }
    });

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.log('Page became visible, checking session status', 'debug');
        const userData = this.getUserData();
        if (userData && this.isTokenExpiringSoon(userData)) {
          this.autoRefreshToken().catch(error => {
            this.log('Visibility change token refresh failed', 'error', error);
          });
        }
      }
    });

    // Listen for network connectivity changes
    networkUtils.addConnectivityListener((isOnline) => {
      this.log(`Network connectivity changed: ${isOnline ? 'online' : 'offline'}`, 'info');

      if (isOnline) {
        // When coming back online, check if we need to refresh token
        const userData = this.getUserData();
        if (userData && this.isTokenExpiringSoon(userData)) {
          this.log('Back online and token expiring soon, triggering refresh', 'info');
          this.autoRefreshToken().catch(error => {
            this.log('Online recovery token refresh failed', 'error', error);
          });
        }
      } else {
        this.log('Device went offline, token refresh will be paused', 'warn');
      }
    });
  }

  /**
   * Clear session data and timers
   */
  clearSession() {
    this.log('Clearing session data', 'info');

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.isRefreshing = false;
    this.refreshPromise = null;

    // Clear storage
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('session_id');

    this.notifyListeners('sessionCleared', {});
  }

  /**
   * Get session logs for debugging
   */
  getSessionLogs() {
    try {
      return JSON.parse(localStorage.getItem('session_logs') || '[]');
    } catch (error) {
      this.log('Error retrieving session logs', 'error', error);
      return [];
    }
  }

  /**
   * Clear session logs
   */
  clearSessionLogs() {
    localStorage.removeItem('session_logs');
    this.log('Session logs cleared', 'info');
  }

  /**
   * Get session status for debugging
   */
  getSessionStatus() {
    const userData = this.getUserData();
    return {
      hasSession: !!userData,
      isRefreshing: this.isRefreshing,
      tokenExpiringSoon: userData ? this.isTokenExpiringSoon(userData) : null,
      sessionId: this.getSessionId(),
      refreshTimerActive: !!this.refreshTimer,
      listenerCount: this.listeners.size
    };
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

export default sessionManager;