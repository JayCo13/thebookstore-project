/**
 * Network utility functions for handling connectivity and network errors
 */

class NetworkUtils {
  constructor() {
    this.isOnline = navigator.onLine;
    this.connectivityListeners = [];
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyConnectivityChange(true);
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyConnectivityChange(false);
    });
  }

  /**
   * Check if the browser is online
   */
  isConnected() {
    return this.isOnline;
  }

  /**
   * Add a listener for connectivity changes
   */
  addConnectivityListener(callback) {
    this.connectivityListeners.push(callback);
    return () => {
      this.connectivityListeners = this.connectivityListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners of connectivity changes
   */
  notifyConnectivityChange(isOnline) {
    this.connectivityListeners.forEach(callback => {
      try {
        callback(isOnline);
      } catch (error) {
        // Only log in development mode to reduce console spam
        if (process.env.NODE_ENV === 'development') {
          console.error('Error in connectivity listener:', error);
        }
      }
    });
  }

  /**
   * Test actual connectivity by making a lightweight request
   */
  async testConnectivity(timeout = 5000) {
    if (!this.isOnline) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch('/api/health', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Determine if an error is network-related
   */
  isNetworkError(error) {
    if (!error) return false;

    // Check for common network error indicators
    const networkErrorIndicators = [
      'NetworkError',
      'Failed to fetch',
      'Network request failed',
      'ERR_NETWORK',
      'ERR_INTERNET_DISCONNECTED',
      'ERR_CONNECTION_REFUSED',
      'ERR_CONNECTION_TIMED_OUT',
      'NETWORK_ERROR',
      'AbortError'
    ];

    const errorMessage = error.message || error.toString();
    const errorCode = error.code || error.name;

    // Check error message and code
    const isNetworkRelated = networkErrorIndicators.some(indicator => 
      errorMessage.includes(indicator) || errorCode.includes(indicator)
    );

    // Check for specific status codes that might indicate network issues
    const networkStatusCodes = [0, 408, 502, 503, 504, 522, 524];
    const hasNetworkStatusCode = networkStatusCodes.includes(error.status);

    // Check if browser is offline
    const isOffline = !this.isOnline;

    return isNetworkRelated || hasNetworkStatusCode || isOffline;
  }

  /**
   * Get a user-friendly error message for network errors
   */
  getNetworkErrorMessage(error) {
    if (!this.isOnline) {
      return 'You appear to be offline. Please check your internet connection.';
    }

    if (error.status === 0) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }

    if (error.status >= 500) {
      return 'Server is temporarily unavailable. Please try again in a moment.';
    }

    if (error.status === 408) {
      return 'Request timed out. Please check your connection and try again.';
    }

    return 'Network error occurred. Please check your connection and try again.';
  }

  /**
   * Wait for network connectivity to be restored
   */
  async waitForConnectivity(maxWaitTime = 30000) {
    if (this.isOnline) {
      return true;
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkConnectivity = () => {
        if (this.isOnline) {
          resolve(true);
          return;
        }

        if (Date.now() - startTime >= maxWaitTime) {
          resolve(false);
          return;
        }

        setTimeout(checkConnectivity, 1000);
      };

      // Listen for online event
      const onlineHandler = () => {
        window.removeEventListener('online', onlineHandler);
        resolve(true);
      };
      window.addEventListener('online', onlineHandler);

      // Start checking
      checkConnectivity();
    });
  }

  /**
   * Retry a function with exponential backoff for network errors
   */
  async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // If it's not a network error, don't retry
        if (!this.isNetworkError(error)) {
          throw error;
        }

        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          throw error;
        }

        // Wait for connectivity if offline
        if (!this.isOnline) {
          const connected = await this.waitForConnectivity(10000);
          if (!connected) {
            throw new Error('Network connectivity could not be restored');
          }
        }

        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Create a fetch wrapper with automatic retry for network errors
   */
  createRetryFetch(maxRetries = 3, baseDelay = 1000) {
    return async (url, options = {}) => {
      return this.retryWithBackoff(
        () => fetch(url, options),
        maxRetries,
        baseDelay
      );
    };
  }
}

// Create a singleton instance
const networkUtils = new NetworkUtils();

export default networkUtils;