// ── AUTH MODULE — VidScholar Personalized User System ──
// Uses localStorage-based auth (no server needed).
// Each user gets a unique namespace for their scores & history.

const AUTH_REGISTRY_KEY = 'vidscholar_users_v1';   // stores all registered users
const AUTH_SESSION_KEY  = 'vidscholar_session_v1';  // currently logged-in username

/**
 * Returns all registered users as { [username]: { passwordHash, name, createdAt } }
 */
function getRegistry() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_REGISTRY_KEY) || '{}');
  } catch { return {}; }
}

function saveRegistry(reg) {
  localStorage.setItem(AUTH_REGISTRY_KEY, JSON.stringify(reg));
}

/** Simple non-cryptographic hash (good enough for local-only auth) */
function hashPassword(password) {
  let hash = 5381;
  for (let i = 0; i < password.length; i++) {
    hash = ((hash << 5) + hash) + password.charCodeAt(i);
    hash |= 0; // convert to 32-bit int
  }
  return hash.toString(16);
}

/** Register a new user. Returns { ok: true } or { ok: false, error: string } */
function authRegister(name, username, password) {
  if (!name.trim() || !username.trim() || !password.trim()) {
    return { ok: false, error: 'All fields are required.' };
  }
  if (username.trim().length < 3) {
    return { ok: false, error: 'Username must be at least 3 characters.' };
  }
  if (password.length < 4) {
    return { ok: false, error: 'Password must be at least 4 characters.' };
  }
  const reg = getRegistry();
  const key = username.trim().toLowerCase();
  if (reg[key]) {
    return { ok: false, error: 'Username already exists. Please log in.' };
  }
  reg[key] = {
    name: name.trim(),
    username: key,
    passwordHash: hashPassword(password),
    createdAt: Date.now(),
  };
  saveRegistry(reg);
  return { ok: true, user: reg[key] };
}

/** Login existing user. Returns { ok: true, user } or { ok: false, error } */
function authLogin(username, password) {
  if (!username.trim() || !password.trim()) {
    return { ok: false, error: 'Please enter your username and password.' };
  }
  const reg = getRegistry();
  const key = username.trim().toLowerCase();
  const user = reg[key];
  if (!user) {
    return { ok: false, error: 'Account not found. Please register first.' };
  }
  if (user.passwordHash !== hashPassword(password)) {
    return { ok: false, error: 'Incorrect password. Please try again.' };
  }
  // Save session
  localStorage.setItem(AUTH_SESSION_KEY, key);
  return { ok: true, user };
}

/** Returns the currently logged-in user object, or null */
function authGetCurrentUser() {
  try {
    const key = localStorage.getItem(AUTH_SESSION_KEY);
    if (!key) return null;
    const reg = getRegistry();
    return reg[key] || null;
  } catch { return null; }
}

/** Logout — clears session (does NOT delete user data) */
function authLogout() {
  localStorage.removeItem(AUTH_SESSION_KEY);
}

/** Returns the localStorage key to use for this user's scores/history */
function getUserStorageKey(username) {
  return `vidscholar_scores_v3_${username.toLowerCase()}`;
}

/** After login/register, set the session so future saves go to the right key */
function authSetSession(username) {
  localStorage.setItem(AUTH_SESSION_KEY, username.trim().toLowerCase());
}
