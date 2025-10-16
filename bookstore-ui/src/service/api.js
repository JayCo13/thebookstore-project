/**
 * API Service for FastAPI Backend
 * Base URL: http://localhost:8000
 * 
 * This service provides a comprehensive interface for communicating with the FastAPI backend.
 * It includes error handling, request/response interceptors, and endpoints for all bookstore operations.
 */

// Base configuration
const BASE_URL = 'http://localhost:8000';
const API_VERSION = '/api/v1';
const FULL_BASE_URL = `${BASE_URL}${API_VERSION}`;

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * HTTP Client with interceptors and error handling
 */
class HttpClient {
  constructor(baseURL = FULL_BASE_URL) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get authorization token from localStorage
   */
  getAuthToken() {
    return localStorage.getItem('authToken');
  }

  /**
   * Set authorization token
   */
  setAuthToken(token) {
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  /**
   * Get headers with authorization if available
   */
  getHeaders(customHeaders = {}) {
    const headers = { ...this.defaultHeaders, ...customHeaders };
    const token = this.getAuthToken();
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    return headers;
  }

  /**
   * Handle response and errors
   */
  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    let data = null;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage = data?.detail || data?.message || `HTTP Error: ${response.status}`;
      throw new ApiError(errorMessage, response.status, data);
    }

    return data;
  }

  /**
   * Generic request method
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(options.headers),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      return await this.handleResponse(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network or other errors
      throw new ApiError(
        error.message || 'Network error occurred',
        0,
        { originalError: error }
      );
    }
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request(url, {
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post(endpoint, data = null) {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data = null) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : null,
    });
  }

  /**
   * PATCH request
   */
  async patch(endpoint, data = null) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : null,
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * Upload file
   */
  async upload(endpoint, file, additionalData = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add additional data to form
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });

    return this.request(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData, let browser set it with boundary
        Authorization: this.getAuthToken() ? `Bearer ${this.getAuthToken()}` : undefined,
      },
    });
  }
}

// Create HTTP client instance
const httpClient = new HttpClient();

/**
 * API Service with all endpoints
 */
class ApiService {
  constructor(client) {
    this.client = client;
  }

  // ==================== Authentication ====================
  
  /**
   * User login
   */
  async login(credentials) {
    const response = await this.client.post('/auth/login', credentials);
    if (response.access_token) {
      this.client.setAuthToken(response.access_token);
    }
    return response;
  }

  /**
   * User registration
   */
  async register(userData) {
    return this.client.post('/auth/register', userData);
  }

  /**
   * Admin login
   */
  async adminLogin(credentials) {
    const response = await this.client.post('/auth/admin/login', credentials);
    if (response.access_token) {
      this.client.setAuthToken(response.access_token);
    }
    return response;
  }

