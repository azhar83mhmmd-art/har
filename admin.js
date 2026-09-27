/* ============================================================
   HAR ANIMASI — VOICE ACTOR PORTAL
   admin.js — admin area:
   admin, admin-castings, admin-characters,
   admin-applications, admin-actors
   ============================================================ */

// ============================================================
// SHARED HELPERS
// ============================================================
function errorBox(message) {
  return `<div class="state-box">
    <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
    <div class="state-title">Something went wrong</div><p>${escapeHtml(message)}</p>
  </div>`;
}
function emptyBox(title, message) {
  return `<div class="state-box">
    <svg class="icon" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
    <div class="state-title">${escapeHtml(title)}</div><p>${escapeHtml(message)}</p>
  </div>`;
}
function friendlyDbError(error) {
  if (!error) return 'Unknown error.';
  if (error.code === '23503') return 'This cannot be deleted because voice actors have already applied to it. Try deactivating or archiving it instead.';
  return error.message;
}
function closeAdminModal() {
  document.getElementById('modalRoot').innerHTML = '';
  const player = document.getElementById('adminReviewPlayer');
  if (player) player.pause();
}

// ============================================================
// ADMIN OVERVIEW (admin)
// ============================================================
async function initAdminOverview() {
  if (!requireSupabaseReady()) return;
  const profile = await requireAdmin();
  if (!profile) return;
  await renderAppShell('overview', 'Admin Overview');

  const [
    { count: actorCount },
    { count: openCastingCount },
    { count: pendingCount },
    { count: auditionCount },
    { data: recentApps, error }
  ] = await Promise.all([
    supabaseClient.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'voice_actor'),
    supabaseClient.from('castings').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabaseClient.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseClient.from('voice_auditions').select('id', { count: 'exact', head: true }),
    supabaseClient
      .from('applications')
      .select('id, status, created_at, profiles(full_name, stage_name), castings(id, title), casting_characters(name)')
      .order('created_at', { ascending: false })
      .limit(8)
  ]);

  const content = document.getElementById('pageContent');
  if (error) { content.innerHTML = errorBox(error.message); return; }

  content.innerHTML = `
    <div class="grid grid-4 mb-16">
      <div class="card stat-card">
        <div class="stat-icon"><svg class="icon" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div>
        <div class="stat-value">${actorCount ?? 0}</div><div class="stat-label">Voice Actors</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon"><svg class="icon" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/></svg></div>
        <div class="stat-value">${openCastingCount ?? 0}</div><div class="stat-label">Open Castings</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon"><svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div>
        <div class="stat-value">${pendingCount ?? 0}</div><div class="stat-label">Pending Review</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon"><svg class="icon" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></div>
        <div class="stat-value">${auditionCount ?? 0}</div><div class="stat-label">Total Auditions</div>
      </div>
    </div>

    <div class="grid grid-3 mb-16">
      <a href="admin-castings" class="card card-hover" style="display:block;"><h4 class="mb-8" style="font-weight:800;">MANAGE CASTINGS</h4><p class="text-secondary" style="font-size:13px;">Create casting calls and their characters.</p></a>
      <a href="admin-applications" class="card card-hover" style="display:block;"><h4 class="mb-8" style="font-weight:800;">REVIEW APPLICATIONS</h4><p class="text-secondary" style="font-size:13px;">Listen to auditions and update status.</p></a>
      <a href="admin-actors" class="card card-hover" style="display:block;"><h4 class="mb-8" style="font-weight:800;">VOICE ACTORS</h4><p class="text-secondary" style="font-size:13px;">Browse and manage registered actors.</p></a>
    </div>

    <div class="card">
      <div class="flex items-center justify-between mb-16">
        <h3 style="font-family:var(--font-display); font-size:15px; font-weight:800; text-transform:uppercase;">Recent Applications</h3>
        <a href="admin-applications" class="text-secondary" style="font-size:12.5px; font-weight:700;">VIEW ALL →</a>
      </div>
      ${!recentApps || recentApps.length === 0 ? emptyBox('NO APPLICATIONS YET', 'Applications will appear here once voice actors start auditioning.') : `
      <div class="table-wrap" style="border:none;">
        <table class="data-table">
          <thead><tr><th>Actor</th><th>Character</th><th>Casting</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>${recentApps.map(a => `
            <tr>
              <td class="cell-title">${escapeHtml(a.profiles?.stage_name || a.profiles?.full_name || '-')}</td>
              <td>${escapeHtml(a.casting_characters?.name || '-')}</td>
              <td>${escapeHtml(a.castings?.title || '-')}</td>
              <td><span class="badge ${statusBadgeClass(a.status)}">${escapeHtml(a.status)}</span></td>
              <td>${formatDate(a.created_at)}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>`}
    </div>
  `;
}

// ============================================================
// ADMIN CASTINGS (admin-castings)
// ============================================================
async function initAdminCastings() {
  if (!requireSupabaseReady()) return;
  const profile = await requireAdmin();
  if (!profile) return;
  await renderAppShell('castings', 'Castings');

  document.getElementById('newCastingBtn').addEventListener('click', () => openCastingModal());
  await loadCastingsTable();
}

async function loadCastingsTable() {
  const wrap = document.getElementById('castingsTableWrap');
  const { data, error } = await supabaseClient
    .from('castings')
    .select('*, casting_characters(count)')
    .order('created_at', { ascending: false });

  if (error) { wrap.innerHTML = errorBox(error.message); return; }
  if (!data || data.length === 0) { wrap.innerHTML = emptyBox('NO CASTINGS YET', 'Create your first casting call to get started.'); return; }

  wrap.innerHTML = `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>Title</th><th>Voice Type</th><th>Age Range</th><th>Deadline</th><th>Status</th><th>Characters</th><th>Actions</th></tr></thead>
    <tbody>${data.map(c => `
      <tr>
        <td class="cell-title">${escapeHtml(c.title)}</td>
        <td>${escapeHtml(c.voice_type || '-')}</td>
        <td>${escapeHtml(c.age_range || '-')}</td>
        <td>${formatDate(c.deadline)}</td>
        <td><span class="badge ${statusBadgeClass(c.status)}">${escapeHtml(c.status)}</span></td>
        <td>${c.casting_characters?.[0]?.count ?? 0}</td>
        <td><div class="table-actions">
          <a href="admin-characters?casting=${c.id}" class="btn btn-outline btn-sm">CHARACTERS</a>
          <button class="btn btn-secondary btn-sm" data-edit="${c.id}">EDIT</button>
          <button class="btn btn-danger btn-sm" data-delete="${c.id}" data-title="${escapeHtml(c.title)}">DELETE</button>
        </div></td>
      </tr>
    `).join('')}</tbody>
  </table></div>`;

  wrap.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => openCastingModal(data.find(c => c.id === btn.dataset.edit))));
  wrap.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', () => confirmDeleteCasting(btn.dataset.delete, btn.dataset.title)));
}

function openCastingModal(existing) {
  const isEdit = !!existing;
  document.getElementById('modalRoot').innerHTML = `
  <div class="modal-overlay active">
    <div class="modal modal-wide">
      <div class="modal-title">${isEdit ? 'EDIT CASTING' : 'NEW CASTING'}</div>
      <div class="modal-body">
        <form id="castingForm" novalidate>
          <div class="field"><label class="label">Title</label><input class="input" name="title" value="${existing ? escapeHtml(existing.title) : ''}"><div class="field-error"></div></div>
          <div class="field"><label class="label">Description</label><textarea class="textarea" name="description">${existing ? escapeHtml(existing.description || '') : ''}</textarea></div>
          <div class="form-row-2">
            <div class="field"><label class="label">Voice Type</label><input class="input" name="voice_type" value="${existing ? escapeHtml(existing.voice_type || '') : ''}" placeholder="e.g. Teen / Male"></div>
            <div class="field"><label class="label">Age Range</label><input class="input" name="age_range" value="${existing ? escapeHtml(existing.age_range || '') : ''}" placeholder="e.g. 15 - 22 tahun"></div>
          </div>
          <div class="field"><label class="label">Requirements</label><textarea class="textarea" name="requirements">${existing ? escapeHtml(existing.requirements || '') : ''}</textarea></div>
          <div class="field"><label class="label">Voice Direction</label><textarea class="textarea" name="voice_direction">${existing ? escapeHtml(existing.voice_direction || '') : ''}</textarea></div>
          <div class="field"><label class="label">Default Audition Script</label><textarea class="textarea" name="audition_script">${existing ? escapeHtml(existing.audition_script || '') : ''}</textarea></div>
          <div class="form-row-2">
            <div class="field"><label class="label">Deadline</label><input class="input" type="date" name="deadline" value="${existing && existing.deadline ? existing.deadline.slice(0, 10) : ''}"></div>
            <div class="field"><label class="label">Status</label>
              <select class="select" name="status">
                ${['draft', 'open', 'closed', 'archived'].map(s => `<option value="${s}" ${existing && existing.status === s ? 'selected' : ''}>${s.toUpperCase()}</option>`).join('')}
              </select>
            </div>
          </div>
        </form>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="cancelCastingModal">CANCEL</button>
        <button class="btn btn-primary" id="saveCastingBtn">${isEdit ? 'SAVE CHANGES' : 'CREATE CASTING'}</button>
      </div>
    </div>
  </div>`;
  document.getElementById('cancelCastingModal').addEventListener('click', closeAdminModal);
  document.getElementById('saveCastingBtn').addEventListener('click', () => saveCasting(existing?.id));
}

async function saveCasting(id) {
  const form = document.getElementById('castingForm');
  const title = form.title.value.trim();
  if (!title) { setFieldError(form.title.closest('.field'), 'Title is required.'); return; }

  const payload = {
    title,
    description: form.description.value.trim() || null,
    voice_type: form.voice_type.value.trim() || null,
    age_range: form.age_range.value.trim() || null,
    requirements: form.requirements.value.trim() || null,
    voice_direction: form.voice_direction.value.trim() || null,
    audition_script: form.audition_script.value.trim() || null,
    deadline: form.deadline.value ? new Date(form.deadline.value).toISOString() : null,
    status: form.status.value
  };

  const btn = document.getElementById('saveCastingBtn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving...';

  let error;
  if (id) {
    ({ error } = await supabaseClient.from('castings').update(payload).eq('id', id));
  } else {
    const profile = await getCurrentProfile();
    ({ error } = await supabaseClient.from('castings').insert({ ...payload, created_by: profile?.id }));
  }

  btn.disabled = false; btn.textContent = id ? 'SAVE CHANGES' : 'CREATE CASTING';

  if (error) { showToast('Failed to save: ' + error.message, 'error'); return; }
  showToast(id ? 'Casting updated.' : 'Casting created.', 'success');
  closeAdminModal();
  loadCastingsTable();
}

function confirmDeleteCasting(id, title) {
  document.getElementById('modalRoot').innerHTML = `<div class="modal-overlay active"><div class="modal">
    <div class="modal-title">DELETE CASTING?</div>
    <div class="modal-body">This will permanently delete "<strong>${escapeHtml(title)}</strong>" and all its characters and auditions. If voice actors have already applied, consider archiving it instead.</div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="cancelDeleteCasting">CANCEL</button>
      <button class="btn btn-danger" id="confirmDeleteCastingBtn">DELETE</button>
    </div></div></div>`;
  document.getElementById('cancelDeleteCasting').addEventListener('click', closeAdminModal);
  document.getElementById('confirmDeleteCastingBtn').addEventListener('click', async () => {
    const { error } = await supabaseClient.from('castings').delete().eq('id', id);
    closeAdminModal();
    if (error) { showToast(friendlyDbError(error), 'error', 6000); return; }
    showToast('Casting deleted.', 'success');
    loadCastingsTable();
  });
}

// ============================================================
// ADMIN CHARACTERS (admin-characters?casting=<id>)
// ============================================================
let currentAdminCastingId = null;

async function initAdminCharacters() {
  if (!requireSupabaseReady()) return;
  const profile = await requireAdmin();
  if (!profile) return;
  await renderAppShell('castings', 'Characters');

  currentAdminCastingId = getQueryParam('casting');
  if (!currentAdminCastingId) {
    document.getElementById('charactersTableWrap').innerHTML = emptyBox('NO CASTING SELECTED', 'Go back and choose a casting first.');
    document.getElementById('newCharacterBtn').classList.add('hidden');
    return;
  }

  const { data: casting, error: castingErr } = await supabaseClient.from('castings').select('*').eq('id', currentAdminCastingId).single();
  if (castingErr || !casting) {
    document.getElementById('castingContextHeader').innerHTML = `<h1>CHARACTERS</h1><p class="text-secondary">Casting not found.</p>`;
    document.getElementById('newCharacterBtn').classList.add('hidden');
    return;
  }

  document.getElementById('castingContextHeader').innerHTML = `<h1>${escapeHtml(casting.title).toUpperCase()}</h1><p class="text-secondary">Manage the characters voice actors can audition for in this casting.</p>`;
  document.getElementById('newCharacterBtn').addEventListener('click', () => openCharacterModal());

  await loadCharactersTable();
}

async function loadCharactersTable() {
  const wrap = document.getElementById('charactersTableWrap');
  const { data, error } = await supabaseClient
    .from('casting_characters')
    .select('*')
    .eq('casting_id', currentAdminCastingId)
    .order('sort_order', { ascending: true });

  if (error) { wrap.innerHTML = errorBox(error.message); return; }
  if (!data || data.length === 0) { wrap.innerHTML = emptyBox('NO CHARACTERS YET', 'Add the first character voice actors can audition for.'); return; }

  wrap.innerHTML = `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>#</th><th>Name</th><th>Category</th><th>Voice Type</th><th>Active</th><th>Sample</th><th>Actions</th></tr></thead>
    <tbody>${data.map(c => `
      <tr>
        <td>${c.sort_order}</td>
        <td class="cell-title">${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.category || '-')}</td>
        <td>${escapeHtml(c.voice_type || '-')}</td>
        <td><label class="toggle-switch"><input type="checkbox" data-toggle-active="${c.id}" ${c.is_active ? 'checked' : ''}><span class="toggle-track"></span></label></td>
        <td>
          ${c.sample_url ? `<audio controls style="height:30px; max-width:150px; margin-bottom:6px; display:block;" src="${c.sample_url}"></audio>` : ''}
          <button class="btn btn-outline btn-sm" data-upload-sample="${c.id}">${c.sample_url ? 'REPLACE' : 'UPLOAD'} SAMPLE</button>
        </td>
        <td><div class="table-actions">
          <button class="btn btn-secondary btn-sm" data-edit-char="${c.id}">EDIT</button>
          <button class="btn btn-danger btn-sm" data-delete-char="${c.id}" data-name="${escapeHtml(c.name)}">DELETE</button>
        </div></td>
      </tr>
    `).join('')}</tbody>
  </table></div>`;

  wrap.querySelectorAll('[data-toggle-active]').forEach(cb => cb.addEventListener('change', async () => {
    const { error } = await supabaseClient.from('casting_characters').update({ is_active: cb.checked }).eq('id', cb.dataset.toggleActive);
    if (error) { showToast('Failed: ' + error.message, 'error'); cb.checked = !cb.checked; return; }
  }));
  wrap.querySelectorAll('[data-upload-sample]').forEach(btn => btn.addEventListener('click', () => triggerCharacterSampleUpload(btn.dataset.uploadSample)));
  wrap.querySelectorAll('[data-edit-char]').forEach(btn => btn.addEventListener('click', () => openCharacterModal(data.find(c => c.id === btn.dataset.editChar))));
  wrap.querySelectorAll('[data-delete-char]').forEach(btn => btn.addEventListener('click', () => confirmDeleteCharacter(btn.dataset.deleteChar, btn.dataset.name)));
}

function openCharacterModal(existing) {
  const isEdit = !!existing;
  document.getElementById('modalRoot').innerHTML = `
  <div class="modal-overlay active">
    <div class="modal modal-wide">
      <div class="modal-title">${isEdit ? 'EDIT CHARACTER' : 'ADD CHARACTER'}</div>
      <div class="modal-body">
        <form id="characterForm" novalidate>
          <div class="form-row-2">
            <div class="field"><label class="label">Name</label><input class="input" name="name" value="${existing ? escapeHtml(existing.name) : ''}"><div class="field-error"></div></div>
            <div class="field"><label class="label">Category</label><input class="input" name="category" value="${existing ? escapeHtml(existing.category || '') : ''}"></div>
          </div>
          <div class="form-row-2">
            <div class="field"><label class="label">Voice Type</label><input class="input" name="voice_type" value="${existing ? escapeHtml(existing.voice_type || '') : ''}"></div>
            <div class="field"><label class="label">Sort Order</label><input class="input" type="number" name="sort_order" value="${existing ? existing.sort_order : 0}"></div>
          </div>
          <div class="field"><label class="label">Description</label><textarea class="textarea" name="description">${existing ? escapeHtml(existing.description || '') : ''}</textarea></div>
          <div class="field"><label class="label">Voice Direction</label><textarea class="textarea" name="voice_direction">${existing ? escapeHtml(existing.voice_direction || '') : ''}</textarea></div>
          <div class="field"><label class="label">Audition Script</label><textarea class="textarea" name="audition_script">${existing ? escapeHtml(existing.audition_script || '') : ''}</textarea></div>
          <label class="checkbox-row"><input type="checkbox" name="is_active" ${!existing || existing.is_active ? 'checked' : ''}><span>Active — visible to voice actors</span></label>
        </form>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="cancelCharacterModal">CANCEL</button>
        <button class="btn btn-primary" id="saveCharacterBtn">${isEdit ? 'SAVE CHANGES' : 'ADD CHARACTER'}</button>
      </div>
    </div>
  </div>`;
  document.getElementById('cancelCharacterModal').addEventListener('click', closeAdminModal);
  document.getElementById('saveCharacterBtn').addEventListener('click', () => saveCharacter(existing?.id));
}

async function saveCharacter(id) {
  const form = document.getElementById('characterForm');
  const name = form.name.value.trim();
  if (!name) { setFieldError(form.name.closest('.field'), 'Name is required.'); return; }

  const payload = {
    casting_id: currentAdminCastingId,
    name,
    category: form.category.value.trim() || null,
    voice_type: form.voice_type.value.trim() || null,
    sort_order: parseInt(form.sort_order.value, 10) || 0,
    description: form.description.value.trim() || null,
    voice_direction: form.voice_direction.value.trim() || null,
    audition_script: form.audition_script.value.trim() || null,
    is_active: form.is_active.checked
  };

  const btn = document.getElementById('saveCharacterBtn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving...';

  let error;
  if (id) ({ error } = await supabaseClient.from('casting_characters').update(payload).eq('id', id));
  else ({ error } = await supabaseClient.from('casting_characters').insert(payload));

  btn.disabled = false; btn.textContent = id ? 'SAVE CHANGES' : 'ADD CHARACTER';

  if (error) { showToast('Failed to save: ' + error.message, 'error'); return; }
  showToast(id ? 'Character updated.' : 'Character added.', 'success');
  closeAdminModal();
  loadCharactersTable();
}

function confirmDeleteCharacter(id, name) {
  document.getElementById('modalRoot').innerHTML = `<div class="modal-overlay active"><div class="modal">
    <div class="modal-title">DELETE CHARACTER?</div>
    <div class="modal-body">This will permanently delete "<strong>${escapeHtml(name)}</strong>". If voice actors have already applied for this character, deletion will be blocked — deactivate it instead.</div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="cancelDeleteChar">CANCEL</button>
      <button class="btn btn-danger" id="confirmDeleteCharBtn">DELETE</button>
    </div></div></div>`;
  document.getElementById('cancelDeleteChar').addEventListener('click', closeAdminModal);
  document.getElementById('confirmDeleteCharBtn').addEventListener('click', async () => {
    const { error } = await supabaseClient.from('casting_characters').delete().eq('id', id);
    closeAdminModal();
    if (error) { showToast(friendlyDbError(error), 'error', 6000); return; }
    showToast('Character deleted.', 'success');
    loadCharactersTable();
  });
}

function triggerCharacterSampleUpload(characterId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'audio/*';
  input.classList.add('hidden');
  document.body.appendChild(input);
  input.addEventListener('change', async () => {
    if (input.files[0]) await uploadCharacterSample(characterId, input.files[0]);
    input.remove();
  });
  input.click();
}

async function uploadCharacterSample(characterId, file) {
  if (!file.type.startsWith('audio/')) { showToast('Please choose an audio file.', 'error'); return; }
  showToast('Uploading sample...', 'info', 2500);

  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const path = `${currentAdminCastingId}/${characterId}/${Date.now()}-${safeName}`;

  const { error: upErr } = await supabaseClient.storage
    .from(BUCKET_CHARACTER_SAMPLES)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) { showToast('Upload failed: ' + upErr.message, 'error'); return; }

  const { data: pub } = supabaseClient.storage.from(BUCKET_CHARACTER_SAMPLES).getPublicUrl(path);

  const { error: updErr } = await supabaseClient
    .from('casting_characters')
    .update({ sample_storage_path: path, sample_url: pub.publicUrl })
    .eq('id', characterId);

  if (updErr) { showToast('Failed to save sample: ' + updErr.message, 'error'); return; }
  showToast('Sample uploaded.', 'success');
  loadCharactersTable();
}

// ============================================================
// ADMIN APPLICATIONS (admin-applications)
// ============================================================
let allAdminApplications = [];
let adminReviewPlayerEl = null;
let adminPlayingId = null;

async function initAdminApplications() {
  if (!requireSupabaseReady()) return;
  const profile = await requireAdmin();
  if (!profile) return;
  await renderAppShell('applications', 'Applications');

  adminReviewPlayerEl = document.getElementById('adminReviewPlayer');

  const [{ data: castings }, { data: apps, error }] = await Promise.all([
    supabaseClient.from('castings').select('id, title').order('created_at', { ascending: false }),
    supabaseClient
      .from('applications')
      .select('id, status, created_at, casting_id, character_id, user_id, profiles(id, full_name, stage_name, whatsapp), castings(id, title), casting_characters(id, name, category), voice_auditions(id, storage_path, duration_seconds, mime_type)')
      .order('created_at', { ascending: false })
  ]);

  const select = document.getElementById('castingFilterSelect');
  (castings || []).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.title;
    select.appendChild(opt);
  });
  select.addEventListener('change', renderAdminApplications);

  if (error) { document.getElementById('applicationsTableWrap').innerHTML = errorBox(error.message); return; }
  allAdminApplications = apps || [];

  document.querySelectorAll('#appStatusTabs .tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#appStatusTabs .tab-btn').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderAdminApplications();
    });
  });

  renderAdminApplications();

  // Deep link from the overview page's "recent applications" table.
  const reviewId = getQueryParam('review');
  if (reviewId) {
    const app = allAdminApplications.find(a => a.id === reviewId);
    if (app) openReviewModal(app);
  }
}

function renderAdminApplications() {
  const statusFilter = document.querySelector('#appStatusTabs .tab-btn.active')?.dataset.status || 'all';
  const castingFilter = document.getElementById('castingFilterSelect').value;

  let filtered = allAdminApplications;
  if (statusFilter !== 'all') filtered = filtered.filter(a => a.status === statusFilter);
  if (castingFilter !== 'all') filtered = filtered.filter(a => a.casting_id === castingFilter);

  const wrap = document.getElementById('applicationsTableWrap');
  if (filtered.length === 0) { wrap.innerHTML = emptyBox('NO APPLICATIONS', 'No applications match this filter.'); return; }

  wrap.innerHTML = `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>Actor</th><th>Character</th><th>Casting</th><th>Status</th><th>Submitted</th><th>Recording</th><th>Actions</th></tr></thead>
    <tbody>${filtered.map(a => {
      const hasAudio = !!a.voice_auditions?.storage_path;
      const isPlaying = adminPlayingId === a.id;
      return `
      <tr>
        <td><div class="cell-title">${escapeHtml(a.profiles?.stage_name || a.profiles?.full_name || '-')}</div><div class="cell-sub">${escapeHtml(a.profiles?.full_name || '')}</div></td>
        <td>${escapeHtml(a.casting_characters?.name || '-')}</td>
        <td>${escapeHtml(a.castings?.title || '-')}</td>
        <td><span class="badge ${statusBadgeClass(a.status)}">${escapeHtml(a.status)}</span></td>
        <td>${formatDate(a.created_at)}</td>
        <td>${hasAudio ? `
          <button class="btn btn-outline btn-sm btn-icon quick-play-audio" data-id="${a.id}" data-path="${escapeHtml(a.voice_auditions.storage_path)}" aria-label="Test play recording">
            <svg class="icon" viewBox="0 0 24 24">${isPlaying ? '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>' : '<path d="M5 3l14 9-14 9V3z"/>'}</svg>
          </button>` : `<span class="text-secondary" style="font-size:12px;">No audio</span>`}</td>
        <td><button class="btn btn-primary btn-sm" data-review="${a.id}">REVIEW</button></td>
      </tr>
    `; }).join('')}</tbody>
  </table></div>`;

  wrap.querySelectorAll('.quick-play-audio').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (adminPlayingId === id && !adminReviewPlayerEl.paused) {
        adminReviewPlayerEl.pause();
        adminPlayingId = null;
        renderAdminApplications();
        return;
      }
      const url = await getSignedUrl(BUCKET_VOICE_AUDITIONS, btn.dataset.path, 3600);
      if (!url) return;
      adminReviewPlayerEl.src = url;
      adminReviewPlayerEl.play().catch(() => showToast('Unable to play recording.', 'error'));
      adminPlayingId = id;
      renderAdminApplications();
    });
  });
  adminReviewPlayerEl.onended = () => { adminPlayingId = null; renderAdminApplications(); };

  wrap.querySelectorAll('[data-review]').forEach(btn => {
    btn.addEventListener('click', () => {
      const app = allAdminApplications.find(x => x.id === btn.dataset.review);
      if (app) openReviewModal(app);
    });
  });
}

function openReviewModal(app) {
  const hasAudio = !!app.voice_auditions?.storage_path;
  const duration = app.voice_auditions?.duration_seconds ? formatDuration(app.voice_auditions.duration_seconds) : '-';
  const mimeType = app.voice_auditions?.mime_type || '-';

  document.getElementById('modalRoot').innerHTML = `
  <div class="modal-overlay active">
    <div class="modal modal-wide">
      <div class="modal-title">REVIEW AUDITION</div>
      <div class="modal-body">
        <div class="detail-drawer-row"><span>Voice Actor</span><span>${escapeHtml(app.profiles?.stage_name || app.profiles?.full_name || '-')}</span></div>
        <div class="detail-drawer-row"><span>WhatsApp</span><span>${escapeHtml(app.profiles?.whatsapp || '-')}</span></div>
        <div class="detail-drawer-row"><span>Casting</span><span>${escapeHtml(app.castings?.title || '-')}</span></div>
        <div class="detail-drawer-row"><span>Character</span><span>${escapeHtml(app.casting_characters?.name || '-')}</span></div>
        <div class="detail-drawer-row"><span>Status</span><span><span class="badge ${statusBadgeClass(app.status)}">${escapeHtml(app.status)}</span></span></div>
        ${hasAudio ? `
        <div class="detail-drawer-row"><span>Duration</span><span>${escapeHtml(duration)}</span></div>
        <div class="detail-drawer-row"><span>Format</span><span>${escapeHtml(mimeType)}</span></div>
        ` : ''}
        <div class="mt-16" style="display:flex; flex-direction:column; gap:10px;">
          ${hasAudio ? `
          <button class="btn btn-secondary btn-block" id="reviewPlayBtn">
            <svg class="icon" viewBox="0 0 24 24" id="reviewPlayIcon"><path d="M5 3l14 9-14 9V3z"/></svg>
            <span id="reviewPlayLabel">PLAY RECORDING</span>
          </button>
          <button class="btn btn-outline btn-block" id="reviewOpenTabBtn">
            <svg class="icon" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6M10 14L21 3"/></svg>
            OPEN / DOWNLOAD IN NEW TAB
          </button>
          ` : `<p class="text-secondary" style="font-size:13px;">No recording attached to this application.</p>`}
        </div>
      </div>
      <div class="modal-actions" style="flex-wrap:wrap;">
        <button class="btn btn-secondary" id="closeReviewModal">CLOSE</button>
        <button class="btn btn-outline" data-status="reviewing">MARK REVIEWING</button>
        <button class="btn btn-outline" data-status="shortlisted">SHORTLIST</button>
        <button class="btn btn-primary" data-status="selected">SELECT</button>
        <button class="btn btn-danger" data-status="rejected">REJECT</button>
      </div>
    </div>
  </div>`;

  document.getElementById('closeReviewModal').addEventListener('click', closeAdminModal);

  if (hasAudio) {
    document.getElementById('reviewPlayBtn').addEventListener('click', async () => {
      if (adminPlayingId === app.id && !adminReviewPlayerEl.paused) {
        adminReviewPlayerEl.pause();
        adminPlayingId = null;
        updateReviewPlayIcon(false);
        return;
      }
      const url = await getSignedUrl(BUCKET_VOICE_AUDITIONS, app.voice_auditions.storage_path, 3600);
      if (!url) return;
      adminReviewPlayerEl.src = url;
      adminReviewPlayerEl.play().catch(() => showToast('Unable to play recording.', 'error'));
      adminPlayingId = app.id;
      updateReviewPlayIcon(true);
    });
    adminReviewPlayerEl.onended = () => { adminPlayingId = null; updateReviewPlayIcon(false); };

    document.getElementById('reviewOpenTabBtn').addEventListener('click', async () => {
      const url = await getSignedUrl(BUCKET_VOICE_AUDITIONS, app.voice_auditions.storage_path, 3600);
      if (!url) return;
      window.open(url, '_blank', 'noopener');
    });
  }

  document.querySelectorAll('#modalRoot [data-status]').forEach(btn => {
    btn.addEventListener('click', () => updateApplicationStatus(app, btn.dataset.status));
  });
}

function updateReviewPlayIcon(isPlaying) {
  const icon = document.getElementById('reviewPlayIcon');
  const label = document.getElementById('reviewPlayLabel');
  if (!icon || !label) return;
  icon.innerHTML = isPlaying ? '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>' : '<path d="M5 3l14 9-14 9V3z"/>';
  label.textContent = isPlaying ? 'PAUSE RECORDING' : 'PLAY RECORDING';
}

async function updateApplicationStatus(app, newStatus) {
  const auditionStatusMap = { pending: 'submitted', reviewing: 'reviewing', shortlisted: 'shortlisted', selected: 'selected', rejected: 'rejected' };

  const { error: appErr } = await supabaseClient.from('applications').update({ status: newStatus }).eq('id', app.id);
  if (appErr) { showToast('Failed to update: ' + appErr.message, 'error'); return; }

  if (app.voice_auditions?.id) {
    await supabaseClient.from('voice_auditions').update({ status: auditionStatusMap[newStatus] || newStatus }).eq('id', app.voice_auditions.id);
  }

  app.status = newStatus;
  showToast('Status updated to ' + newStatus + '.', 'success');
  closeAdminModal();
  renderAdminApplications();
}

// ============================================================
// ADMIN ACTORS (admin-actors)
// ============================================================
let allActors = [];
let currentAdminProfileId = null;

async function initAdminActors() {
  if (!requireSupabaseReady()) return;
  const profile = await requireAdmin();
  if (!profile) return;
  await renderAppShell('actors', 'Voice Actors');
  currentAdminProfileId = profile.id;

  const { data, error } = await supabaseClient.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) { document.getElementById('actorsTableWrap').innerHTML = errorBox(error.message); return; }
  allActors = data || [];

  document.getElementById('actorSearchInput').addEventListener('input', debounce(renderActors, 200));
  renderActors();
}

function renderActors() {
  const q = document.getElementById('actorSearchInput').value.trim().toLowerCase();
  const filtered = !q ? allActors : allActors.filter(a =>
    (a.full_name || '').toLowerCase().includes(q) ||
    (a.stage_name || '').toLowerCase().includes(q) ||
    (a.city || '').toLowerCase().includes(q)
  );

  const wrap = document.getElementById('actorsTableWrap');
  if (filtered.length === 0) { wrap.innerHTML = emptyBox('NO VOICE ACTORS FOUND', 'Try a different search.'); return; }

  wrap.innerHTML = `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>Name</th><th>City</th><th>Voice Type</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
    <tbody>${filtered.map(p => `
      <tr>
        <td><div class="flex items-center gap-12">
          <div class="avatar avatar-sm">${initials(p.stage_name || p.full_name)}</div>
          <div><div class="cell-title">${escapeHtml(p.stage_name || p.full_name)}</div><div class="cell-sub">${escapeHtml(p.full_name)}</div></div>
        </div></td>
        <td>${escapeHtml(p.city || '-')}</td>
        <td>${escapeHtml(p.voice_type || '-')}</td>
        <td><span class="badge ${p.role === 'admin' ? 'badge-info' : ''}">${escapeHtml(p.role)}</span></td>
        <td><span class="badge ${p.status === 'active' ? 'badge-open' : 'badge-rejected'}">${escapeHtml(p.status)}</span></td>
        <td>${formatDate(p.created_at)}</td>
        <td><button class="btn btn-outline btn-sm" data-view="${p.id}">VIEW</button></td>
      </tr>
    `).join('')}</tbody>
  </table></div>`;

  wrap.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => openActorModal(filtered.find(p => p.id === btn.dataset.view))));
}

function openActorModal(actor) {
  const isSelf = actor.id === currentAdminProfileId;
  document.getElementById('modalRoot').innerHTML = `
  <div class="modal-overlay active">
    <div class="modal modal-wide">
      <div class="modal-title">${escapeHtml(actor.stage_name || actor.full_name)}</div>
      <div class="modal-body">
        <div class="detail-drawer-row"><span>Full Name</span><span>${escapeHtml(actor.full_name)}</span></div>
        <div class="detail-drawer-row"><span>Age</span><span>${actor.age || '-'}</span></div>
        <div class="detail-drawer-row"><span>City</span><span>${escapeHtml(actor.city || '-')}</span></div>
        <div class="detail-drawer-row"><span>WhatsApp</span><span>${escapeHtml(actor.whatsapp || '-')}</span></div>
        <div class="detail-drawer-row"><span>Voice Type</span><span>${escapeHtml(actor.voice_type || '-')}</span></div>
        <div class="detail-drawer-row"><span>Equipment</span><span>${escapeHtml(actor.equipment || '-')}</span></div>
        <div class="detail-drawer-row"><span>Software</span><span>${escapeHtml(actor.software || '-')}</span></div>
        <div class="detail-drawer-row"><span>Experience</span><span>${escapeHtml(actor.experience || '-')}</span></div>
        <div class="detail-drawer-row"><span>About</span><span>${escapeHtml(actor.about_me || '-')}</span></div>
        <div class="detail-drawer-row"><span>Joined</span><span>${formatDate(actor.created_at)}</span></div>

        <div class="mt-24" style="display:flex; gap:24px; flex-wrap:wrap;">
          <label class="flex items-center gap-12">
            <span class="toggle-switch"><input type="checkbox" id="actorActiveToggle" ${actor.status === 'active' ? 'checked' : ''}><span class="toggle-track"></span></span>
            <span style="font-size:13px; font-weight:700;">Active Account</span>
          </label>
          <label class="flex items-center gap-12" style="${isSelf ? 'opacity:.4;' : ''}">
            <span class="toggle-switch"><input type="checkbox" id="actorAdminToggle" ${actor.role === 'admin' ? 'checked' : ''} ${isSelf ? 'disabled' : ''}><span class="toggle-track"></span></span>
            <span style="font-size:13px; font-weight:700;">Admin Access${isSelf ? ' (you)' : ''}</span>
          </label>
        </div>

        <div class="mt-24">
          <h4 style="margin-bottom:10px; font-family:var(--font-display); font-size:13px; text-transform:uppercase;">Voice Samples</h4>
          <div id="actorSamplesList" class="text-secondary" style="font-size:13px;">Loading...</div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="closeActorModal">CLOSE</button>
      </div>
    </div>
  </div>`;

  document.getElementById('closeActorModal').addEventListener('click', closeAdminModal);
  document.getElementById('actorActiveToggle').addEventListener('change', (e) => toggleActorField(actor.id, 'status', e.target.checked ? 'active' : 'suspended'));
  if (!isSelf) {
    document.getElementById('actorAdminToggle').addEventListener('change', (e) => toggleActorField(actor.id, 'role', e.target.checked ? 'admin' : 'voice_actor'));
  }

  loadActorSamples(actor.id);
}

async function toggleActorField(actorId, field, value) {
  const { error } = await supabaseClient.from('profiles').update({ [field]: value }).eq('id', actorId);
  if (error) { showToast('Failed to update: ' + error.message, 'error'); return; }
  const actor = allActors.find(a => a.id === actorId);
  if (actor) actor[field] = value;
  showToast('Updated.', 'success');
  renderActors();
}

async function loadActorSamples(actorId) {
  const el = document.getElementById('actorSamplesList');
  const { data, error } = await supabaseClient.from('voice_samples').select('*').eq('user_id', actorId).order('created_at', { ascending: false });

  if (error) { el.innerHTML = 'Failed to load samples.'; return; }
  if (!data || data.length === 0) { el.innerHTML = 'No voice samples uploaded.'; return; }

  const paths = data.map(s => s.storage_path);
  const { data: signed } = await supabaseClient.storage.from(BUCKET_VOICE_SAMPLES).createSignedUrls(paths, 3600);
  const urlMap = {};
  (signed || []).forEach(s => { urlMap[s.path] = s.signedUrl; });

  el.innerHTML = data.map(s => `
    <div class="sample-row">
      <span class="name">${escapeHtml(s.file_name)}</span>
      ${urlMap[s.storage_path] ? `<audio controls style="height:32px; max-width:220px;" src="${urlMap[s.storage_path]}"></audio>` : ''}
    </div>
  `).join('');
}
