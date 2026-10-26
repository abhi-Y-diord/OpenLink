/**
 * app.js - OpenLink Core Application Logic
 * Canvas Background, Cinematic Launch Sequence, Theme Toggle, Router, Storage Manager, and View Renderer
 */

// Word pools for auto-generated short link names
const ADJECTIVES = [
  'blue', 'swift', 'bold', 'bright', 'calm', 'cool', 'amber', 'cosmic',
  'golden', 'silent', 'clever', 'happy', 'keen', 'quick', 'mellow', 'neon',
  'ruby', 'solar', 'vivid', 'wild'
];

const NOUNS = [
  'tiger', 'falcon', 'panda', 'otter', 'eagle', 'comet', 'phoenix', 'river',
  'breeze', 'orbit', 'shadow', 'spark', 'wave', 'forest', 'harbor', 'beacon',
  'pixel', 'atlas', 'cedar', 'summit'
];

/**
 * Generates an available short link name like "blue-tiger-42".
 * The server remains the final authority on duplicates; this pre-check only
 * improves the odds of a first-try save.
 */
async function generateUniqueLinkName() {
  let name = '';

  for (let attempt = 0; attempt < 6; attempt++) {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(Math.random() * 90) + 10;
    name = `${adj}-${noun}-${num}`;

    if (typeof isNameTaken !== 'function') return name;

    const taken = await isNameTaken(name);
    if (!taken) return name;
  }

  return name;
}

/**
 * Safely escapes HTML special characters
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Copies text to clipboard
 */
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  } else {
    return new Promise((resolve, reject) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (successful) resolve();
        else reject(new Error('Copy command failed'));
      } catch (err) {
        document.body.removeChild(textarea);
        reject(err);
      }
    });
  }
}

/**
 * Calculates next experiment number based on current DOM inputs
 */
function getNextExperimentNumber() {
  const numInputs = document.querySelectorAll('.exp-number-input');
  let maxNum = 0;
  numInputs.forEach(input => {
    const val = parseInt(input.value, 10);
    if (!isNaN(val) && val > maxNum) {
      maxNum = val;
    }
  });
  return maxNum > 0 ? maxNum + 1 : numInputs.length + 1;
}

/**
 * Creates an Experiment Entry DOM element
 */
function createExperimentEntryElement(numberVal, titleVal = '', codeVal = '') {
  const entryDiv = document.createElement('div');
  entryDiv.className = 'experiment-entry';

  entryDiv.innerHTML = `
    <div class="entry-header-row">
      <div class="form-group" style="margin-bottom:0;">
        <label>Exp #</label>
        <input type="text" class="exp-number-input" value="${escapeHTML(numberVal)}" placeholder="1">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Title <span class="label-hint">(optional)</span></label>
        <input type="text" class="exp-title-input" value="${escapeHTML(titleVal)}" placeholder="e.g. Binary Search Tree">
      </div>
      <button type="button" class="btn btn-remove" title="Remove experiment">
        Remove
      </button>
    </div>
    <div class="form-group" style="margin-bottom:0; margin-top:0.85rem;">
      <label>Code</label>
      <textarea class="code-textarea" placeholder="Paste experiment code here...">${escapeHTML(codeVal)}</textarea>
    </div>
  `;

  const removeBtn = entryDiv.querySelector('.btn-remove');
  removeBtn.addEventListener('click', () => {
    entryDiv.classList.add('removing');
    setTimeout(() => {
      entryDiv.remove();
      const entriesContainer = document.getElementById('entries-container');
      if (entriesContainer && entriesContainer.querySelectorAll('.experiment-entry').length === 0) {
        const newEntry = createExperimentEntryElement(1);
        entriesContainer.appendChild(newEntry);
      }
    }, 250);
  });

  return entryDiv;
}

/**
 * Renders the CREATE PAGE (Home Page)
 */