  /**
   * Logout
   */
  async logout() {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.client.setAuthToken(null);
    }
  }

  /**
   * Refresh token
   */
  async refreshToken() {
    const response = await this.client.post('/auth/refresh');
    if (response.access_token) {
      this.client.setAuthToken(response.access_token);
    }
    return response;
  }

  /**
   * Get current user profile
   */
  async getCurrentUser() {
    return this.client.get('/auth/me');
  }

  /**
   * Forgot password - request password reset
   */
  async forgotPassword(email) {
    return this.client.post('/auth/forgot-password', { email });
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(token, newPassword) {
    return this.client.post('/auth/reset-password', {
      token,
      new_password: newPassword
    });
  }

  /**
   * Activate user account
   */
  async activateAccount(email) {
    return this.client.post(`/auth/activate/${email}`);
  }

  /**
   * Initialize system with default roles and admin user
   */
  async initializeSystem() {
    return this.client.post('/auth/init');
  }

  /**
   * Verify email address using verification token
   */
  async verifyEmail(token) {
    return this.client.get(`/auth/verify-email/${token}`);
  }

  /**
   * Get Google OAuth authorization URL
   */
  async getGoogleAuthUrl() {
    return this.client.get('/auth/google/login');
  }

  /**
   * Handle Google OAuth callback - this is handled by backend redirect
   * This method is for extracting token from URL after redirect
   */
  handleGoogleCallback(token) {
    if (token) {
      this.client.setAuthToken(token);
      return { access_token: token, token_type: 'bearer' };
    }
    throw new Error('No token provided');
  }

  // ==================== Books ====================

  /**
   * Get all books with pagination and filters
   */
  async getBooks(params = {}) {
    return this.client.get('/books', params);
  }

  /**
   * Get book by ID
   */
  async getBook(bookId) {
    return this.client.get(`/books/${bookId}`);
  }

  /**
   * Get book by slug
   */
  async getBookBySlug(slug) {
    return this.client.get(`/books/slug/${slug}`);
  }

  /**
   * Create new book (Admin only)
   */
  async createBook(bookData) {
    return this.client.post('/books', bookData);
  }

  /**
   * Update book (Admin only)
   */
  async updateBook(bookId, bookData) {
    return this.client.put(`/books/${bookId}`, bookData);
  }

  /**
   * Delete book (Admin only)
   */
  async deleteBook(bookId) {
    return this.client.delete(`/books/${bookId}`);
  }

  /**
   * Upload book cover image
   */
  async uploadBookCover(bookId, imageFile) {
    return this.client.upload(`/books/${bookId}/cover`, imageFile);
  }

  /**
   * Search books
   */
  async searchBooks(query, params = {}) {
    return this.client.get('/books/search', { q: query, ...params });
  }

  /**
   * Get featured books
   */
  async getFeaturedBooks() {
    return this.client.get('/books/featured');
  }

  /**
   * Get new arrivals
   */
  async getNewArrivals() {
    return this.client.get('/books/new-arrivals');
  }

  /**
   * Get best sellers
   */
  async getBestSellers() {
    return this.client.get('/books/bestsellers');
  }

  /**
   * Get popular books based on order count
   */
  async getPopularBooks(limit = 10) {
    return this.client.get('/books/popular', { limit });
  }

  /**
   * Upload book cover image (Admin only)
   */
  async uploadBookImage(bookId, imageFile) {
    return this.client.upload(`/books/${bookId}/image`, imageFile);
  }

  /**
   * Get all categories from books module
   */
  async getBooksCategories() {
    return this.client.get('/books/categories/');
  }

  /**
   * Get all authors from books module
   */
  async getBooksAuthors() {
    return this.client.get('/books/authors/');
  }

  // ==================== Categories ====================

  /**
   * Get all categories
   */
  async getCategories() {
    return this.client.get('/categories');
  }

  /**
   * Get category by ID
   */
  async getCategory(categoryId) {
    return this.client.get(`/categories/${categoryId}`);
  }

  /**
   * Get books by category
   */
  async getBooksByCategory(categoryId, params = {}) {
    return this.client.get(`/categories/${categoryId}/books`, params);
  }

  /**
   * Create category (Admin only)
   */
  async createCategory(categoryData) {
    return this.client.post('/categories', categoryData);
  }

  /**
   * Update category (Admin only)
   */
  async updateCategory(categoryId, categoryData) {
    return this.client.put(`/categories/${categoryId}`, categoryData);
  }

  /**
   * Delete category (Admin only)
   */
  async deleteCategory(categoryId) {
    return this.client.delete(`/categories/${categoryId}`);
  }

  // ==================== Authors ====================

  /**
   * Get all authors
   */
  async getAuthors() {
    return this.client.get('/authors');
  }

  /**
   * Get author by ID
   */
  async getAuthor(authorId) {
    return this.client.get(`/authors/${authorId}`);
  }

  /**
   * Get books by author
   */
  async getBooksByAuthor(authorId, params = {}) {
    return this.client.get(`/authors/${authorId}/books`, params);
  }

  /**
   * Create author (Admin only)
   */
  async createAuthor(authorData) {
    return this.client.post('/authors', authorData);
  }

  /**
   * Update author (Admin only)
   */
  async updateAuthor(authorId, authorData) {
    return this.client.put(`/authors/${authorId}`, authorData);
  }

  /**
   * Delete author (Admin only)
   */
  async deleteAuthor(authorId) {
    return this.client.delete(`/authors/${authorId}`);
  }

  // ==================== Cart ====================

  /**
   * Get user's cart
   */
  async getCart() {
    return this.client.get('/cart');
  }

  /**
   * Add item to cart
   */
  async addToCart(bookId, quantity = 1) {
    return this.client.post('/cart/items', { book_id: bookId, quantity });
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(itemId, quantity) {
    return this.client.put(`/cart/items/${itemId}`, { quantity });
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(itemId) {
    return this.client.delete(`/cart/items/${itemId}`);
  }

  /**
   * Clear cart
   */
  async clearCart() {
    return this.client.delete('/cart');
  }

  // ==================== Wishlist ====================

  /**
   * Get user's wishlist
   */
  async getWishlist() {
    return this.client.get('/orders/wishlist/');
  }

  /**
   * Add item to wishlist
   */
  async addToWishlist(bookId) {
    return this.client.post('/orders/wishlist/', { book_id: bookId });
  }

  /**
   * Remove item from wishlist by book ID
   */
  async removeFromWishlist(bookId) {
    return this.client.delete(`/orders/wishlist/${bookId}`);
  }

  /**
   * Clear wishlist
   */
  async clearWishlist() {
    return this.client.delete('/orders/wishlist/');
  }

  // ==================== Orders ====================

  /**
   * Get user's orders
   */
  async getOrders(params = {}) {
    return this.client.get('/orders', params);
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId) {
    return this.client.get(`/orders/${orderId}`);
  }

  /**
   * Create new order
   */
  async createOrder(orderData) {
    return this.client.post('/orders', orderData);
  }

  /**
   * Update order status (Admin only)
   */
  async updateOrderStatus(orderId, status) {
    return this.client.put(`/orders/${orderId}/status`, { status });
  }

  /**
   * Cancel order (Users can cancel their own, admins can cancel any)
   */
  async cancelOrder(orderId) {
    return this.client.delete(`/orders/${orderId}`);
  }

  /**
   * Get all orders (Admin only)
   */
  async getAllOrders(params = {}) {
    return this.client.get('/admin/orders', params);
  }

  /**
   * Get all orders (Admin only) - alternative endpoint
   */
  async getAllOrdersAdmin(params = {}) {
    return this.client.get('/orders/all', params);
  }

  // ==================== Users ====================

  /**
   * Get user profile
   */
  async getUserProfile() {
    return this.client.get('/users/profile');
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userData) {
    return this.client.put('/users/profile', userData);
  }

  /**
   * Change password
   */
  async changePassword(passwordData) {
    return this.client.put('/users/password', passwordData);
  }

  /**
   * Get all users (Admin only)
   */
  async getAllUsers(params = {}) {
    return this.client.get('/admin/users', params);
  }

  /**
   * Get user by ID (Admin only)
   */
  async getUserById(userId) {
    return this.client.get(`/admin/users/${userId}`);
  }

  /**
   * Update user (Admin only)
   */
  async updateUser(userId, userData) {
    return this.client.put(`/admin/users/${userId}`, userData);
  }

  /**
   * Delete user (Admin only)
   */
  async deleteUser(userId) {
    return this.client.delete(`/admin/users/${userId}`);
  }

  // ==================== Addresses ====================

  /**
   * Get all user addresses
   */
  async getAddresses() {
    return this.client.get('/addresses');
  }

  /**
   * Get address by ID
   */
  async getAddress(addressId) {
    return this.client.get(`/addresses/${addressId}`);
  }

  /**
   * Create new address
   */
  async createAddress(addressData) {
    return this.client.post('/addresses', addressData);
  }

  /**
   * Update address
   */
  async updateAddress(addressId, addressData) {
    return this.client.put(`/addresses/${addressId}`, addressData);
  }

  /**
   * Delete address
   */
  async deleteAddress(addressId) {
    return this.client.delete(`/addresses/${addressId}`);
  }

  /**
   * Set address as default
   */
  async setDefaultAddress(addressId) {
    return this.client.post(`/addresses/${addressId}/set-default`);
  }

  // ==================== Reviews ====================

  /**
   * Get reviews for a book
   */
  async getBookReviews(bookId, params = {}) {
    return this.client.get(`/books/${bookId}/reviews`, params);
  }

  /**
   * Create review
   */
  async createReview(bookId, reviewData) {
    return this.client.post(`/books/${bookId}/reviews`, reviewData);
  }

  /**
   * Update review
   */
  async updateReview(reviewId, reviewData) {
    return this.client.put(`/reviews/${reviewId}`, reviewData);
  }

  /**
   * Delete review
   */
  async deleteReview(reviewId) {
    return this.client.delete(`/reviews/${reviewId}`);
  }

  // ==================== Analytics (Admin) ====================

  /**
   * Get dashboard analytics
   */
  async getDashboardAnalytics() {
    return this.client.get('/admin/analytics/dashboard');
  }

  /**
   * Get sales analytics
   */
  async getSalesAnalytics(params = {}) {
    return this.client.get('/admin/analytics/sales', params);
  }

  /**
   * Get book analytics
   */
  async getBookAnalytics(params = {}) {
    return this.client.get('/admin/analytics/books', params);
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(params = {}) {
    return this.client.get('/admin/analytics/users', params);
  }

  // ==================== Utility Methods ====================

  /**
   * Health check endpoint
   */
  async healthCheck() {
    // Use base URL without API prefix for health endpoint
    const baseUrl = this.client.baseURL.replace('/api/v1', '');
    const url = `${baseUrl}/health`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.client.getHeaders()
    });
    
    return this.client.handleResponse(response);
  }

  /**
   * Root endpoint - API information
   */
  async getApiInfo() {
    // Use base URL without API prefix for root endpoint
    const baseUrl = this.client.baseURL.replace('/api/v1', '');
    
    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: this.client.getHeaders()
    });
    
    return this.client.handleResponse(response);
  }

  /**
   * Get API version
   */
  async getVersion() {
    return this.client.get('/version');
  }

  /**
   * Upload image
   */
  async uploadImage(imageFile, type = 'general') {
    return this.client.upload('/upload/image', imageFile, { type });
  }

  // ==================== Static Files ====================

  /**
   * Get static file URL
   */
  getStaticFileUrl(filePath) {
    const baseUrl = this.client.baseURL.replace('/api/v1', '');
    return `${baseUrl}/static/${filePath}`;
  }

  /**
   * Get book cover image URL
   */
  getBookCoverUrl(imageUrl) {
    if (!imageUrl) return null;
    
    // If it's already a full URL, return as is
    if (imageUrl.startsWith('http')) return imageUrl;
    
    // If it starts with /static/, construct full URL
    if (imageUrl.startsWith('/static/')) {
      const baseUrl = this.client.baseURL.replace('/api/v1', '');
      return `${baseUrl}${imageUrl}`;
    }
    
    // Otherwise, assume it's a relative path under /static/
    return this.getStaticFileUrl(imageUrl);
  }
}

