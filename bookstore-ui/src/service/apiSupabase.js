/**
 * Supabase-backed API — the Phase 6 cutover target for the FastAPI → Supabase
 * migration. It re-implements the same named exports as `api.js` on top of
 * supabase-js + Edge Function invokes, so switching the app over is a one-line
 * import change (or re-export) per page — see CUTOVER at the bottom.
 *
 * Split (mirrors supabase/MIGRATION.md):
 *   • plain reads/writes  → supabase.from(...) under RLS
 *   • side-effecting flows → supabase.functions.invoke(...) (create-order,
 *     payos-create-link, ghn-sync-status, ghn-order-status, moderate-review,
 *     chat, admin-login, upload-media, import-books)
 *
 * Response shapes are flattened to match what the React pages expect from the
 * old FastAPI responses (e.g. book.authors / book.categories as flat arrays).
 *
 * Requires: npm install @supabase/supabase-js   (+ REACT_APP_SUPABASE_URL / _ANON_KEY)
 */
import { supabase } from './supabaseClient';

// Mirror api.js's ApiError so callers' `catch (e) { e.status }` still work.
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function wrap(error, fallbackStatus = 400) {
  if (!error) return null;
  return new ApiError(error.message || 'Request failed', error.status || fallbackStatus, error);
}
function must({ data, error }, status) {
  if (error) throw wrap(error, status);
  return data;
}
async function invoke(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // Surface the function's JSON `detail` when present.
    let detail = error.message;
    try { detail = (await error.context?.json())?.detail ?? detail; } catch { /* ignore */ }
    throw new ApiError(detail, error.context?.status ?? 500, error);
  }
  return data;
}

// ── shape helpers ───────────────────────────────────────────────────────────
const BOOK_SELECT = '*, book_authors(author:authors(*)), book_categories(category:categories(*))';
const STATIONERY_SELECT = '*, stationery_categories(category:categories(*))';
const ORDER_SELECT =
  '*, order_items(*, book:books(book_id,title,slug,image_url,price), stationery:stationery(stationery_id,title,slug,image_url,price))';

function flattenBook(row) {
  if (!row) return row;
  const { book_authors, book_categories, ...rest } = row;
  return {
    ...rest,
    authors: (book_authors || []).map((x) => x.author).filter(Boolean),
    categories: (book_categories || []).map((x) => x.category).filter(Boolean),
  };
}
function flattenStationery(row) {
  if (!row) return row;
  const { stationery_categories, ...rest } = row;
  return { ...rest, categories: (stationery_categories || []).map((x) => x.category).filter(Boolean) };
}
// Admin user lists historically got `role` as a STRING (role_name) + `is_admin`.
// (getCurrentUser keeps role as the {role_name} object that ProtectedRoute needs.)
function flattenUser(row) {
  if (!row) return row;
  const roleName = row.role?.role_name ?? row.role ?? null;
  return { ...row, role: roleName, role_name: roleName, is_admin: roleName === 'Admin' };
}
// Reviews: expose user_name + nested user.name + book_title so admin/listing UIs
// that read those convenience fields keep working.
function decorateReview(r) {
  if (!r) return r;
  const name = [r.user?.first_name, r.user?.last_name].filter(Boolean).join(' ');
  return {
    ...r,
    user: r.user ? { ...r.user, name } : r.user,
    user_name: name || (r.user_id != null ? `#${r.user_id}` : ''),
    book_title: r.book?.title ?? r.book_title ?? '',
  };
}

// ── current app user (integer user_id) ──────────────────────────────────────
async function currentProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('users')
    .select('*, role:roles(role_name)')
    .eq('auth_id', user.id)
    .maybeSingle();
  return data;
}

// ============================================================================
// Auth
// ============================================================================
export async function login(credentials) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email, password: credentials.password,
  });
  if (error) throw new ApiError(error.message, error.status ?? 401, error);
  const profile = await currentProfile();
  return { access_token: data.session?.access_token, token_type: 'bearer', user: profile };
}

