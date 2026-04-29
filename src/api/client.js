const BASE = '/api'

async function apiPatch(url, body) {
  const res = await fetch(`${BASE}${url}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (res.ok) return
  const data = await res.json().catch(() => ({}))
  throw { status: data.status, msg: data.msg }
}

export async function getResources() {
  const res = await fetch(`${BASE}/resources`)
  if (!res.ok) throw new Error('Failed to fetch resources')
  return res.json()
}

export async function getProperties() {
  const res = await fetch(`${BASE}/properties`)
  if (!res.ok) throw new Error('Failed to fetch properties')
  return res.json()
}

export async function getProfile() {
  const res = await fetch(`${BASE}/me/profile`, { credentials: 'include' })
  if (res.status === 401) return null
  if (!res.ok) throw new Error('Failed to fetch profile')
  return res.json()
}

export async function login(loginVal, password) {
  const res = await fetch(`${BASE}/me/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: loginVal, password })
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.msg ?? 'Login failed')
  }
}

export async function logout() {
  await fetch(`${BASE}/me/logout`, { method: 'POST', credentials: 'include' })
}

export async function signUp(login, email, password) {
  const res = await fetch(`${BASE}/me/sign-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, email, password })
  })
  const data = await res.json()
  if (!res.ok) throw { status: data.status, msg: data.msg ?? 'Sign up failed' }
  return data
}

export async function confirmSignUp(registrationId, confirmationStatus) {
  const res = await fetch(`${BASE}/me/sign-up/confirmEmail?registrationId=${registrationId}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmationStatus })
  })
  if (res.ok) return
  const data = await res.json().catch(() => ({}))
  throw { status: data.status, msg: data.msg ?? 'Confirmation failed' }
}

export async function getResource(id) {
  const res = await fetch(`${BASE}/resources/${id}`)
  if (!res.ok) throw new Error('Resource not found')
  return res.json()
}

export async function getWorkingDays() {
  const res = await fetch(`${BASE}/working_days`)
  if (!res.ok) throw new Error('Failed to fetch working days')
  return res.json()
}

export async function createBooking(resourceId, day, timeFrom, durationMinutes) {
  const res = await fetch(`${BASE}/me/bookings?resourceId=${resourceId}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ day, timeFrom, durationMinutes })
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw { status: data.status, msg: data.msg }
  return data
}

export async function getMyBookings() {
  const res = await fetch(`${BASE}/me/bookings`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch bookings')
  return res.json()
}

export async function cancelBooking(id) {
  const res = await fetch(`${BASE}/me/bookings/${id}`, { method: 'DELETE', credentials: 'include' })
  if (res.ok) return
  const data = await res.json().catch(() => ({}))
  throw { status: data.status, msg: data.msg }
}

export async function addWorkingDay(day) {
  const res = await fetch(`${BASE}/working_days`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ day })
  })
  if (res.ok) return
  const data = await res.json().catch(() => ({}))
  throw { status: data.status, msg: data.msg }
}

export async function deleteWorkingDay(date) {
  const res = await fetch(`${BASE}/working_days/${date}`, { method: 'DELETE', credentials: 'include' })
  if (res.ok) return
  const data = await res.json().catch(() => ({}))
  throw { status: data.status, msg: data.msg }
}

export const updateName     = (newName)                      => apiPatch('/me/profile/name',          { newName })
export const updateLogin    = (newLogin)                     => apiPatch('/me/profile/login',         { newLogin })
export const updatePassword = (oldPassword, newPassword)     => apiPatch('/me/profile/password',      { oldPassword, newPassword })
export const updateEmail    = (newEmail)                     => apiPatch('/me/profile/email',         { newEmail })
export const confirmEmailChange = (confirmationStatus)       => apiPatch('/me/profile/email/confirm', { confirmationStatus })

export function getImageUrl(id) {
  return `${BASE}/images/${id}`
}

export async function createResource({ name, shortDescription, fullDescription, pricePerHour, imagesIds, propertiesIds }) {
  const res = await fetch(`${BASE}/resources`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, shortDescription, fullDescription, pricePerHour, imagesIds, propertiesIds })
  })
  if (res.ok) return res.json()
  const data = await res.json().catch(() => ({}))
  throw { status: data.status, msg: data.msg }
}

export async function updateResource(id, { newname, shortDescription, fullDescription, pricePerHour, imagesIds, propertiesIds }) {
  const body = {};
  if (newname !== undefined) body.newname = newname;
  if (shortDescription !== undefined) body.shortDescription = shortDescription;
  if (fullDescription !== undefined) body.fullDescription = fullDescription;
  if (pricePerHour !== undefined) body.pricePerHour = pricePerHour;
  if (imagesIds !== undefined) body.imagesIds = imagesIds;
  if (propertiesIds !== undefined) body.propertiesIds = propertiesIds;

  const res = await fetch(`${BASE}/resources/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (res.ok) return res.json();
  const data = await res.json().catch(() => ({}));
  throw { status: data.status, msg: data.msg };
}

export async function deleteResource(id) {
  const res = await fetch(`${BASE}/resources/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  if (res.ok) return
  const data = await res.json().catch(() => ({}))
  throw { status: data.status, msg: data.msg }
}

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE}/images`, {
    method: 'POST',
    credentials: 'include',
    body: formData
  });
  if (res.ok) return res.json();
  const data = await res.json().catch(() => ({}));
  throw { status: data.status, msg: data.msg };
}

export async function deleteImageApi(id) {
  const res = await fetch(`${BASE}/images/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (res.ok) return;
  const data = await res.json().catch(() => ({}));
  throw { status: data.status, msg: data.msg };
}