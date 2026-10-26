/**
 * worker.js - Cloudflare Worker API + static host for openlink
 *
 * Bindings required:
 *   BATCHES - Workers KV namespace (already created and bound)
 *   ASSETS  - Static assets binding for index.html, style.css, app.js, storage.js
 *
 * API:
 *   GET  /api/name-taken?name=<name>   -> { taken: boolean }
 *   GET  /api/batch/<name>             -> batch JSON | 404
 *   POST /api/batch                    -> { ok: true, name } | 409 | 400 | 413
 *
 * Expiry is enforced twice: with KV's expirationTtl (automatic deletion) and by
 * checking createdAt + durationDays on every read (protects against KV's
 * eventual-consistency window and leftover keys).
 */

const ALLOWED_DURATIONS = [5, 10, 20];
const MAX_NAME_LENGTH = 64;
const MAX_HEADER_LENGTH = 300;
const MAX_EXPERIMENTS = 200;
const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10 MB safety cap (KV limit is 25 MiB)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...CORS_HEADERS
    }
  });
}

function emptyResponse(status = 204) {
  return new Response(null, { status, headers: CORS_HEADERS });
}

function isValidName(name) {
  return (
    typeof name === 'string' &&
    name.length > 0 &&
    name.length <= MAX_NAME_LENGTH &&
    /^[a-z0-9_-]+$/.test(name)
  );
}

function isExpired(batch) {
  const createdAt = Number(batch && batch.createdAt);
  const durationDays = Number(batch && batch.durationDays);
  if (!Number.isFinite(createdAt) || !ALLOWED_DURATIONS.includes(durationDays)) {
    return true;
  }
  return Date.now() - createdAt >= durationDays * 24 * 60 * 60 * 1000;
}

/**
 * Reads a batch and deletes it if it is malformed or past its own expiry.
 * Returns the parsed batch, or null.
 */
async function readActiveBatch(env, name) {
  const raw = await env.BATCHES.get(name);
  if (raw === null) return null;

  let batch;
  try {
    batch = JSON.parse(raw);
  } catch (err) {
    await env.BATCHES.delete(name);
    return null;
  }

  if (!batch || batch.name !== name || isExpired(batch)) {
    await env.BATCHES.delete(name);
    return null;
  }

  return batch;
}

function sanitizeExperiments(value) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, MAX_EXPERIMENTS).map((exp) => ({
    number:
      exp && exp.number !== undefined && exp.number !== null
        ? String(exp.number).trim().slice(0, 40)
        : '',
    title: exp && exp.title ? String(exp.title).trim().slice(0, 200) : '',
    code:
      exp && exp.code !== undefined && exp.code !== null ? String(exp.code) : ''
  }));
}

async function handleApi(request, url, env) {
  if (!env || !env.BATCHES) {
    return jsonResponse({ error: 'KV binding BATCHES is not configured' }, 500);
  }

  if (request.method === 'OPTIONS') {
    return emptyResponse(204);
  }

  // GET /api/name-taken?name=<name>
  if (url.pathname === '/api/name-taken') {
    if (request.method !== 'GET') {
      return jsonResponse({ error: 'method not allowed' }, 405);
    }

    const name = (url.searchParams.get('name') || '').trim().toLowerCase();
    if (!isValidName(name)) {
      return jsonResponse({ error: 'invalid name' }, 400);
    }

    const batch = await readActiveBatch(env, name);
    return jsonResponse({ taken: batch !== null });
  }

  // GET /api/batch/<name>
  if (url.pathname.startsWith('/api/batch/')) {
    if (request.method !== 'GET') {
      return jsonResponse({ error: 'method not allowed' }, 405);
    }

    let name = '';
    try {
      name = decodeURIComponent(url.pathname.slice('/api/batch/'.length))
        .trim()
        .toLowerCase();
    } catch (err) {
      return jsonResponse({ error: 'invalid name' }, 400);
    }

    if (!isValidName(name)) {
      return jsonResponse({ error: 'invalid name' }, 400);
    }

    const batch = await readActiveBatch(env, name);
    if (!batch) {
      return jsonResponse({ error: 'not found' }, 404);
    }

    return jsonResponse(batch);
  }

  // POST /api/batch
  if (url.pathname === '/api/batch') {
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'method not allowed' }, 405);
    }

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: 'batch too large' }, 413);
    }

    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return jsonResponse({ error: 'batch too large' }, 413);
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (err) {
      return jsonResponse({ error: 'invalid json' }, 400);
    }

    if (!body || typeof body !== 'object') {
      return jsonResponse({ error: 'invalid body' }, 400);
    }

    const name = (body.name || '').trim().toLowerCase();
    if (!isValidName(name)) {
      return jsonResponse({ error: 'invalid name' }, 400);
    }

    const durationDays = Number(body.durationDays);
    if (!ALLOWED_DURATIONS.includes(durationDays)) {
      return jsonResponse({ error: 'durationDays must be 5, 10, or 20' }, 400);
    }

    const experiments = sanitizeExperiments(body.experiments);
    const hasContent = experiments.some(
      (exp) => exp.code.trim() || exp.title || exp.number
    );
    if (!hasContent) {
      return jsonResponse({ error: 'batch has no experiments' }, 400);
    }

    // KV has no conditional write, so two simultaneous saves with the same name
    // can still race between this check and the put below. The client retries on
    // 409, which covers the normal collision case.
    const existing = await readActiveBatch(env, name);
    if (existing) {
      return jsonResponse({ error: 'name taken' }, 409);
    }

    const batch = {
      name,
      header:
        String(body.header || '').trim().slice(0, MAX_HEADER_LENGTH) ||
        'Lab Experiments',
      experiments,
      durationDays,
      createdAt: Date.now()
    };

    // expirationTtl is in seconds; KV deletes the key automatically.
    await env.BATCHES.put(name, JSON.stringify(batch), {
      expirationTtl: durationDays * 24 * 60 * 60
    });

    return jsonResponse({ ok: true, name: batch.name }, 201);
  }

  return jsonResponse({ error: 'not found' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, url, env);
      } catch (err) {
        console.error('openlink api error:', err);
        return jsonResponse({ error: 'server error' }, 500);
      }
    }

    // Serve the existing static site (index.html, style.css, app.js, storage.js).
    if (env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response(
      'openlink: static assets are not configured. Add an Assets binding named ASSETS (for example with Wrangler [assets]) and redeploy.',
      {
        status: 503,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store'
        }
      }
    );
  }
};
