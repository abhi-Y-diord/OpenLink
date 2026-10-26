/**
 * storage.js - OpenLink API client
 *
 * The pages only talk to these three functions. To point the static site at a
 * different backend (for example when testing index.html from file://), set
 * API_BASE to the Worker origin, e.g. 'https://openlink.example.workers.dev'.
 * When the Worker serves the site itself, leave this empty for same-origin calls.
 */

const API_BASE = '';
const REQUEST_TIMEOUT_MS = 15000;

function apiUrl(path) {
  return `${API_BASE.replace(/\/+$/, '')}${path}`;
}

/**
 * fetch with a timeout so a stalled request cannot leave the UI blocked forever.
 */
async function apiRequest(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(apiUrl(path), {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Checks if a batch name is already taken and active (not expired).
 * @param {string} name - Short link name
 * @returns {Promise<boolean>} True if taken, false otherwise (false on network error)
 */
async function isNameTaken(name) {
  if (!name || typeof name !== 'string') return false;

  const cleanName = name.trim().toLowerCase();

  try {
    const res = await apiRequest(
      `/api/name-taken?name=${encodeURIComponent(cleanName)}`
    );
    if (!res.ok) return false;

    const data = await res.json();
    return Boolean(data && data.taken);
  } catch (err) {
    console.error('Failed to check name availability:', err);
    return false;
  }
}

/**
 * Retrieves a batch by name if it exists and is not expired.
 * @param {string} name - Short link name
 * @returns {Promise<Object|null>} Batch data object or null
 */
async function getBatch(name) {
  if (!name || typeof name !== 'string') return null;

  const cleanName = name.trim().toLowerCase();

  try {
    const res = await apiRequest(`/api/batch/${encodeURIComponent(cleanName)}`);
    if (!res.ok) return null;

    return await res.json();
  } catch (err) {
    console.error('Failed to load batch:', err);
    return null;
  }
}

/**
 * Saves a new batch through the Worker API.
 * @param {Object} batchData - { name, header, experiments, durationDays }
 * @returns {Promise<{ok: boolean, name?: string, reason?: string}>}
 *   Never reports ok:true unless the server explicitly confirmed the save.
 */
async function saveBatch(batchData) {
  if (!batchData || !batchData.name) {
    throw new Error('Batch data must include a name.');
  }

  const cleanName = batchData.name.trim().toLowerCase();

  const payload = {
    name: cleanName,
    header: batchData.header ? String(batchData.header) : '',
    experiments: Array.isArray(batchData.experiments)
      ? batchData.experiments.map((exp) => ({
          number: exp && exp.number !== undefined ? String(exp.number) : '',
          title: exp && exp.title ? String(exp.title) : '',
          code: exp && exp.code ? String(exp.code) : ''
        }))
      : [],
    durationDays: Number(batchData.durationDays)
  };

  try {
    const res = await apiRequest('/api/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.status === 201 || res.status === 200) {
      let data = null;
      try {
        data = await res.json();
      } catch (err) {
        return { ok: false, reason: 'server' };
      }

      if (data && data.ok === true) {
        return { ok: true, name: data.name || cleanName };
      }

      return { ok: false, reason: 'server' };
    }

    if (res.status === 409) return { ok: false, reason: 'taken' };
    if (res.status === 400) return { ok: false, reason: 'invalid' };
    if (res.status === 413) return { ok: false, reason: 'too_large' };

    return { ok: false, reason: 'server' };
  } catch (err) {
    console.error('Failed to save batch:', err);
    return { ok: false, reason: 'network' };
  }
}
