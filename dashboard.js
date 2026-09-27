/* ============================================================
   HAR ANIMASI — VOICE ACTOR PORTAL
   dashboard.js — voice actor area:
   dashboard, profile, auditions, notifications, settings
   ============================================================ */

const MAX_SAMPLE_SIZE_MB = 15;

// If an admin somehow lands on a voice-actor-only page, send them to their
// own area instead of showing them an empty/broken voice-actor dashboard.
function bounceAdminAway(profile) {
  if (profile && profile.role === 'admin') {
    location.href = 'admin';
    return true;
  }
  return false;
}

// ============================================================
// DASHBOARD (dashboard)
// ============================================================
async function initDashboardPage() {
  if (!requireSupabaseReady()) return;
  const session = await requireAuth();
  if (!session) return;
  const profile = await renderAppShell('dashboard', 'Dashboard');
  if (!profile) return;
  if (bounceAdminAway(profile)) return;

  const [{ data: apps, error: appsErr }, { count: sampleCount }] = await Promise.all([
    supabaseClient
      .from('applications')
      .select('id, status, created_at, castings(id, title, deadline), casting_characters(id, name)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false }),
    supabaseClient
      .from('voice_samples')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
  ]);

  const content = document.getElementById('pageContent');

  if (appsErr) {
    content.innerHTML = `<div class="state-box">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      <div class="state-title">Something went wrong</div><p>${escapeHtml(appsErr.message)}</p>
    </div>`;
    return;
  }

  const list = apps || [];
  const counts = {
    total: list.length,
    review: list.filter(a => a.status === 'pending' || a.status === 'reviewing').length,
    shortlisted: list.filter(a => a.status === 'shortlisted').length,
    selected: list.filter(a => a.status === 'selected').length
  };

  const displayName = profile.stage_name || profile.full_name;

  content.innerHTML = `
    <div class="card mb-16" style="display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;">
      <div>
        <div class="page-header" style="margin-bottom:0;">
          <h1 style="font-size:22px;">WELCOME BACK, ${escapeHtml(displayName).toUpperCase()}</h1>
          <p class="text-secondary">Here's how your voice acting journey with HAR Animasi is going.</p>
        </div>
      </div>
      <a href="casting" class="btn btn-primary">BROWSE OPEN CASTING</a>
    </div>

    ${!sampleCount ? `
    <div class="card mb-16" style="border-left:4px solid var(--accent);">
      <div class="flex items-center justify-between gap-12" style="flex-wrap:wrap;">
        <div class="flex items-center gap-12">
          <svg class="icon" viewBox="0 0 24 24" style="color:var(--accent);"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>
          <div><strong>Add a voice sample</strong><div class="text-secondary" style="font-size:12.5px;">Upload a short clip to your profile so admins can hear your voice before you audition.</div></div>
        </div>
        <a href="profile" class="btn btn-secondary btn-sm">COMPLETE PROFILE</a>
      </div>
    </div>` : ''}

    <div class="grid grid-4 mb-16">
      <div class="card stat-card">
        <div class="stat-icon"><svg class="icon" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></div>
        <div class="stat-value">${counts.total}</div>
        <div class="stat-label">Total Auditions</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon"><svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
        <div class="stat-value">${counts.review}</div>
        <div class="stat-label">In Review</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon"><svg class="icon" viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg></div>
        <div class="stat-value">${counts.shortlisted}</div>
        <div class="stat-label">Shortlisted</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon"><svg class="icon" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></div>
        <div class="stat-value">${counts.selected}</div>
        <div class="stat-label">Selected</div>
      </div>
    </div>

    <div class="card">
      <div class="flex items-center justify-between mb-16">
        <h3 style="font-family:var(--font-display); font-size:15px; font-weight:800; text-transform:uppercase;">Recent Auditions</h3>
        <a href="auditions" class="text-secondary" style="font-size:12.5px; font-weight:700;">VIEW ALL →</a>
      </div>
      <div id="recentAuditionsList">
        ${list.length === 0 ? `
          <div class="state-box">
            <svg class="icon" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            <div class="state-title">NO AUDITIONS YET</div>
            <p>Browse open casting calls and submit your first audition.</p>
          </div>
        ` : list.slice(0, 5).map(a => `
          <div class="list-row">
            <div>
              <div style="font-weight:700; font-size:14px;">${escapeHtml(a.casting_characters?.name || '-')}</div>
              <div class="text-secondary" style="font-size:12.5px;">${escapeHtml(a.castings?.title || '-')} · ${formatDate(a.created_at)}</div>
            </div>
            <span class="badge ${statusBadgeClass(a.status)}">${escapeHtml(a.status)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ============================================================
// PROFILE (profile)
// ============================================================
let pendingDeleteSample = null;

async function initProfilePage() {
  if (!requireSupabaseReady()) return;
  const session = await requireAuth();
  if (!session) return;
  const profile = await renderAppShell('profile', 'My Profile');
  if (!profile) return;
  if (bounceAdminAway(profile)) return;

  const voiceTypeSelect = document.getElementById('voiceType');
  populateVoiceTypeSelect(voiceTypeSelect);

  const form = document.getElementById('profileForm');
  form.fullName.value = profile.full_name || '';
  form.stageName.value = profile.stage_name || '';
  form.age.value = profile.age || '';
  form.city.value = profile.city || '';
  form.whatsapp.value = profile.whatsapp || '';
  form.voiceType.value = profile.voice_type || '';
  form.experience.value = profile.experience || '';
  form.equipment.value = profile.equipment || '';
  form.software.value = profile.software || '';
  form.aboutMe.value = profile.about_me || '';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors(form);

    if (!form.fullName.value.trim()) {
      setFieldError(form.fullName.closest('.field'), 'Full name is required.');
      return;
    }

    const btn = document.getElementById('saveProfileBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Saving...';

    const { error } = await supabaseClient.from('profiles').update({
      full_name: form.fullName.value.trim(),
      stage_name: form.stageName.value.trim() || null,
      age: form.age.value || null,
      city: form.city.value.trim() || null,
      whatsapp: form.whatsapp.value.trim() || null,
      voice_type: form.voiceType.value || null,
      experience: form.experience.value.trim() || null,
      equipment: form.equipment.value.trim() || null,
      software: form.software.value.trim() || null,
      about_me: form.aboutMe.value.trim() || null
    }).eq('id', profile.id);

    btn.disabled = false;
    btn.textContent = 'SAVE CHANGES';

    if (error) {
      showToast('Failed to save profile: ' + error.message, 'error');
      return;
    }
    showToast('Profile updated.', 'success');
  });

  setupSampleUpload(session.user.id);
  await loadVoiceSamples(session.user.id);
}

function setupSampleUpload(userId) {
  const dropzone = document.getElementById('sampleDropzone');
  const fileInput = document.getElementById('sampleFileInput');

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) uploadSample(e.dataTransfer.files[0], userId);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) uploadSample(fileInput.files[0], userId);
    fileInput.value = '';
  });
}