function renderCreatePage() {
  const appRoot = document.getElementById('app-root');
  const headerNav = document.getElementById('header-nav');
  
  if (headerNav) headerNav.innerHTML = '';

  appRoot.innerHTML = `
    <div class="page-view">
      <div class="panel">
        <p class="panel-desc" style="font-size: 1.05rem; color: var(--text-main); margin-bottom: 1.5rem;">
          Paste lab code files below to generate a short shareable link.
        </p>

        <form id="batch-form" onsubmit="return false;">
          <div class="form-group">
            <label for="batch-header">Batch Header</label>
            <input type="text" id="batch-header" placeholder="e.g. DAA Lab, Experiments 1-12" autocomplete="off">
          </div>

          <div style="margin-top: 1.5rem; margin-bottom: 1rem;">
            <label style="font-size: 0.95rem; color: var(--text-main); margin-bottom: 0.5rem;">Experiments</label>
            <div id="entries-container"></div>
            
            <button type="button" id="add-exp-btn" class="btn btn-secondary" style="width: 100%; margin-top: 0.5rem;">
              Add Experiment
            </button>
          </div>

          <div class="form-group" style="margin-top: 1.75rem; margin-bottom: 1.5rem;">
            <label style="margin-bottom: 0.4rem;">Keep this batch for</label>
            <div class="duration-toggle-group">
              <button type="button" class="duration-btn" data-days="5">5 days</button>
              <button type="button" class="duration-btn" data-days="10">10 days</button>
              <button type="button" class="duration-btn active" data-days="20">20 days</button>
            </div>
          </div>

          <div id="error-container"></div>

          <div class="save-btn-container">
            <button type="submit" id="save-batch-btn" class="btn btn-primary save-btn-custom">
              Save Batch
            </button>
          </div>
        </form>

        <div id="success-container"></div>
      </div>
    </div>
  `;

  // Attach Duration Toggle Button handlers
  const durationBtns = appRoot.querySelectorAll('.duration-btn');
  durationBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      durationBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  const entriesContainer = document.getElementById('entries-container');
  const initialEntry = createExperimentEntryElement(1);
  entriesContainer.appendChild(initialEntry);

  document.getElementById('add-exp-btn').addEventListener('click', () => {
    const nextNum = getNextExperimentNumber();
    const newEntry = createExperimentEntryElement(nextNum);
    entriesContainer.appendChild(newEntry);
    
    const titleInput = newEntry.querySelector('.exp-title-input');
    if (titleInput) titleInput.focus();
  });

  document.getElementById('batch-form').addEventListener('submit', (e) => {
    e.preventDefault();
    handleSaveBatch().catch((err) => {
      console.error('Unexpected save error:', err);
    });
  });
}

/**
 * Premium cinematic launch sequence (≈2.2s).
 * charge -> shockwave -> curved comet launch with trail -> firework burst -> settle.
 */