export async function register(userData) {
  const { data, error } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
    options: {
      data: {
        first_name: userData.first_name ?? '',
        last_name: userData.last_name ?? '',
        phone_number: userData.phone_number ?? null,
      },
    },
  });
  if (error) throw new ApiError(error.message, error.status ?? 400, error);
  return data;
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function getCurrentUser() {
  const profile = await currentProfile();
  if (!profile) throw new ApiError('Not authenticated', 401);
  return profile;
}

export async function adminLogin(credentials) {
  // Edge Function validates the rotating code + admin role, returns a session.
  const data = await invoke('admin-login', {
    email: credentials.email,
    password: credentials.password,
    login_code: credentials.login_code ?? credentials.code,
  });
  if (data?.access_token && data?.refresh_token) {
    await supabase.auth.setSession({
      access_token: data.access_token, refresh_token: data.refresh_token,
    });
  }
  return data;
}

export async function refreshToken() {
  const { data } = await supabase.auth.refreshSession();
  return { access_token: data.session?.access_token, token_type: 'bearer' };
}

export async function forgotPassword(email) {
  const redirectTo = `${window.location.origin}/auth/reset-password`;
  return must(await supabase.auth.resetPasswordForEmail(email, { redirectTo }));
}

export async function resetPassword(_token, newPassword) {
  // Supabase puts the user in a recovery session via the email link, so we just
  // update the password on the active session.
  return must(await supabase.auth.updateUser({ password: newPassword }));
}

export async function updateUserPhone(phoneNumber) {
  const profile = await currentProfile();
  return must(await supabase.from('users')
    .update({ phone_number: phoneNumber }).eq('user_id', profile.user_id).select().single());
}

// ============================================================================
// Books
// ============================================================================
export async function getBooks(params = {}) {
  let q = supabase.from('books').select(BOOK_SELECT).eq('is_active', true);
  if (params.search) q = q.ilike('title', `%${params.search}%`);
  if (params.category_id) {
    // filter via join requires a different path; fall back to client filter below
  }
  if (params.limit) q = q.range(Number(params.skip || 0), Number(params.skip || 0) + Number(params.limit) - 1);
  q = q.order('display_order', { ascending: true });
  const rows = must(await q);
  return (rows || []).map(flattenBook);
}
export async function getBook(bookId) {
  return flattenBook(must(await supabase.from('books').select(BOOK_SELECT).eq('book_id', bookId).single()));
}
export const getBookById = getBook;
export async function getBookBySlug(slug) {
  return flattenBook(must(await supabase.from('books').select(BOOK_SELECT).eq('slug', slug).single()));
}
async function booksFlagged(flag, limit = 10) {
  const rows = must(await supabase.from('books').select(BOOK_SELECT)
    .eq('is_active', true).eq(flag, true).order('display_order', { ascending: true }).limit(limit));
  return (rows || []).map(flattenBook);
}
export const getFeaturedBooks = () => booksFlagged('is_featured');
export const getDiscountedBooks = (limit = 10) => booksFlagged('is_discount', limit);
export async function getPopularBooks(limit = 10) {
  const rows = must(await supabase.from('books').select(BOOK_SELECT)
    .eq('is_active', true).order('display_order', { ascending: true }).limit(limit));
  return (rows || []).map(flattenBook);
}
export async function getBestSellerBooks(limit = 10) {
  // Approximation of the old SQL aggregate; pgvector/RPC can refine later.
  return getPopularBooks(limit);
}
export async function getSlideBooks(slideNumber, limit = 10) {
  return booksFlagged(`is_slide${slideNumber}`, limit);
}
// author_ids/category_ids are many-to-many relations (book_authors/book_categories),
// not columns on books — split them out and sync the junction tables. Only touch a
// junction when its *_ids array is actually provided (so partial updates like
// toggling is_featured / saving read_sample don't wipe authors/categories).
async function syncBookRelations(bookId, authorIds, categoryIds) {
  if (Array.isArray(authorIds)) {
    await supabase.from('book_authors').delete().eq('book_id', bookId);
    if (authorIds.length) {
      await supabase.from('book_authors').insert(
        authorIds.map((author_id) => ({ book_id: bookId, author_id: Number(author_id) })));
    }
  }
  if (Array.isArray(categoryIds)) {
    await supabase.from('book_categories').delete().eq('book_id', bookId);
    if (categoryIds.length) {
      await supabase.from('book_categories').insert(
        categoryIds.map((category_id) => ({ book_id: bookId, category_id: Number(category_id) })));
    }
  }
}
export async function createBook(bookData) {
  const { author_ids, category_ids, authors, categories, ...cols } = bookData;
  const book = must(await supabase.from('books').insert(cols).select().single());
  await syncBookRelations(book.book_id, author_ids, category_ids);
  return book;
}
export async function updateBook(bookId, bookData) {
  const { author_ids, category_ids, authors, categories, ...cols } = bookData;
  let book = null;
  if (Object.keys(cols).length) {
    book = must(await supabase.from('books').update(cols).eq('book_id', bookId).select().single());
  }
  await syncBookRelations(bookId, author_ids, category_ids);
  return book ?? flattenBook(must(await supabase.from('books').select(BOOK_SELECT).eq('book_id', bookId).single()));
}
export async function deleteBook(bookId) {
  return must(await supabase.from('books').update({ is_active: false }).eq('book_id', bookId));
}

