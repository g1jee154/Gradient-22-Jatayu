const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getHeaders(extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  const token = localStorage.getItem('jatayu_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: getHeaders(options.headers),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

// AUTH API
export const authApi = {
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name, email, password, phone, role = 'user', responder_type = 'Police') =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone, role, responder_type }),
    }),

  googleAuth: (googleData) =>
    request('/auth/google', {
      method: 'POST',
      body: JSON.stringify(googleData),
    }),

  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),

  getMe: () => request('/auth/me'),
};

// INCIDENTS API
export const incidentsApi = {
  createSOS: (data) =>
    request('/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMyIncidents: () => request('/incidents/my'),

  getPending: () => request('/incidents/pending'),

  getAssigned: () => request('/incidents/assigned'),

  getAll: (status) =>
    request(`/incidents/all${status ? `?status=${status}` : ''}`),

  getById: (id) => request(`/incidents/${id}`),

  accept: (id) =>
    request(`/incidents/${id}/accept`, {
      method: 'POST',
    }),

  updateStatus: (id, status, notes = '') =>
    request(`/incidents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),

  cancel: (id, reason) =>
    request(`/incidents/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  dispatch: (id, responder_id) =>
    request(`/incidents/${id}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({ responder_id }),
    }),

  getMessages: (id) => request(`/incidents/${id}/messages`),

  sendMessage: (id, message) =>
    request(`/incidents/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
};

// RESPONDERS API
export const respondersApi = {
  getAll: () => request('/responders'),

  updateAvailability: (is_available, latitude, longitude) =>
    request('/responders/availability', {
      method: 'PATCH',
      body: JSON.stringify({ is_available, latitude, longitude }),
    }),

  verify: (id, is_verified) =>
    request(`/responders/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ is_verified }),
    }),

  getStats: () => request('/responders/stats'),
};

// CONTACTS API
export const contactsApi = {
  getAll: () => request('/contacts'),

  add: (name, phone, relationship) =>
    request('/contacts', {
      method: 'POST',
      body: JSON.stringify({ name, phone, relationship }),
    }),

  delete: (id) =>
    request(`/contacts/${id}`, {
      method: 'DELETE',
    }),

  triggerAlert: (incidentId, location) =>
    request('/contacts/alert', {
      method: 'POST',
      body: JSON.stringify({ incidentId, location }),
    }),
};

// ADMIN API
export const adminApi = {
  getStats: () => request('/admin/stats'),

  getUsers: () => request('/admin/users'),

  updateUserStatus: (id, account_status) =>
    request(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ account_status }),
    }),

  getAuditLogs: () => request('/admin/audit-logs'),

  getDbTables: () => request('/admin/db/tables'),

  getTableRows: (table) => request(`/admin/db/tables/${table}`),

  updateTableCell: (table, id, column, value) =>
    request(`/admin/db/tables/${table}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ column, value }),
    }),

  deleteTableRow: (table, id) =>
    request(`/admin/db/tables/${table}/${id}`, {
      method: 'DELETE',
    }),
};