function playCinematicLaunch(saveBtn, onComplete) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  saveBtn.disabled = true;

  // Reduced motion: skip the canvas entirely, reveal the panel with a plain fade.
  if (reduceMotion) {
    saveBtn.textContent = 'Save Batch';
    saveBtn.disabled = false;
    onComplete(true);
    return;
  }

  const rect = saveBtn.getBoundingClientRect();
  const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  const w = window.innerWidth;
  const h = window.innerHeight;
  const target = {
    x: w / 2 + (Math.random() - 0.5) * w * 0.1,
    y: Math.max(90, h * 0.24)
  };

  // Fullscreen overlay canvas, above everything.
  const canvas = document.createElement('canvas');
  canvas.id = 'cinematic-overlay';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Theme-aware monochrome palette: white sparks on dark, near-black on light.
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const base = isLight ? 22 : 242;
  const col = (a) => `rgba(${base}, ${base}, ${base}, ${a})`;

  const mobile = w < 640;
  const density = mobile ? 0.4 : 1;

  const T_CHARGE = 400;
  const T_LAUNCH = 1500;
  const T_TOTAL = 2200;

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

  // Curved (S-shaped) flight path via cubic bezier.
  const p0 = origin;
  const p3 = target;
  const p1 = {
    x: origin.x + (target.x - origin.x) * 0.18 + (mobile ? 42 : 120),
    y: origin.y - (origin.y - target.y) * 0.42
  };
  const p2 = {
    x: origin.x + (target.x - origin.x) * 0.82 - (mobile ? 52 : 130),
    y: target.y + (origin.y - target.y) * 0.3
  };

  function pointAt(t) {
    const mt = 1 - t;
    return {
      x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
      y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y
    };
  }

  // Charge motes pulled inward
  const motes = [];
  const moteCount = Math.round(46 * density);
  for (let i = 0; i < moteCount; i++) {
    motes.push({
      angle: Math.random() * Math.PI * 2,
      radius: 55 + Math.random() * 130,
      size: 0.7 + Math.random() * 1.7,
      phase: Math.random() * Math.PI * 2,
      delay: Math.random() * 140
    });
  }

  const rings = [];
  const trail = [];
  const ribbon = [];
  const burst = [];
  let flash = 0;
  let ringsSpawned = false;
  let burstFired = false;
  let finished = false;
  let rafId = 0;
  let elapsed = 0;
  let lastTs = 0;

  saveBtn.textContent = 'Launching...';
  saveBtn.style.transform = 'scale(0.96)';

  function cleanup() {
    if (finished) return;
    finished = true;
    if (rafId) cancelAnimationFrame(rafId);
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    saveBtn.style.transform = '';
    if (document.body.contains(saveBtn)) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Batch';
    }
  }

  function drawFlash(cx, cy, radius, strength) {
    if (strength <= 0.01) return;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    g.addColorStop(0, col(0.55 * strength));
    g.addColorStop(0.35, col(0.22 * strength));
    g.addColorStop(1, col(0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function frame(now) {
    if (finished) return;

    // Delta-based clock so the sequence stays smooth even after a stall/throttle.
    if (!lastTs) lastTs = now;
    const delta = Math.min(64, Math.max(0, now - lastTs));
    lastTs = now;
    elapsed += delta;

    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';

    const step = Math.min(2, Math.max(0.25, delta / 16.667));

    /* ---------------- 1. CHARGE ---------------- */
    if (elapsed < T_CHARGE) {
      const cp = elapsed / T_CHARGE;
      const e = easeInOutCubic(cp);
      const pulse = 0.5 + 0.5 * Math.sin(elapsed / 55);

      const glowRadius = rect.height * (1.5 + pulse * 0.5);
      const glow = ctx.createRadialGradient(origin.x, origin.y, 0, origin.x, origin.y, glowRadius);
      glow.addColorStop(0, col((0.1 + 0.1 * pulse) * e));
      glow.addColorStop(0.5, col(0.04 * e));
      glow.addColorStop(1, col(0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        const local = Math.min(1, Math.max(0, (elapsed - m.delay) / Math.max(1, T_CHARGE - m.delay)));
        const le = easeInOutCubic(local);
        const r = m.radius * (1 - le * 0.95);
        const wob = Math.sin(elapsed / 90 + m.phase) * 6 * (1 - le);
        const x = origin.x + Math.cos(m.angle) * r + wob;
        const y = origin.y + Math.sin(m.angle) * r + wob;

        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.3, m.size * (1 - le * 0.35)), 0, Math.PI * 2);
        ctx.fillStyle = col(0.12 + 0.55 * local);
        ctx.fill();
      }
    }

    /* ---------------- 2. SHOCKWAVE ---------------- */
    if (!ringsSpawned && elapsed >= T_CHARGE) {
      ringsSpawned = true;
      saveBtn.style.transform = '';
      flash = 0.7;
      [0, 80, 160].forEach((delay, i) => {
        rings.push({
          x: origin.x,
          y: origin.y,
          born: elapsed + delay,
          maxRadius: 78 + i * 62,
          strength: 0.5 - i * 0.11
        });
      });
    }

    for (let i = 0; i < rings.length; i++) {
      const ring = rings[i];
      const age = elapsed - ring.born;
      if (age < 0) continue;
      const lt = Math.min(1, age / 720);
      if (lt >= 1) continue;
      const radius = 10 + ring.maxRadius * easeOutCubic(lt);
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = col(ring.strength * (1 - lt));
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    if (flash > 0.012) {
      drawFlash(origin.x, origin.y, 130, flash);
      flash *= 0.86;
    }

    /* ---------------- 3. LAUNCH ---------------- */
    let comet = null;
    let cometAngle = 0;

    if (elapsed >= T_CHARGE && elapsed <= T_LAUNCH) {
      const lp = Math.min(1, (elapsed - T_CHARGE) / (T_LAUNCH - T_CHARGE));
      const t = easeInOutCubic(lp);
      comet = pointAt(t);

      const ahead = pointAt(Math.min(1, t + 0.01));
      cometAngle = Math.atan2(ahead.y - comet.y, ahead.x - comet.x) + Math.PI / 2;

      // Dense trail of sparks and dust
      const perFrame = Math.max(1, Math.round((mobile ? 2 : 5) * step));
      for (let s = 0; s < perFrame; s++) {
        trail.push({
          x: comet.x + (Math.random() - 0.5) * 12,
          y: comet.y + (Math.random() - 0.5) * 12,
          vx: (Math.random() - 0.5) * 2.2,
          vy: (Math.random() - 0.15) * 1.3 + 0.7,
          life: 0,
          maxLife: 420 + Math.random() * 360,
          size: 0.7 + Math.random() * 2.1,
          alpha: 0.5 + Math.random() * 0.5,
          flicker: Math.random() > 0.65,
          phase: Math.random() * Math.PI * 2
        });
      }

      ribbon.push({ x: comet.x, y: comet.y });
      if (ribbon.length > 22) ribbon.shift();
    }

    // Ribbon behind the core (tapered)
    if (ribbon.length > 1) {
      for (let i = 1; i < ribbon.length; i++) {
        const a = ribbon[i - 1];
        const b = ribbon[i];
        const k = i / ribbon.length;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineWidth = 1 + k * 5;
        ctx.strokeStyle = col(0.04 + k * 0.24);
        ctx.stroke();
      }
    }

    // Trail sparks
    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i];
      p.life += delta;
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.vx *= 0.985;
      p.vy = p.vy * 0.99 + 0.03 * step;

      const lifeT = p.life / p.maxLife;
      if (lifeT >= 1) {
        trail.splice(i, 1);
        continue;
      }

      const flick = p.flicker ? 0.45 + 0.55 * Math.abs(Math.sin((elapsed + p.phase * 300) / 90)) : 1;
      const alpha = p.alpha * (1 - lifeT) * flick;
      const size = p.size * (1 - lifeT * 0.7);

      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.25, size), 0, Math.PI * 2);
      ctx.fillStyle = col(alpha);
      ctx.fill();
    }

    // Comet core with glow and a living wobble
    if (comet) {
      const wobble = Math.sin(elapsed / 70) * 1.6;
      const cx = comet.x + wobble;
      const cy = comet.y + Math.cos(elapsed / 85) * 1.2;

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 36);
      glow.addColorStop(0, col(0.6));
      glow.addColorStop(0.3, col(0.22));
      glow.addColorStop(1, col(0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, 36, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(cometAngle + Math.sin(elapsed / 60) * 0.08);
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.6, 5.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = col(0.98);
      ctx.fill();
      ctx.restore();
    }

    /* ---------------- 4. BURST ---------------- */
    if (!burstFired && elapsed >= T_LAUNCH) {
      burstFired = true;
      const burstPoint = pointAt(1);

      // 80-120 sparks on desktop; ~60% fewer on phones.
      const count = mobile ? 48 : 112;
      for (let b = 0; b < count; b++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.2 + Math.random() * 7.5;
        burst.push({
          x: burstPoint.x,
          y: burstPoint.y,
          px: burstPoint.x,
          py: burstPoint.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 620 + Math.random() * 520,
          size: 0.8 + Math.random() * 2.3,
          alpha: 0.55 + Math.random() * 0.45,
          twinkle: Math.random() > 0.35,
          phase: Math.random() * Math.PI * 2
        });
      }

      rings.push({ x: burstPoint.x, y: burstPoint.y, born: elapsed, maxRadius: 230, strength: 0.62 });
      flash = 0.95;

      onComplete(false);
    }

    if (burstFired) {
      if (flash > 0.012) {
        drawFlash(pointAt(1).x, pointAt(1).y, 210, flash);
        flash *= 0.85;
      }

      for (let i = burst.length - 1; i >= 0; i--) {
        const p = burst[i];
        p.life += delta;
        p.px = p.x;
        p.py = p.y;
        p.x += p.vx * step;
        p.y += p.vy * step;
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + 0.075 * step; // light gravity

        const lifeT = p.life / p.maxLife;
        if (lifeT >= 1) {
          burst.splice(i, 1);
          continue;
        }

        const twinkle = p.twinkle
          ? 0.4 + 0.6 * Math.abs(Math.sin((elapsed + p.phase * 400) / 110))
          : 1;
        const alpha = p.alpha * (1 - lifeT) * twinkle;

        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.lineWidth = Math.max(0.5, p.size * (1 - lifeT * 0.6));
        ctx.strokeStyle = col(alpha);
        ctx.stroke();
      }
    }

    /* ---------------- 5. SETTLE / END ---------------- */
    if (elapsed >= T_TOTAL) {
      cleanup();
      return;
    }

    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);
}