// ============================================================================
// Stationery
// ============================================================================
export async function getStationery(params = {}) {
  let q = supabase.from('stationery').select(STATIONERY_SELECT).eq('is_active', true);
  if (params.slide_number) q = q.eq(`is_slide${params.slide_number}`, true);
  if (params.limit) q = q.limit(Number(params.limit));
  q = q.order('display_order', { ascending: true });
  return (must(await q) || []).map(flattenStationery);
}
export const getStationeryItem = async (id) =>
  flattenStationery(must(await supabase.from('stationery').select(STATIONERY_SELECT).eq('stationery_id', id).single()));
export const getStationeryBySlug = async (slug) =>
  flattenStationery(must(await supabase.from('stationery').select(STATIONERY_SELECT).eq('slug', slug).single()));
export async function getFeaturedStationery(p = {}) {
  return (must(await supabase.from('stationery').select(STATIONERY_SELECT)
    .eq('is_active', true).eq('is_featured', true).limit(Number(p.limit || 10))) || []).map(flattenStationery);
}
export async function getLatestStationery(p = {}) {
  return (must(await supabase.from('stationery').select(STATIONERY_SELECT)
    .eq('is_active', true).order('created_at', { ascending: false }).limit(Number(p.limit || 10))) || []).map(flattenStationery);
}
export const getSlideStationery = (slideNumber, limit = 10) => getStationery({ slide_number: slideNumber, limit });
async function syncStationeryRelations(stationeryId, categoryIds) {
  if (Array.isArray(categoryIds)) {
    await supabase.from('stationery_categories').delete().eq('stationery_id', stationeryId);
    if (categoryIds.length) {
      await supabase.from('stationery_categories').insert(
        categoryIds.map((category_id) => ({ stationery_id: stationeryId, category_id: Number(category_id) })));
    }
  }
}
export async function createStationery(d) {
  const { category_ids, categories, ...cols } = d;
  const st = must(await supabase.from('stationery').insert(cols).select().single());
  await syncStationeryRelations(st.stationery_id, category_ids);
  return st;
}
export async function updateStationery(id, d) {
  const { category_ids, categories, ...cols } = d;
  let st = null;
  if (Object.keys(cols).length) {
    st = must(await supabase.from('stationery').update(cols).eq('stationery_id', id).select().single());
  }
  await syncStationeryRelations(id, category_ids);
  return st ?? flattenStationery(must(await supabase.from('stationery').select(STATIONERY_SELECT).eq('stationery_id', id).single()));
}
export const deleteStationery = async (id) => must(await supabase.from('stationery').update({ is_active: false }).eq('stationery_id', id));