// Create and export API service instance
const apiService = new ApiService(httpClient);

// Export both the service and error class
export { apiService as default, ApiError, HttpClient };

// Export individual service methods with proper binding
export const login = (...args) => apiService.login(...args);
export const register = (...args) => apiService.register(...args);
export const adminLogin = (...args) => apiService.adminLogin(...args);
export const logout = (...args) => apiService.logout(...args);
export const refreshToken = (...args) => apiService.refreshToken(...args);
export const getCurrentUser = (...args) => apiService.getCurrentUser(...args);
export const forgotPassword = (...args) => apiService.forgotPassword(...args);
export const resetPassword = (...args) => apiService.resetPassword(...args);
export const activateAccount = (...args) => apiService.activateAccount(...args);
export const initializeSystem = (...args) => apiService.initializeSystem(...args);
export const verifyEmail = (...args) => apiService.verifyEmail(...args);
export const getGoogleAuthUrl = (...args) => apiService.getGoogleAuthUrl(...args);
export const handleGoogleCallback = (...args) => apiService.handleGoogleCallback(...args);

// Books
export const getBooks = (...args) => apiService.getBooks(...args);
export const getBook = (...args) => apiService.getBook(...args);
export const getBookBySlug = (...args) => apiService.getBookBySlug(...args);
export const createBook = (...args) => apiService.createBook(...args);
export const updateBook = (...args) => apiService.updateBook(...args);
export const deleteBook = (...args) => apiService.deleteBook(...args);
export const uploadBookCover = (...args) => apiService.uploadBookCover(...args);
export const searchBooks = (...args) => apiService.searchBooks(...args);
export const getFeaturedBooks = (...args) => apiService.getFeaturedBooks(...args);
export const getNewArrivals = (...args) => apiService.getNewArrivals(...args);
export const getBestSellers = (...args) => apiService.getBestSellers(...args);
export const getPopularBooks = (...args) => apiService.getPopularBooks(...args);
export const uploadBookImage = (...args) => apiService.uploadBookImage(...args);
export const getBooksCategories = (...args) => apiService.getBooksCategories(...args);
export const getBooksAuthors = (...args) => apiService.getBooksAuthors(...args);

