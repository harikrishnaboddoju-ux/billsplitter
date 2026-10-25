/**
 * API Client for BillSplitter Backend
 * Configured with centralized VITE_API_URL environment variable for Render deployment.
 */

// Centralized API Base URL:
// 1. Explicit VITE_API_URL environment variable (from Render dashboard or .env.production)
// 2. Production fallback: when running on Render or built for production, defaults to deployed backend
// 3. Local development: empty string (leverages Vite's local /api proxy to http://127.0.0.1:5000)
const DEFAULT_PROD_BACKEND_URL = 'https://billsplitter-api-1spb.onrender.com';

function resolveApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim();
  }
  // If running in production or on Render static site domain
  if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
    return DEFAULT_PROD_BACKEND_URL;
  }
  if (import.meta.env.PROD) {
    return DEFAULT_PROD_BACKEND_URL;
  }
  return '';
}

export const API_BASE_URL = resolveApiBaseUrl().replace(/\/+$/, '');

/**
 * Resolves a backend file path (like /api/uploads/receipt.jpg) to a fully-qualified URL.
 */
export function getFileUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Resolves the CSV export URL for a group.
 */
export function getExportGroupUrl(groupId) {
  return `${API_BASE_URL}/api/groups/${groupId}/export`;
}

/**
 * Centralized fetch wrapper with robust error handling for failed requests and Render cold starts.
 */
async function apiRequest(endpoint, options = {}, defaultError = 'Request failed') {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  try {
    const res = await fetch(url, options);

    if (!res.ok) {
      let message = `${defaultError} (${res.status})`;
      try {
        const data = await res.json();
        if (data && data.error) {
          message = data.error;
        }
      } catch (_) {}
      const error = new Error(message);
      error.status = res.status;
      throw error;
    }

    return await res.json();
  } catch (err) {
    // Detect network / connection failures (e.g. Render Web Service asleep on free tier)
    if (err.name === 'TypeError' && err.message.toLowerCase().includes('fetch')) {
      const connError = new Error(
        'Unable to connect to BillSplitter server. If deployed on Render free tier, the backend may take 30-60 seconds to spin up from sleep.'
      );
      connError.isNetworkError = true;
      throw connError;
    }
    throw err;
  }
}

export async function checkBackendHealth() {
  return apiRequest('/api/health', {}, 'Backend health check failed');
}

export async function fetchUsers() {
  return apiRequest('/api/users', {}, 'Failed to fetch users');
}

export async function createUser(userData) {
  return apiRequest('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  }, 'Failed to create user');
}

export async function updateUserProfile(userId, userData) {
  return apiRequest(`/api/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  }, 'Failed to update user profile');
}

export async function fetchGroups() {
  return apiRequest('/api/groups', {}, 'Failed to fetch groups');
}

export async function fetchGroupDetails(groupId) {
  return apiRequest(`/api/groups/${groupId}`, {}, 'Failed to fetch group details');
}

export async function deleteGroup(groupId) {
  return apiRequest(`/api/groups/${groupId}`, {
    method: 'DELETE',
  }, 'Failed to delete group');
}

export async function updateGroup(groupId, groupData) {
  return apiRequest(`/api/groups/${groupId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(groupData),
  }, 'Failed to update group');
}

export async function createGroup(groupData) {
  return apiRequest('/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(groupData),
  }, 'Failed to create group');
}

export async function addGroupMember(groupId, memberData) {
  return apiRequest(`/api/groups/${groupId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(memberData),
  }, 'Failed to add member to group');
}

export async function updateMemberRole(groupId, userId, role) {
  return apiRequest(`/api/groups/${groupId}/members/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  }, 'Failed to update member role');
}

export async function addBill(groupId, billData) {
  return apiRequest(`/api/groups/${groupId}/bills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(billData),
  }, 'Failed to add bill');
}

export async function deleteBill(groupId, billId) {
  return apiRequest(`/api/groups/${groupId}/bills/${billId}`, {
    method: 'DELETE',
  }, 'Failed to delete bill');
}

export async function recordSettlement(groupId, settleData) {
  return apiRequest(`/api/groups/${groupId}/settle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settleData),
  }, 'Failed to record settlement');
}

export async function fetchForecast(groupId) {
  return apiRequest(`/api/groups/${groupId}/forecast`, {}, 'Failed to fetch expense forecast');
}

export async function smartAgentChat(payload) {
  return apiRequest('/api/smart-agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, 'Failed to query smart agent');
}

export async function scanReceiptPreset(preset) {
  return apiRequest('/api/receipt-scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preset }),
  }, 'Failed to scan receipt');
}

export async function fetchNotifications(userId) {
  return apiRequest(`/api/notifications?user_id=${encodeURIComponent(userId)}`, {}, 'Failed to fetch notifications');
}

export async function markNotificationsRead(userId) {
  return apiRequest('/api/notifications/read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  }, 'Failed to mark notifications read');
}

export async function uploadReceiptFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const data = await apiRequest('/api/upload', {
    method: 'POST',
    body: formData,
  }, 'Failed to upload receipt file');
  
  return {
    ...data,
    full_url: getFileUrl(data.url)
  };
}