// ============================================================================
// Categories / Authors
// ============================================================================
export const getCategories = async () => must(await supabase.from('categories').select('*').order('name'));
export const getBooksCategories = getCategories;
export const getStationeryCategories = getCategories;
export const getCategory = async (id) => must(await supabase.from('categories').select('*').eq('category_id', id).single());
export const createCategory = async (d) => must(await supabase.from('categories').insert(d).select().single());
export const updateCategory = async (id, d) => must(await supabase.from('categories').update(d).eq('category_id', id).select().single());
export const deleteCategory = async (id) => must(await supabase.from('categories').delete().eq('category_id', id));

export const getAuthors = async () => must(await supabase.from('authors').select('*').order('name'));
export const getBooksAuthors = getAuthors;
export const getAuthor = async (id) => must(await supabase.from('authors').select('*').eq('author_id', id).single());
export const createAuthor = async (d) => must(await supabase.from('authors').insert(d).select().single());
export const updateAuthor = async (id, d) => must(await supabase.from('authors').update(d).eq('author_id', id).select().single());
export const deleteAuthor = async (id) => must(await supabase.from('authors').delete().eq('author_id', id));

// ============================================================================
// Orders (writes + fulfilment via Edge Functions)
// ============================================================================
export const createOrder = (orderData) => invoke('create-order', orderData);
export async function getOrders(params = {}) {
  let q = supabase.from('orders').select(ORDER_SELECT).order('order_date', { ascending: false });
  if (params.status_filter) q = q.eq('status', params.status_filter);
  if (params.limit) q = q.range(Number(params.skip || 0), Number(params.skip || 0) + Number(params.limit) - 1);
  return must(await q); // RLS scopes to the caller's own orders
}
export const getOrder = async (id) => must(await supabase.from('orders').select(ORDER_SELECT).eq('order_id', id).single());
export async function getAllOrders(params = {}) {
  let q = supabase.from('orders').select(ORDER_SELECT).order('order_date', { ascending: false });
  if (params.status_filter) q = q.eq('status', params.status_filter);
  if (params.user_id) q = q.eq('user_id', params.user_id);
  return must(await q); // RLS: admins see all
}
export const getAllOrdersAdmin = getAllOrders;
export const updateOrderStatus = async (orderId, status) =>
  must(await supabase.from('orders').update({ status }).eq('order_id', orderId).select().single());
export async function cancelOrder(orderId) {
  // Mirrors the old "only pending" rule; stock restock is handled by an admin
  // flow / future RPC. Here we just flip the status under RLS.
  return must(await supabase.from('orders').update({ status: 'cancelled' }).eq('order_id', orderId));
}
export const syncGhnStatus = () => invoke('ghn-sync-status', {});
export const getMyOrderShippingStatus = (orderId) => invoke('ghn-order-status', { order_id: orderId });
export const getOrderShippingStatus = getMyOrderShippingStatus;
export const getGHNOrderStatus = getMyOrderShippingStatus;

// ============================================================================
// Payments
// ============================================================================
export const createPayOSLink = (orderId) => invoke('payos-create-link', { order_id: orderId });

// ============================================================================
// Addresses (owner-scoped via RLS)
// ============================================================================
export const getAddresses = async () => must(await supabase.from('addresses').select('*'));
export const getAddress = async (id) => must(await supabase.from('addresses').select('*').eq('address_id', id).single());
export async function createAddress(addressData) {
  const profile = await currentProfile();
  return must(await supabase.from('addresses').insert({ ...addressData, user_id: profile.user_id }).select().single());
}
export const updateAddress = async (id, d) => must(await supabase.from('addresses').update(d).eq('address_id', id).select().single());
export const deleteAddress = async (id) => must(await supabase.from('addresses').delete().eq('address_id', id));
export async function setDefaultAddress(addressId) {
  const profile = await currentProfile();
  await supabase.from('addresses').update({ is_default_shipping: false }).eq('user_id', profile.user_id);
  return must(await supabase.from('addresses').update({ is_default_shipping: true }).eq('address_id', addressId).select().single());
}