/**
 * Reveals a string inside an input with a soft typing effect.
 */
function revealLinkText(input, text) {
  if (!input) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    input.value = text;
    return;
  }

  input.value = '';
  let index = 0;
  const step = () => {
    if (!document.body.contains(input)) return;
    index = Math.min(text.length, index + 2);
    input.value = text.slice(0, index);
    if (index < text.length) {
      setTimeout(step, 18);
    } else {
      input.value = text;
    }
  };
  setTimeout(step, 60);
}

/**
 * Shows a save failure using the existing error banner styling.
 */
function showSaveError(container, reason) {
  let message = 'Unable to save batch. Please check your connection and try again.';

  if (reason === 'taken') {
    message = 'Could not find an available link name. Please try again.';
  } else if (reason === 'too_large') {
    message = 'This batch is too large to save. Try splitting it into smaller batches.';
  } else if (reason === 'invalid') {
    message = 'The server rejected this batch. Please check the experiment details and try again.';
  } else if (reason === 'server') {
    message = 'The server could not save this batch right now. Please try again in a moment.';
  }

  container.innerHTML = `<div class="error-banner">${message}</div>`;
}

/**
 * Handles batch saving logic and triggers cinematic launch sequence
 */
async function handleSaveBatch() {
  const errorContainer = document.getElementById('error-container');
  const successContainer = document.getElementById('success-container');
  const saveBtn = document.getElementById('save-batch-btn');

  if (saveBtn && saveBtn.disabled) return;

  errorContainer.innerHTML = '';
  successContainer.innerHTML = '';

  const headerVal = document.getElementById('batch-header').value.trim();

  // Collect experiments
  const entryElements = document.querySelectorAll('.experiment-entry');
  const experiments = [];
  let hasContent = false;

  entryElements.forEach(el => {
    const num = el.querySelector('.exp-number-input').value.trim();
    const title = el.querySelector('.exp-title-input').value.trim();
    const code = el.querySelector('.code-textarea').value;

    if (code.trim() || title || num) {
      hasContent = true;
    }

    experiments.push({
      number: num,
      title: title,
      code: code
    });
  });

  // Validation
  if (!hasContent || experiments.length === 0) {
    errorContainer.innerHTML = `
      <div class="error-banner">
        Please add code or details to at least one experiment before saving.
      </div>
    `;
    return;
  }

  // Get selected duration in days (the server only accepts 5, 10, or 20).
  const activeDurationBtn = document.querySelector('.duration-btn.active');
  const durationDays = activeDurationBtn ? (parseInt(activeDurationBtn.dataset.days, 10) || 20) : 20;

  // Disable the button while the request is in flight to block double saves.
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
  }

  // Generate a name, then let the server confirm the save. Retry only when the
  // server reports that the generated name is already taken.
  let saveResult = { ok: false, reason: 'network' };
  let linkName = '';

  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      linkName = await generateUniqueLinkName();

      saveResult = await saveBatch({
        name: linkName,
        header: headerVal || 'Lab Experiments',
        experiments: experiments,
        durationDays: durationDays
      });

      if (saveResult.ok) break;
      if (saveResult.reason !== 'taken') break;
    }
  } catch (err) {
    console.error('Unexpected save error:', err);
    saveResult = { ok: false, reason: 'network' };
  }

  if (!saveResult.ok) {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Batch';
    }
    showSaveError(errorContainer, saveResult.reason);
    return;
  }

  // The server confirmed the save; only now is the link shown to the user.
  linkName = saveResult.name || linkName;

  const fullLink = `${window.location.origin}${window.location.pathname}#/${linkName}`;
  const relativeHash = `#/${linkName}`;

  // If the user navigated away while the request was in flight, the batch is
  // still saved, but there is no page left to animate over.
  if (!saveBtn || !document.body.contains(saveBtn) || !successContainer.isConnected) {
    return;
  }

  // The cinematic sequence; link panel appears at the burst / fade for reduced motion.
  playCinematicLaunch(saveBtn, () => {
    successContainer.innerHTML = `
      <div class="success-card">
        <div class="success-title">Batch Saved</div>
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          Your batch is accessible via this link:
        </p>

        <div class="link-box">
          <input type="text" class="link-input-display" value="" readonly id="saved-link-input" aria-label="Batch link">
          <button type="button" class="btn btn-primary btn-copy" id="copy-link-btn">
            Copy Link
          </button>
          <a href="${escapeHTML(relativeHash)}" class="btn btn-secondary" style="text-decoration:none;">
            View Batch
          </a>
        </div>
      </div>
    `;

    const linkInput = document.getElementById('saved-link-input');
    revealLinkText(linkInput, fullLink);

    const copyLinkBtn = document.getElementById('copy-link-btn');
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', () => {
        copyToClipboard(fullLink).then(() => {
          copyLinkBtn.classList.add('copied');
          copyLinkBtn.textContent = 'Copied';
          setTimeout(() => {
            copyLinkBtn.classList.remove('copied');
            copyLinkBtn.textContent = 'Copy Link';
          }, 2000);
        }).catch(err => {
          console.error('Failed to copy link:', err);
        });
      });
    }

    successContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

