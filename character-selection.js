/* ============================================================
   HAR ANIMASI — VOICE ACTOR PORTAL
   character-selection.js
   Note: voice actors choose a character from its written description /
   voice direction only — the reference sample audio (uploaded by admins
   in admin-characters) is intentionally not played back here, so the
   audition isn't biased by imitating a reference recording.
   ============================================================ */

// Default icon used when a character has no custom icon_svg in DB.
const DEFAULT_CHAR_ICON = `<svg class="icon" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>`;

let selectedCharacter = null;
let currentCastingId = null;

async function initCharacterSelection() {
  if (!requireSupabaseReady()) return;
  const session = await requireAuth();
  if (!session) return;

  currentCastingId = getQueryParam('casting');
  if (!currentCastingId) {
    document.getElementById('characterGrid').innerHTML = `<div class="state-box" style="grid-column:1/-1;">
      <div class="state-title">NO CASTING SELECTED</div>
      <p>Please choose a casting first.</p>
    </div>`;
    return;
  }

  await loadCharacters();

  document.getElementById('continueBtn').addEventListener('click', () => {
    if (!selectedCharacter) return;
    location.href = `audition?casting=${currentCastingId}&character=${selectedCharacter.id}`;
  });
}

async function loadCharacters() {
  const grid = document.getElementById('characterGrid');
  grid.innerHTML = Array.from({ length: 4 }).map(() => `<div class="card skeleton" style="height:230px;"></div>`).join('');

  const { data, error } = await supabaseClient
    .from('casting_characters')
    .select('*')
    .eq('casting_id', currentCastingId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    grid.innerHTML = `<div class="state-box" style="grid-column:1/-1;">
      <div class="state-title">Something went wrong</div><p>${escapeHtml(error.message)}</p>
    </div>`;
    return;
  }

  if (!data || data.length === 0) {
    grid.innerHTML = `<div class="state-box" style="grid-column:1/-1;">
      <div class="state-title">NO CHARACTERS AVAILABLE</div>
      <p>This casting has no characters set up yet.</p>
    </div>`;
    return;
  }

  const categoryLabel = document.getElementById('categoryLabel');
  if (data[0].category) {
    categoryLabel.textContent = data[0].category;
    categoryLabel.style.display = 'inline-flex';
  }

  grid.innerHTML = data.map(char => `
    <div class="card card-hover char-card" data-id="${char.id}" tabindex="0" role="button" aria-pressed="false">
      <span class="char-selected-tag">
        <svg class="icon" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg> SELECTED
      </span>
      <div class="char-icon">${char.icon_svg || DEFAULT_CHAR_ICON}</div>
      <h3>${escapeHtml(char.name)}</h3>
      <div class="char-meta">${escapeHtml(char.category || '')} · ${escapeHtml(char.voice_type || '')}</div>
      <div class="char-desc">${escapeHtml(char.description || '')}</div>
      <div class="char-card-actions">
        <button class="btn btn-primary btn-sm select-btn" style="flex:1;">SELECT CHARACTER</button>
      </div>
    </div>
  `).join('');

  // Wire card selection
  grid.querySelectorAll('.char-card').forEach(card => {
    const id = card.dataset.id;
    const charData = data.find(c => c.id === id);
    const selectBtn = card.querySelector('.select-btn');
    selectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectCharacter(charData, card);
    });
    card.addEventListener('click', () => selectCharacter(charData, card));
  });
}

function selectCharacter(char, cardEl) {
  document.querySelectorAll('.char-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-pressed', 'false');
  });
  cardEl.classList.add('selected');
  cardEl.setAttribute('aria-pressed', 'true');
  selectedCharacter = char;

  document.getElementById('selectedCharIcon').innerHTML = char.icon_svg || DEFAULT_CHAR_ICON;
  document.getElementById('selectedCharName').textContent = char.name;
  document.getElementById('selectedCharMeta').textContent = `${char.category || ''} · ${char.voice_type || ''}`;
  document.getElementById('selectedBar').classList.remove('hidden');
  document.getElementById('noSelectionHint').classList.add('hidden');
}
