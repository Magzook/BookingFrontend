const BASE = '/api'

export async function login(email, password) {
  const res = await fetch(`${BASE}/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  })
  if (!res.ok) {
    const data = await res.json()
    throw data
  }
}
 
export async function loginAsStaff(loginVal, password, role) {
  // role: 'hostess' | 'admin'
  const endpoint = role === 'admin' ? `${BASE}/sign-in-as-admin` : `${BASE}/sign-in-as-hostess`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: loginVal, password }),
    credentials: 'include',
  })
  if (!res.ok) {
    const data = await res.json()
    throw data
  }
}
 
export async function signUp(payload) {
  // payload: { email, password, lastName, firstName, middleName, birthDate, documentNumber }
  const res = await fetch(`${BASE}/sign-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  })
  if (!res.ok) {
    const data = await res.json()
    throw data
  }
  return res.json() // { registrationId }
}
 
export async function confirmSignUp(registrationId, confirmationCode) {
  const res = await fetch(`${BASE}/sign-up/confirmEmail?registrationId=${encodeURIComponent(registrationId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmationCode }),
    credentials: 'include',
  })
  if (!res.ok) {
    const data = await res.json()
    throw data
  }
}
 
export async function getGuestProfile() {
  const res = await fetch(`${BASE}/profile`, { credentials: 'include' })
  if (!res.ok) return null
  const data = await res.json()
  return { ...data, role: 'guest' }
}

export function makeStaffProfile(login, role) {
  return { login, role }
}

export async function logout() {
  await fetch(`${BASE}/logout`, { method: 'POST', credentials: 'include' })
}
 


export async function getProfile() {
  const res = await fetch(`${BASE}/profile`, { credentials: 'include' })
  if (!res.ok) return null
  return res.json()
}

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

export const updatePersonal = ({ newLastName, newFirstName, newMiddleName, newBirthDate, newDocumentNumber }) =>
  apiPatch('/profile/personal', {
    ...(newLastName       !== undefined && { newLastName }),
    ...(newFirstName      !== undefined && { newFirstName }),
    ...(newMiddleName     !== undefined && { newMiddleName }),
    ...(newBirthDate      !== undefined && { newBirthDate }),
    ...(newDocumentNumber !== undefined && { newDocumentNumber }),
  })
export const updatePassword     = (oldPassword, newPassword) => apiPatch('/profile/password',      { oldPassword, newPassword })
export const updateEmail        = (newEmail)                 => apiPatch('/profile/email',         { newEmail })
export const confirmEmailChange = (confirmationCode)         => apiPatch('/profile/email/confirm', { confirmationCode })


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
  const res = await fetch(`${BASE}/bookings?resourceId=${resourceId}`, {
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
  const res = await fetch(`${BASE}/bookings`, { credentials: 'include' })
  if (!res.ok) throw await res.json()
  return res.json()
}
 
export async function cancelBooking(id) {
  const res = await fetch(`${BASE}/bookings/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) throw await res.json()
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


export function getImageUrl(id) {
  return `${BASE}/images/${id}`
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

export async function cancelHostessBooking(id) {
  const res = await fetch(`${BASE}/hostess/bookings/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (res.ok) return
  const data = await res.json().catch(() => ({}))
  throw { status: res.status, msg: data.msg }
}

export async function getHostessBookingsByDay(date) {
  const res = await fetch(`${BASE}/hostess/bookings/byDay/${date}`, {
    credentials: 'include',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw { status: res.status, msg: data.msg }
  }
  return res.json()
}