/**
 * Renders the VIEW PAGE for a given batch name
 */
async function renderViewPage(name) {
  const appRoot = document.getElementById('app-root');
  const headerNav = document.getElementById('header-nav');

  if (headerNav) {
    headerNav.innerHTML = `
      <a href="#/" class="btn btn-secondary" style="font-size: 0.85rem; min-height: 36px; padding: 0.4rem 0.85rem;">
        Create New Batch
      </a>
    `;
  }

  const batch = await getBatch(name);

  // A slow request must not overwrite a newer route (for example, if the user
  // pressed Back or opened another link while this one was loading).
  if (getRouteName() !== name) return;

  if (!batch) {
    appRoot.innerHTML = `
      <div class="page-view">
        <div class="panel not-found-card">
          <h2 class="not-found-title">Not Found or Expired</h2>
          <p class="not-found-desc">
            The link <strong>"#/${escapeHTML(name)}"</strong> does not exist or has expired.
          </p>
          <a href="#/" class="btn btn-primary" style="display: inline-flex;">
            Create New Batch
          </a>
        </div>
      </div>
    `;
    return;
  }

  const durationDays = batch.durationDays ? parseInt(batch.durationDays, 10) : 20;
  const EXPIRY_MS = durationDays * 24 * 60 * 60 * 1000;
  const ageMs = Date.now() - (batch.createdAt || Date.now());
  const daysRemaining = Math.max(0, Math.ceil((EXPIRY_MS - ageMs) / (1000 * 60 * 60 * 24)));

  let timeText = '';
  if (daysRemaining <= 0) {
    timeText = 'today';
  } else if (daysRemaining === 1) {
    timeText = 'in 1 day';
  } else {
    timeText = `in ${daysRemaining} days`;
  }

  let experimentsHTML = '';
  if (Array.isArray(batch.experiments) && batch.experiments.length > 0) {
    experimentsHTML = batch.experiments.map((exp, index) => {
      const expNum = exp.number ? escapeHTML(exp.number) : String(index + 1);
      const expTitle = exp.title ? `<span class="experiment-title-text">${escapeHTML(exp.title)}</span>` : '';
      const expCode = exp.code || '';

      return `
        <div class="experiment-view-card stagger-card" style="animation-delay: ${index * 0.07}s;">
          <div class="experiment-view-header">
            <div class="experiment-meta">
              <span class="experiment-badge">Experiment ${expNum}</span>
              ${expTitle}
            </div>
          </div>
          
          <div class="code-wrapper">
            <div class="code-wrapper-header">
              <span class="code-lang-tag">Code</span>
              <button class="btn btn-copy copy-exp-code-btn" data-exp-index="${index}">
                Copy
              </button>
            </div>
            <pre class="code-block"><code>${escapeHTML(expCode)}</code></pre>
          </div>
        </div>
      `;
    }).join('');
  } else {
    experimentsHTML = `
      <div class="panel">
        <p style="color: var(--text-muted);">No code entries found in this batch.</p>
      </div>
    `;
  }

  appRoot.innerHTML = `
    <div class="page-view">
      <div class="panel" style="margin-bottom: 1.25rem;">
        <h1 class="view-header-title">${escapeHTML(batch.header || 'Lab Batch')}</h1>
        <p class="expiry-note">
          This batch is deleted automatically ${timeText}.
        </p>
      </div>

      <div class="experiments-list">
        ${experimentsHTML}
      </div>
    </div>
  `;

  const copyButtons = appRoot.querySelectorAll('.copy-exp-code-btn');
  copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.getAttribute('data-exp-index'), 10);
      if (batch.experiments && batch.experiments[index]) {
        const codeToCopy = batch.experiments[index].code || '';
        copyToClipboard(codeToCopy).then(() => {
          btn.classList.add('copied');
          btn.textContent = 'Copied';
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.textContent = 'Copy';
          }, 2000);
        }).catch(err => {
          console.error('Failed to copy code:', err);
        });
      }
    });
  });
}