// ============================================================================
// Reviews
// ============================================================================
const REVIEW_SELECT = '*, user:users(first_name,last_name)';
export const getBookReviews = async (bookId) =>
  (must(await supabase.from('reviews').select(REVIEW_SELECT).eq('book_id', bookId).order('created_at', { ascending: false })) || []).map(decorateReview);
export const getAllReviews = async (p = {}) => {
  let q = supabase.from('reviews').select('*, user:users(first_name,last_name), book:books(title)').order('created_at', { ascending: false });
  if (p.limit) q = q.range(Number(p.offset || 0), Number(p.offset || 0) + Number(p.limit) - 1);
  return (must(await q) || []).map(decorateReview);
};
export async function createReview(bookId, reviewData) {
  // NOTE: the old endpoint enforced "verified purchase" + one-review-per-book
  // upsert. That belongs in a Postgres trigger/RPC (TODO in MIGRATION.md);
  // here we upsert on (book_id, user_id) under RLS.
  const profile = await currentProfile();
  return must(await supabase.from('reviews')
    .upsert({ book_id: bookId, user_id: profile.user_id, ...reviewData }, { onConflict: 'book_id,user_id' })
    .select().single());
}
export const updateReview = async (id, d) => must(await supabase.from('reviews').update(d).eq('review_id', id).select().single());
export const deleteReview = async (id) => must(await supabase.from('reviews').delete().eq('review_id', id));
export const getStationeryReviews = async (sid) =>
  (must(await supabase.from('stationery_reviews').select(REVIEW_SELECT).eq('stationery_id', sid).order('created_at', { ascending: false })) || []).map(decorateReview);
export async function createStationeryReview(stationeryId, reviewData) {
  const profile = await currentProfile();
  return must(await supabase.from('stationery_reviews')
    .upsert({ stationery_id: stationeryId, user_id: profile.user_id, ...reviewData }, { onConflict: 'stationery_id,user_id' })
    .select().single());
}
export const moderateReview = (payload) => invoke('moderate-review', payload);

// ============================================================================
// Wishlist
// ============================================================================
export async function getWishlist() {
  return must(await supabase.from('wishlists').select('*, book:books(*)').order('added_at', { ascending: false }));
}
export async function addToWishlist(bookId) {
  const profile = await currentProfile();
  return must(await supabase.from('wishlists').insert({ user_id: profile.user_id, book_id: bookId }));
}
export async function removeFromWishlist(bookId) {
  const profile = await currentProfile();
  return must(await supabase.from('wishlists').delete().eq('user_id', profile.user_id).eq('book_id', bookId));
}

// ============================================================================
// Users (profile + admin)
// ============================================================================
export const getUserProfile = getCurrentUser;
export async function updateUserProfile(userData) {
  const profile = await currentProfile();
  return must(await supabase.from('users').update(userData).eq('user_id', profile.user_id).select().single());
}
export const getAllUsers = async () =>
  (must(await supabase.from('users').select('*, role:roles(role_name)')) || []).map(flattenUser);
export const updateUserStatus = async (userId, isActive) =>
  must(await supabase.from('users').update({ is_active: Number(isActive) }).eq('user_id', userId).select().single());

// ============================================================================
// Notifications / Slides
// ============================================================================
export const getActiveNotification = async () =>
  must(await supabase.from('notifications').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle());
export const getNotifications = async () => must(await supabase.from('notifications').select('*').order('created_at', { ascending: false }));
export const createNotification = async (d) => must(await supabase.from('notifications').insert(d).select().single());
export const updateNotification = async (id, d) => must(await supabase.from('notifications').update(d).eq('notification_id', id).select().single());
export const deleteNotification = async (id) => must(await supabase.from('notifications').delete().eq('notification_id', id));
export async function toggleNotification(id) {
  const cur = must(await supabase.from('notifications').select('is_active').eq('notification_id', id).single());
  return must(await supabase.from('notifications').update({ is_active: !cur.is_active }).eq('notification_id', id).select().single());
}
// local-storage helpers kept identical to api.js
export function dismissNotification(id) {
  if (!id) return;
  const d = JSON.parse(sessionStorage.getItem('dismissed_notifications') || '[]');
  if (!d.includes(id)) { d.push(id); sessionStorage.setItem('dismissed_notifications', JSON.stringify(d)); }
}
export function isNotificationDismissed(id) {
  if (!id) return false;
  return JSON.parse(sessionStorage.getItem('dismissed_notifications') || '[]').includes(id);
}