// Categories
export const getCategories = (...args) => apiService.getCategories(...args);
export const getCategory = (...args) => apiService.getCategory(...args);
export const getBooksByCategory = (...args) => apiService.getBooksByCategory(...args);
export const createCategory = (...args) => apiService.createCategory(...args);
export const updateCategory = (...args) => apiService.updateCategory(...args);
export const deleteCategory = (...args) => apiService.deleteCategory(...args);

// Authors
export const getAuthors = (...args) => apiService.getAuthors(...args);
export const getAuthor = (...args) => apiService.getAuthor(...args);
export const getBooksByAuthor = (...args) => apiService.getBooksByAuthor(...args);
export const createAuthor = (...args) => apiService.createAuthor(...args);
export const updateAuthor = (...args) => apiService.updateAuthor(...args);
export const deleteAuthor = (...args) => apiService.deleteAuthor(...args);

// Cart
export const getCart = (...args) => apiService.getCart(...args);
export const addToCart = (...args) => apiService.addToCart(...args);
export const updateCartItem = (...args) => apiService.updateCartItem(...args);
export const removeFromCart = (...args) => apiService.removeFromCart(...args);
export const clearCart = (...args) => apiService.clearCart(...args);

// Wishlist
export const getWishlist = (...args) => apiService.getWishlist(...args);
export const addToWishlist = (...args) => apiService.addToWishlist(...args);
export const removeFromWishlist = (...args) => apiService.removeFromWishlist(...args);
export const clearWishlist = (...args) => apiService.clearWishlist(...args);