async function uploadSample(file, userId) {
  if (!file.type.startsWith('audio/')) {
    showToast('Please choose an audio file.', 'error');
    return;
  }
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_SAMPLE_SIZE_MB) {
    showToast(`File too large. Max ${MAX_SAMPLE_SIZE_MB}MB.`, 'error');
    return;
  }

  const progressWrap = document.getElementById('uploadProgressWrap');
  const progressFill = document.getElementById('uploadProgressFill');
  progressWrap.classList.remove('hidden');
  progressFill.style.width = '35%';

  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const storagePath = `${userId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(BUCKET_VOICE_SAMPLES)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    progressWrap.classList.add('hidden');
    showToast('Upload failed: ' + uploadError.message, 'error');
    return;
  }

  progressFill.style.width = '100%';

  const { error: insertError } = await supabaseClient.from('voice_samples').insert({
    user_id: userId,
    file_name: file.name,
    storage_path: storagePath,
    sample_type: file.type
  });

  setTimeout(() => progressWrap.classList.add('hidden'), 500);

  if (insertError) {
    showToast('Uploaded, but failed to save record: ' + insertError.message, 'error');
    return;
  }

  showToast('Voice sample uploaded.', 'success');
  await loadVoiceSamples(userId);
}

async function loadVoiceSamples(userId) {
  const listEl = document.getElementById('sampleList');
  listEl.innerHTML = `<div class="card skeleton" style="height:56px;"></div>`;

  const { data, error } = await supabaseClient
    .from('voice_samples')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    listEl.innerHTML = `<p class="text-secondary" style="font-size:13px;">Failed to load samples: ${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    listEl.innerHTML = `<p class="text-secondary" style="font-size:13px;">No voice samples uploaded yet.</p>`;
    return;
  }

  const paths = data.map(s => s.storage_path);
  const { data: signedUrls } = await supabaseClient.storage.from(BUCKET_VOICE_SAMPLES).createSignedUrls(paths, 3600);
  const urlMap = {};
  (signedUrls || []).forEach(s => { urlMap[s.path] = s.signedUrl; });

  listEl.innerHTML = data.map(s => `
    <div class="sample-row">
      <svg class="icon" viewBox="0 0 24 24" style="color:var(--accent);"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
      <span class="name">${escapeHtml(s.file_name)}</span>
      ${urlMap[s.storage_path] ? `<audio controls style="height:32px; max-width:220px;" src="${urlMap[s.storage_path]}"></audio>` : ''}
      <button class="btn btn-danger btn-icon btn-sm" data-id="${s.id}" data-path="${s.storage_path}" aria-label="Delete sample">
        <svg class="icon" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/></svg>
      </button>
    </div>
  `).join('');

  listEl.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      pendingDeleteSample = { id: btn.dataset.id, path: btn.dataset.path, userId };
      openModal('deleteSampleModal');
    });
  });
}