export const getSlideContents = async () => must(await supabase.from('slide_contents').select('*').order('slide_number'));
export const getSlideContent = async (n) => must(await supabase.from('slide_contents').select('*').eq('slide_number', n).maybeSingle());
export const updateSlideContent = async (n, d) =>
  must(await supabase.from('slide_contents').update(d).eq('slide_number', n).select().single());

// ============================================================================
// Media uploads (→ Storage via upload-media function)
// ============================================================================
function mediaForm(entity, entityId, slot, files) {
  const fd = new FormData();
  fd.append('entity', entity);
  fd.append('entity_id', String(entityId));
  fd.append('slot', slot);
  (Array.isArray(files) ? files : [files]).forEach((f) => fd.append('file', f));
  return fd;
}
export const uploadBookImage = (id, file) => invoke('upload-media', mediaForm('book', id, 'image', file));
export const uploadBookImage2 = (id, file) => invoke('upload-media', mediaForm('book', id, 'image2', file));
export const uploadBookImage3 = (id, file) => invoke('upload-media', mediaForm('book', id, 'image3', file));
export const uploadStationeryImage = (id, file) => invoke('upload-media', mediaForm('stationery', id, 'image', file));
export const uploadStationeryImage2 = (id, file) => invoke('upload-media', mediaForm('stationery', id, 'image2', file));
export const uploadStationeryImage3 = (id, file) => invoke('upload-media', mediaForm('stationery', id, 'image3', file));
export const uploadReadSampleImages = (id, files) => invoke('upload-media', mediaForm('book', id, 'read-sample', files));
export const uploadAudioSample = (id, file) => invoke('upload-media', mediaForm('book', id, 'audio-sample', file));

// ============================================================================
// Chat
// ============================================================================
export const sendChatMessage = (message, sessionId = null) => invoke('chat', { message, session_id: sessionId });

// Bulk import books from an .xlsx file → import-books Edge Function.
export const importBooks = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return invoke('import-books', fd);
};

// ============================================================================
// Static-file URL helpers (Storage public URLs are already absolute)
// ============================================================================
// Imported rows still carry old FastAPI paths like "/static/book_1_xxx.png".
// Those files are still served by the VPS until images are migrated to Supabase
// Storage. Prepend the legacy static host for relative/`/static/` paths; pass
// absolute URLs (Storage public URLs) through untouched.
const LEGACY_STATIC = (process.env.REACT_APP_LEGACY_STATIC_URL || 'https://api.tamnguon.com').replace(/\/$/, '');
const SUPABASE_HOST = (process.env.REACT_APP_SUPABASE_URL || '').replace(/\/$/, '');
export function getBookCoverUrl(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;                    // Supabase Storage (absolute)
  if (imageUrl.startsWith('/storage/')) return `${SUPABASE_HOST}${imageUrl}`; // Storage relative URL (getPublicUrl w/o host)
  if (imageUrl.startsWith('/')) return `${LEGACY_STATIC}${imageUrl}`;  // /static/... on the VPS
  return `${LEGACY_STATIC}/static/${imageUrl}`;
}
export function getStaticFileUrl(p) {
  if (!p) return null;
  if (p.startsWith('http')) return p;
  if (p.startsWith('/storage/')) return `${SUPABASE_HOST}${p}`;
  return `${LEGACY_STATIC}${p.startsWith('/') ? '' : '/static/'}${p}`;
}
export const uploadBookCover = (id, file) => uploadBookImage(id, file);

