/**
 * Service Layer Index
 * 
 * This file exports all services used in the application.
 * It provides a centralized access point for all API services.
 */

// Export the main API service
export { default as apiService, ApiError, HttpClient } from './api.js';

// Export individual service methods for convenience
export {
  // Authentication
  login,
  register,
  adminLogin,
  logout,
  refreshToken,
  getCurrentUser,
  
  // Books
  getBooks,
  getBook,
  getBookBySlug,
  createBook,
  updateBook,
  deleteBook,
  uploadBookCover,
  searchBooks,
  getFeaturedBooks,
  getNewArrivals,
  getBestSellers,
  
  // Categories
  getCategories,
  getCategory,
  getBooksByCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  
  // Authors
  getAuthors,
  getAuthor,
  getBooksByAuthor,
  createAuthor,
  updateAuthor,
  deleteAuthor,
  
  // Cart
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  
  // Wishlist
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  
  // Orders
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  getAllOrders,
  
  // Users
  getUserProfile,
  updateUserProfile,
  changePassword,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  
  // Reviews
  getBookReviews,
  createReview,
  updateReview,
  deleteReview,
  
  // Analytics
  getDashboardAnalytics,
  getSalesAnalytics,
  getBookAnalytics,
  getUserAnalytics,
  
  // Utility
  healthCheck,
  getVersion,
  uploadImage,
} from './api.js';

// Default export is the main API service
export { default } from './api.js';