document.addEventListener('click', async (e) => {
  if (!e.target.closest('#confirmDeleteSampleBtn') || !pendingDeleteSample) return;
  const { id, path, userId } = pendingDeleteSample;
  await supabaseClient.storage.from(BUCKET_VOICE_SAMPLES).remove([path]);
  const { error } = await supabaseClient.from('voice_samples').delete().eq('id', id);
  closeModal('deleteSampleModal');
  if (error) {
    showToast('Failed to delete: ' + error.message, 'error');
    return;
  }
  showToast('Sample deleted.', 'success');
  pendingDeleteSample = null;
  loadVoiceSamples(userId);
});

// ============================================================
// AUDITIONS (auditions)
// ============================================================
let allApplications = [];
let auditionReviewPlayer = null;
let playingApplicationId = null;

async function initAuditionsPage() {
  if (!requireSupabaseReady()) return;
  const session = await requireAuth();
  if (!session) return;
  const profile = await renderAppShell('auditions', 'My Auditions');
  if (!profile) return;
  if (bounceAdminAway(profile)) return;

  auditionReviewPlayer = document.getElementById('reviewPlayer');
  auditionReviewPlayer.addEventListener('ended', () => {
    playingApplicationId = null;
    renderApplicationsList(currentStatusFilter());
  });

  const { data, error } = await supabaseClient
    .from('applications')
    .select('id, status, created_at, casting_id, character_id, voice_audition_id, castings(id, title), casting_characters(id, name, category), voice_auditions(id, storage_path, duration_seconds)')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  const listEl = document.getElementById('auditionsList');
  if (error) {
    listEl.innerHTML = `<div class="state-box" style="grid-column:1/-1;"><div class="state-title">Something went wrong</div><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }

  allApplications = data || [];

  document.querySelectorAll('#statusTabs .tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#statusTabs .tab-btn').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderApplicationsList(tab.dataset.status);
    });
  });

  renderApplicationsList('all');
}

function currentStatusFilter() {
  return document.querySelector('#statusTabs .tab-btn.active')?.dataset.status || 'all';
}

function renderApplicationsList(statusFilter) {
  const listEl = document.getElementById('auditionsList');
  const filtered = statusFilter === 'all' ? allApplications : allApplications.filter(a => a.status === statusFilter);

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="state-box" style="grid-column:1/-1;">
      <svg class="icon" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
      <div class="state-title">NO AUDITIONS HERE</div>
      <p>${statusFilter === 'all' ? "You haven't submitted any auditions yet." : 'No auditions with this status.'}</p>
    </div>`;
    return;
  }

  listEl.innerHTML = filtered.map(a => {
    const isPlaying = playingApplicationId === a.id;
    const hasAudio = !!a.voice_auditions?.storage_path;
    return `
    <div class="card">
      <div class="flex items-center justify-between mb-8">
        <span class="badge ${statusBadgeClass(a.status)}">${escapeHtml(a.status)}</span>
        <span class="text-secondary" style="font-size:11.5px;">${formatDate(a.created_at)}</span>
      </div>
      <h3 style="font-family:var(--font-display); font-size:17px; font-weight:800;">${escapeHtml(a.casting_characters?.name || '-')}</h3>
      <div class="text-secondary mb-16" style="font-size:12.5px;">${escapeHtml(a.castings?.title || '-')}</div>
      ${hasAudio ? `
        <button class="btn btn-secondary btn-sm btn-block play-app-audio" data-id="${a.id}" data-path="${a.voice_auditions.storage_path}">
          <svg class="icon" viewBox="0 0 24 24">${isPlaying ? '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>' : '<path d="M5 3l14 9-14 9V3z"/>'}</svg>
          ${isPlaying ? 'PAUSE RECORDING' : 'PLAY MY RECORDING'}
        </button>` : `<a href="casting-detail?id=${a.casting_id}" class="btn btn-outline btn-sm btn-block">VIEW CASTING</a>`}
    </div>
  `; }).join('');

  listEl.querySelectorAll('.play-app-audio').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (playingApplicationId === id && !auditionReviewPlayer.paused) {
        auditionReviewPlayer.pause();
        playingApplicationId = null;
        renderApplicationsList(currentStatusFilter());
        return;
      }
      const url = await getSignedUrl(BUCKET_VOICE_AUDITIONS, btn.dataset.path, 3600);
      if (!url) return;
      auditionReviewPlayer.src = url;
      auditionReviewPlayer.play().catch(() => showToast('Unable to play recording.', 'error'));
      playingApplicationId = id;
      renderApplicationsList(currentStatusFilter());
    });
  });
}

