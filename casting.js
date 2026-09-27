/* ============================================================
   HAR ANIMASI — VOICE ACTOR PORTAL
   casting.js — Open Casting list + Casting Detail
   ============================================================ */

// ============================================================
// CASTING LIST (casting)
// ============================================================
async function loadCastingList() {
  const list = document.getElementById('castingList');
  if (!list) return;
  if (!requireSupabaseReady()) return;

  list.innerHTML = Array.from({ length: 3 }).map(() => `<div class="card skeleton" style="height:170px;"></div>`).join('');

  const { data, error } = await supabaseClient
    .from('castings')
    .select('id, title, voice_type, age_range, deadline, status, casting_characters(count)')
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (error) {
    list.innerHTML = `<div class="state-box" style="grid-column:1/-1;">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      <div class="state-title">Something went wrong</div>
      <p>${escapeHtml(error.message)}</p>
    </div>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = `<div class="state-box" style="grid-column:1/-1;">
      <svg class="icon" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
      <div class="state-title">NO OPEN CASTING</div>
      <p>There are no open casting calls right now. Check back soon.</p>
    </div>`;
    return;
  }

  list.innerHTML = data.map(c => `
    <div class="card card-hover casting-card">
      <div class="top">
        <h3>${escapeHtml(c.title)}</h3>
        <span class="badge badge-open">Open</span>
      </div>
      <div class="casting-meta">
        <span><svg class="icon" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/></svg>${escapeHtml(c.voice_type || '-')}</span>
        <span><svg class="icon" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z"/></svg>${escapeHtml(c.age_range || '-')}</span>
        <span><svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>${formatDate(c.deadline)}</span>
        <span><svg class="icon" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>${c.casting_characters?.[0]?.count ?? 0} characters</span>
      </div>
      <a href="casting-detail?id=${c.id}" class="btn btn-primary btn-block">VIEW CASTING</a>
    </div>
  `).join('');
}

// ============================================================
// CASTING DETAIL (casting-detail)
// ============================================================
async function loadCastingDetail() {
  const root = document.getElementById('castingDetailRoot');
  if (!root) return;
  if (!requireSupabaseReady()) return;

  const id = getQueryParam('id');
  if (!id) {
    root.innerHTML = `<div class="state-box">
      <div class="state-title">CASTING NOT FOUND</div>
      <p>No casting id was provided.</p>
    </div>`;
    return;
  }

  const { data: casting, error } = await supabaseClient
    .from('castings')
    .select('*, casting_characters(count)')
    .eq('id', id)
    .single();

  if (error || !casting) {
    root.innerHTML = `<div class="state-box">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      <div class="state-title">CASTING NOT FOUND</div>
      <p>This casting may have been closed or removed.</p>
    </div>`;
    return;
  }

  const session = await getSession();
  const charCount = casting.casting_characters?.[0]?.count ?? 0;

  root.innerHTML = `
    <div class="detail-grid">
      <div>
        <div class="page-header">
          <span class="badge badge-open mb-8" style="display:inline-flex;">${escapeHtml(casting.status)}</span>
          <h1>${escapeHtml(casting.title)}</h1>
        </div>

        <div class="detail-block">
          <h4>DESCRIPTION</h4>
          <p>${escapeHtml(casting.description || 'No description provided.')}</p>
        </div>
        <div class="detail-block">
          <h4>REQUIREMENTS</h4>
          <p>${escapeHtml(casting.requirements || '-')}</p>
        </div>
        <div class="detail-block">
          <h4>VOICE DIRECTION</h4>
          <p>${escapeHtml(casting.voice_direction || '-')}</p>
        </div>
      </div>

      <div class="card side-card">
        <div class="side-row"><span>Voice Type</span><span>${escapeHtml(casting.voice_type || '-')}</span></div>
        <div class="side-row"><span>Age Range</span><span>${escapeHtml(casting.age_range || '-')}</span></div>
        <div class="side-row"><span>Deadline</span><span>${formatDate(casting.deadline)}</span></div>
        <div class="side-row"><span>Characters</span><span>${charCount}</span></div>
        <button class="btn btn-primary btn-block mt-16" id="chooseCharacterBtn">CHOOSE CHARACTER</button>
      </div>
    </div>
  `;

  document.getElementById('chooseCharacterBtn').addEventListener('click', async () => {
    if (!session) {
      location.href = `login?next=${encodeURIComponent('character-selection?casting=' + id)}`;
      return;
    }
    location.href = `character-selection?casting=${id}`;
  });
}