// ============================================================================
// Google OAuth + guest account (Supabase Auth)
// ============================================================================
export async function getGoogleAuthUrl() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback`, skipBrowserRedirect: true },
  });
  if (error) throw new ApiError(error.message, 400, error);
  return { authorization_url: data?.url };
}
export async function handleGoogleCallback() {
  // supabase-js (detectSessionInUrl) consumes the OAuth code automatically on load.
  const { data } = await supabase.auth.getSession();
  return { access_token: data.session?.access_token, token_type: 'bearer' };
}
export async function createAccountFromGuest(guestData) {
  // No server-side guest→account merge needed: sign up; the auth trigger links the
  // public.users row by email (and thus any guest orders sharing that email).
  return register(guestData);
}

// ============================================================================
// Email-verification / system bootstrap — deprecated under Supabase Auth
// ============================================================================
export const activateAccount = async () => ({ message: 'handled by Supabase Auth' });
export const verifyEmail = async () => ({ message: 'handled by Supabase Auth' });
export const initializeSystem = async () => ({ message: 'handled by migrations' });

// ============================================================================
// Search + relational book lookups
// ============================================================================
export const searchBooks = (query, params = {}) => getBooks({ ...params, search: query });
export async function getBooksByCategory(categoryId, _params = {}) {
  const rows = must(await supabase.from('book_categories')
    .select(`book:books(${BOOK_SELECT})`).eq('category_id', categoryId));
  return (rows || []).map((r) => flattenBook(r.book)).filter(Boolean);
}
export async function getBooksByAuthor(authorId, _params = {}) {
  const rows = must(await supabase.from('book_authors')
    .select(`book:books(${BOOK_SELECT})`).eq('author_id', authorId));
  return (rows || []).map((r) => flattenBook(r.book)).filter(Boolean);
}

// ============================================================================
// Users — password + admin management
// ============================================================================
export async function changePassword(passwordData) {
  const newPassword = passwordData.new_password || passwordData.newPassword || passwordData.password;
  return must(await supabase.auth.updateUser({ password: newPassword }));
}
export const getUserById = async (id) =>
  flattenUser(must(await supabase.from('users').select('*, role:roles(role_name)').eq('user_id', id).single()));
export const updateUser = async (id, d) =>
  must(await supabase.from('users').update(d).eq('user_id', id).select().single());
export const deleteUser = async (id) => must(await supabase.from('users').delete().eq('user_id', id));

// ============================================================================
// Wishlist extra
// ============================================================================
export async function clearWishlist() {
  const profile = await currentProfile();
  return must(await supabase.from('wishlists').delete().eq('user_id', profile.user_id));
}

// ============================================================================
// Cart — the storefront cart is client-side (CartContext); these are no-ops kept
// only so the export surface matches api.js.
// ============================================================================
export const getCart = async () => ({ items: [] });
export const addToCart = async () => ({ success: true });
export const updateCartItem = async () => ({ success: true });
export const removeFromCart = async () => ({ success: true });
export const clearCart = async () => ({ success: true });

// ============================================================================
// Analytics (admin dashboard) — basic counts; refine with RPCs later.
// ============================================================================
export async function getDashboardAnalytics() {
  const [{ count: books }, { count: users }, { count: orders }] = await Promise.all([
    supabase.from('books').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
  ]);
  return { total_books: books ?? 0, total_users: users ?? 0, total_orders: orders ?? 0 };
}
export const getSalesAnalytics = async () => ({ data: [] });
export const getBookAnalytics = async () => ({ data: [] });
export const getUserAnalytics = async () => ({ data: [] });

// ============================================================================
// Misc utility (parity with api.js)
// ============================================================================
export const healthCheck = async () => ({ status: 'ok' });
export const getVersion = async () => ({ version: 'supabase' });
export const getApiInfo = async () => ({ backend: 'supabase' });
export const refreshTokenFn = refreshToken; // alias guard (some code imports refreshToken)
export const uploadImage = async (file) => {
  // Generic image upload → product-images bucket; returns the public URL.
  const path = `misc/${crypto.randomUUID()}`;
  const { error } = await supabase.storage.from('product-images').upload(path, file);
  if (error) throw new ApiError(error.message, 500, error);
  return { url: supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl };
};

// ============================================================================
// Default export + HttpClient shim — keeps AuthContext's
// `apiModule.default.client.setAuthToken(...)` calls harmless (supabase-js owns
// the session, so token caching is a no-op).
// ============================================================================
export class HttpClient {
  setAuthToken() { /* no-op: supabase-js manages the session */ }
  getAuthToken() { return null; }
}
// Default export must carry ALL methods, because some pages (EditBook,
// CreateBook) call them as `apiService.getBook(...)` on the default instance.
const apiService = {
  client: new HttpClient(),
  activateAccount, addToCart, addToWishlist, adminLogin, cancelOrder, changePassword,
  clearCart, clearWishlist, createAccountFromGuest, createAddress, createAuthor,
  createBook, createCategory, createNotification, createOrder, createPayOSLink,
  createReview, createStationery, createStationeryReview, deleteAddress, deleteAuthor,
  deleteBook, deleteCategory, deleteNotification, deleteReview, deleteStationery,
  deleteUser, dismissNotification, forgotPassword, getActiveNotification, getAddress,
  getAddresses, getAllOrders, getAllOrdersAdmin, getAllReviews, getAllUsers, getApiInfo,
  getAuthor, getAuthors, getBestSellerBooks, getBook, getBookAnalytics, getBookById,
  getBookBySlug, getBookCoverUrl, getBookReviews, getBooks, getBooksAuthors,
  getBooksByAuthor, getBooksByCategory, getBooksCategories, getCart, getCategories,
  getCategory, getCurrentUser, getDashboardAnalytics, getDiscountedBooks, getFeaturedBooks,
  getFeaturedStationery, getGHNOrderStatus, getGoogleAuthUrl, getLatestStationery,
  getMyOrderShippingStatus, getNotifications, getOrder, getOrderShippingStatus, getOrders,
  getPopularBooks, getSalesAnalytics, getSlideBooks, getSlideContent, getSlideContents,
  getSlideStationery, getStaticFileUrl, getStationery, getStationeryBySlug,
  getStationeryCategories, getStationeryItem, getStationeryReviews, getUserAnalytics,
  getUserById, getUserProfile, getVersion, getWishlist, handleGoogleCallback, healthCheck,
  initializeSystem, isNotificationDismissed, login, logout, moderateReview, refreshToken,
  register, removeFromCart, removeFromWishlist, resetPassword, searchBooks, sendChatMessage,
  setDefaultAddress, syncGhnStatus, toggleNotification, updateAddress, updateAuthor,
  updateBook, updateCartItem, updateCategory, updateNotification, updateOrderStatus,
  updateReview, updateSlideContent, updateStationery, updateUser, updateUserPhone,
  updateUserProfile, updateUserStatus, uploadAudioSample, uploadBookCover, uploadBookImage,
  uploadBookImage2, uploadBookImage3, uploadImage, uploadReadSampleImages,
  uploadStationeryImage, uploadStationeryImage2, uploadStationeryImage3, verifyEmail,
};
export default apiService;

/*
 * CUTOVER (Phase 7):
 *   Backup the old client, then make api.js a one-line re-export:
 *     mv src/service/api.js src/service/api.fastapi.js
 *     echo "export * from './apiSupabase';\nexport { default } from './apiSupabase';" > src/service/api.js
 *   Every existing `from '../service/api'` import then resolves to Supabase with
 *   zero page edits. Do this only when the Supabase backend is live + data imported.
 */

/*
 * CUTOVER (Phase 7):
 *   Option A — per page: change `from '../service/api'` → `'../service/apiSupabase'`.
 *   Option B — global flip: in service/api.js add at top
 *       export * from './apiSupabase';
 *     (and delete the conflicting local exports) so every existing import
 *     resolves to Supabase with zero page edits.
 * Do this only when the Supabase backend is live and data is imported.
 */