// ============================================================
// NOTIFICATIONS (notifications)
// ============================================================
const NOTIF_ICONS = {
  reviewing: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  shortlisted: '<path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/>',
  selected: '<path d="M20 6L9 17l-5-5"/>',
  rejected: '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>'
};
const DEFAULT_NOTIF_ICON = '<path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>';

async function initNotificationsPage() {
  if (!requireSupabaseReady()) return;
  const session = await requireAuth();
  if (!session) return;
  const profile = await renderAppShell('notifications', 'Notifications');
  if (!profile) return;
  if (bounceAdminAway(profile)) return;

  await loadNotifications(session.user.id);

  document.getElementById('markAllReadBtn').addEventListener('click', async () => {
    const { error } = await supabaseClient
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false);
    if (error) {
      showToast('Failed to update: ' + error.message, 'error');
      return;
    }
    await loadNotifications(session.user.id);
    refreshNotificationBadges(session.user.id);
  });
}

async function loadNotifications(userId) {
  const listEl = document.getElementById('notificationsList');
  const { data, error } = await supabaseClient
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    listEl.innerHTML = `<div class="state-box"><div class="state-title">Something went wrong</div><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }

  if (!data || data.length === 0) {
    listEl.innerHTML = `<div class="state-box">
      <svg class="icon" viewBox="0 0 24 24"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
      <div class="state-title">NO NOTIFICATIONS</div>
      <p>You're all caught up.</p>
    </div>`;
    return;
  }

  listEl.innerHTML = data.map(n => `
    <div class="notif-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}">
      <div class="notif-icon"><svg class="icon" viewBox="0 0 24 24" style="width:18px;height:18px;">${NOTIF_ICONS[n.type] || DEFAULT_NOTIF_ICON}</svg></div>
      <div style="flex:1; min-width:0;">
        <div class="notif-title">${escapeHtml(n.title)}</div>
        <div class="notif-msg">${escapeHtml(n.message)}</div>
        <div class="notif-time">${timeAgo(n.created_at)}</div>
      </div>
    </div>
  `).join('');

  listEl.querySelectorAll('.notif-item.unread').forEach(item => {
    item.addEventListener('click', async () => {
      const id = item.dataset.id;
      item.classList.remove('unread');
      await supabaseClient.from('notifications').update({ is_read: true }).eq('id', id);
      refreshNotificationBadges(userId);
    });
  });
}

// ============================================================
// SETTINGS (settings)
// ============================================================
async function initSettingsPage() {
  if (!requireSupabaseReady()) return;
  const session = await requireAuth();
  if (!session) return;
  const profile = await renderAppShell('settings', 'Settings');
  if (!profile) return;
  if (bounceAdminAway(profile)) return;

  document.getElementById('accountEmail').textContent = session.user.email;

  const form = document.getElementById('passwordForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors(form);

    const newPassword = form.newPassword.value;
    const confirmNewPassword = form.confirmNewPassword.value;

    if (!newPassword || newPassword.length < 6) {
      setFieldError(form.newPassword.closest('.field'), 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setFieldError(form.confirmNewPassword.closest('.field'), 'Passwords do not match.');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Updating...';

    let error;
    try {
      ({ error } = await withTimeout(supabaseClient.auth.updateUser({ password: newPassword }), 15000, 'This is taking too long. Please try again.'));
    } catch (timeoutErr) {
      btn.disabled = false;
      btn.textContent = 'UPDATE PASSWORD';
      showToast(timeoutErr.message, 'error');
      return;
    }

    btn.disabled = false;
    btn.textContent = 'UPDATE PASSWORD';

    if (error) {
      showToast('Failed to update password: ' + error.message, 'error');
      return;
    }
    form.reset();
    showToast('Password updated successfully.', 'success');
  });

  document.getElementById('logoutSettingsBtn').addEventListener('click', logout);
}