/**
 * Animated Floating Canvas Background (Network Constellation) with Theme Awareness
 */
function initBackgroundCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mediaQuery.matches) {
    canvas.style.display = 'none';
    return;
  }

  let dots = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    createDots();
  }

  function createDots() {
    const isMobile = window.innerWidth < 600;
    const count = isMobile ? 35 : 75;
    dots = [];

    for (let i = 0; i < count; i++) {
      dots.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 0.8 + 1
      });
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const dotColor = isLight ? 'rgba(0, 0, 0, 0.35)' : 'rgba(255, 255, 255, 0.4)';
    const lineColorBase = isLight ? 0.12 : 0.18;

    const w = canvas.width;
    const h = canvas.height;
    const maxDist = 130;

    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      d.x += d.vx;
      d.y += d.vy;

      if (d.x < 0) d.x = w;
      else if (d.x > w) d.x = 0;
      if (d.y < 0) d.y = h;
      else if (d.y > h) d.y = 0;

      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();

      for (let j = i + 1; j < dots.length; j++) {
        const d2 = dots[j];
        const dx = d2.x - d.x;
        const dy = d2.y - d.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * lineColorBase;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d2.x, d2.y);
          ctx.strokeStyle = isLight ? `rgba(0, 0, 0, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', resize);
  resize();
  animate();
}

/**
 * Theme Initialization and Toggle Handling
 */
function initTheme() {
  const savedTheme = localStorage.getItem('openlink_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.textContent = savedTheme === 'dark' ? 'Light' : 'Dark';
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('openlink_theme', next);
      toggleBtn.textContent = next === 'dark' ? 'Light' : 'Dark';
    });
  }
}

/**
 * Returns the batch name from the current hash route, or null for the create page.
 */
function getRouteName() {
  const hash = window.location.hash.trim();
  if (hash && hash !== '#/' && hash !== '#' && hash !== '#/create') {
    return hash.replace(/^#\/?/, '');
  }
  return null;
}

/**
 * Route Handler based on window.location.hash
 */
async function handleRoute() {
  const name = getRouteName();
  if (name) {
    try {
      await renderViewPage(name);
    } catch (err) {
      console.error('Failed to render batch view:', err);
    }
  } else {
    renderCreatePage();
  }
}

// Global Event Listeners
window.addEventListener('hashchange', () => {
  handleRoute().catch((err) => console.error('Route error:', err));
});
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initBackgroundCanvas();
  handleRoute().catch((err) => console.error('Route error:', err));
});
