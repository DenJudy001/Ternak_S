const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * Helper to get authorization headers from stored token.
 */
export function getAuthHeaders() {
  const token = localStorage.getItem('siternak_token')
  const headers = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

/**
 * Health check endpoint call.
 */
export async function checkServerHealth() {
  const response = await fetch(`${API_BASE_URL}/health`)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail?.message || 'Failed to reach backend server')
  }
  return response.json()
}

/**
 * Authenticate user with username and password.
 * Returns { access_token, token_type }
 */
export async function loginUser(username, password) {
  const formData = new URLSearchParams()
  formData.append('username', username)
  formData.append('password', password)

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Login failed. Please check your credentials.')
  }

  return response.json()
}

/**
 * Fetch current authenticated user profile.
 */
export async function fetchCurrentUser(token) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Session invalid or expired')
  }

  return response.json()
}

/**
 * Notify server of user logout.
 */
export async function logoutUser() {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })
  return response.json().catch(() => ({}))
}
