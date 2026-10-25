/**
 * API Client for BillSplitter Backend
 */

const BASE_URL = ''; // Relative path leverages Vite's proxy '/api'

async function handleResponse(res, defaultError) {
  if (!res.ok) {
    let message = defaultError;
    try {
      const data = await res.json();
      if (data && data.error) {
        message = data.error;
      }
    } catch (_) {}
    throw new Error(message);
  }
  return res.json();
}

export async function fetchUsers() {
  const res = await fetch(`${BASE_URL}/api/users`);
  return handleResponse(res, 'Failed to fetch users');
}

export async function createUser(userData) {
  const res = await fetch(`${BASE_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  return handleResponse(res, 'Failed to create user');
}

export async function updateUserProfile(userId, userData) {
  const res = await fetch(`${BASE_URL}/api/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  return handleResponse(res, 'Failed to update user profile');
}

export async function fetchGroups() {
  const res = await fetch(`${BASE_URL}/api/groups`);
  return handleResponse(res, 'Failed to fetch groups');
}

export async function fetchGroupDetails(groupId) {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}`);
  return handleResponse(res, 'Failed to fetch group details');
}

export async function deleteGroup(groupId) {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}`, {
    method: 'DELETE',
  });
  return handleResponse(res, 'Failed to delete group');
}

export async function updateGroup(groupId, groupData) {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(groupData),
  });
  return handleResponse(res, 'Failed to update group');
}

export async function createGroup(groupData) {
  const res = await fetch(`${BASE_URL}/api/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(groupData),
  });
  return handleResponse(res, 'Failed to create group');
}

export async function addGroupMember(groupId, memberData) {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(memberData),
  });
  return handleResponse(res, 'Failed to add member to group');
}

export async function updateMemberRole(groupId, userId, role) {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/members/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  return handleResponse(res, 'Failed to update member role');
}


export async function addBill(groupId, billData) {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/bills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(billData),
  });
  return handleResponse(res, 'Failed to add bill');
}

export async function deleteBill(groupId, billId) {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/bills/${billId}`, {
    method: 'DELETE',
  });
  return handleResponse(res, 'Failed to delete bill');
}

export async function recordSettlement(groupId, settleData) {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/settle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settleData),
  });
  return handleResponse(res, 'Failed to record settlement');
}

export async function fetchForecast(groupId) {
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/forecast`);
  return handleResponse(res, 'Failed to fetch expense forecast');
}

export async function smartAgentChat(payload) {
  const res = await fetch(`${BASE_URL}/api/smart-agent/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res, 'Failed to query smart agent');
}

export async function scanReceiptPreset(preset) {
  const res = await fetch(`${BASE_URL}/api/receipt-scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preset }),
  });
  return handleResponse(res, 'Failed to scan receipt');
}

export async function fetchNotifications(userId) {
  const res = await fetch(`${BASE_URL}/api/notifications?user_id=${userId}`);
  return handleResponse(res, 'Failed to fetch notifications');
}

export async function markNotificationsRead(userId) {
  const res = await fetch(`${BASE_URL}/api/notifications/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  return handleResponse(res, 'Failed to mark notifications read');
}

export async function uploadReceiptFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(res, 'Failed to upload receipt file');
}