// Orders
export const getOrders = (...args) => apiService.getOrders(...args);
export const getOrder = (...args) => apiService.getOrder(...args);
export const createOrder = (...args) => apiService.createOrder(...args);
export const updateOrderStatus = (...args) => apiService.updateOrderStatus(...args);
export const cancelOrder = (...args) => apiService.cancelOrder(...args);
export const getAllOrders = (...args) => apiService.getAllOrders(...args);
export const getAllOrdersAdmin = (...args) => apiService.getAllOrdersAdmin(...args);

// Users
export const getUserProfile = (...args) => apiService.getUserProfile(...args);
export const updateUserProfile = (...args) => apiService.updateUserProfile(...args);
export const changePassword = (...args) => apiService.changePassword(...args);
export const getAllUsers = (...args) => apiService.getAllUsers(...args);
export const getUserById = (...args) => apiService.getUserById(...args);
export const updateUser = (...args) => apiService.updateUser(...args);
export const deleteUser = (...args) => apiService.deleteUser(...args);

// Addresses
export const getAddresses = (...args) => apiService.getAddresses(...args);
export const getAddress = (...args) => apiService.getAddress(...args);
export const createAddress = (...args) => apiService.createAddress(...args);
export const updateAddress = (...args) => apiService.updateAddress(...args);
export const deleteAddress = (...args) => apiService.deleteAddress(...args);
export const setDefaultAddress = (...args) => apiService.setDefaultAddress(...args);

// Reviews
export const getBookReviews = (...args) => apiService.getBookReviews(...args);
export const createReview = (...args) => apiService.createReview(...args);
export const updateReview = (...args) => apiService.updateReview(...args);
export const deleteReview = (...args) => apiService.deleteReview(...args);

// Analytics
export const getDashboardAnalytics = (...args) => apiService.getDashboardAnalytics(...args);
export const getSalesAnalytics = (...args) => apiService.getSalesAnalytics(...args);
export const getBookAnalytics = (...args) => apiService.getBookAnalytics(...args);
export const getUserAnalytics = (...args) => apiService.getUserAnalytics(...args);

// Utility
export const healthCheck = (...args) => apiService.healthCheck(...args);
export const getVersion = (...args) => apiService.getVersion(...args);
export const uploadImage = (...args) => apiService.uploadImage(...args);
export const getApiInfo = (...args) => apiService.getApiInfo(...args);
export const getStaticFileUrl = (...args) => apiService.getStaticFileUrl(...args);
export const getBookCoverUrl = (...args) => apiService.getBookCoverUrl(...args);