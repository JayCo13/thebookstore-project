/**
 * Service Layer Index
 *
 * Centralized access point for the API service. Re-exports EVERYTHING from
 * api.js (which, post-cutover, re-exports the Supabase-backed apiSupabase.js)
 * so any function the app imports from '../../service' is available — no more
 * hand-maintained allow-list that silently drops functions.
 */

// Re-export the default instance under the `apiService` name.
export { default as apiService } from './api.js';

// Re-export ALL named exports (login, getBookCoverUrl, notifications, stationery,
// addresses, payments, uploads, ApiError, HttpClient, ... everything).
export * from './api.js';

// Default export is the main API service.
export { default } from './api.js';
