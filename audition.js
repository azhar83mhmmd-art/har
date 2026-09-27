/* ============================================================
   HAR ANIMASI — VOICE ACTOR PORTAL
   audition.js — voice recorder + submission flow
   ============================================================ */

const MIN_RECORDING_SECONDS = 3;
const MAX_FILE_SIZE_MB = 25;

let castingData = null;
let characterData = null;
let currentUser = null;

let mediaRecorder = null;
let mediaStream = null;
let recordedChunks = [];
let recordedBlob = null;
let recordingMimeType = '';
let recordStartTime = 0;
let recordTimerInterval = null;
let recordedDurationSeconds = 0;

let previewAudio = null;
let isPreviewPlaying = false;

async function initAuditionPage() {
  if (!requireSupabaseReady()) return;
  const session = await requireAuth();
  if (!session) return;
  currentUser = session.user;

  const castingId = getQueryParam('casting');
  const characterId = getQueryParam('character');

  if (!castingId || !characterId) {
    renderError('MISSING CASTING OR CHARACTER', 'Please start again from character selection.');
    return;
  }

  const [{ data: casting, error: castingErr }, { data: character, error: charErr }] = await Promise.all([
    supabaseClient.from('castings').select('*').eq('id', castingId).single(),
    supabaseClient.from('casting_characters').select('*').eq('id', characterId).single()
  ]);

  if (castingErr || charErr || !casting || !character) {
    renderError('AUDITION NOT AVAILABLE', 'This casting or character could not be found.');
    return;
  }

  castingData = casting;
  characterData = character;

  renderAuditionUI();
}

function renderError(title, message) {
  document.getElementById('auditionRoot').innerHTML = `<div class="state-box">
    <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
    <div class="state-title">${escapeHtml(title)}</div>
    <p>${escapeHtml(message)}</p>
  </div>`;
}

function renderAuditionUI() {
  const root = document.getElementById('auditionRoot');
  const script = characterData.audition_script || castingData.audition_script || 'No dialog provided.';
  const direction = characterData.voice_direction || castingData.voice_direction || 'No specific direction provided.';
  const unsupportedReason = getRecordingUnsupportedReason();

  root.innerHTML = `
    <div class="audition-header">
      <span class="badge badge-info mb-8" style="display:inline-flex;">${escapeHtml(characterData.category || '')}</span>
      <h1>AUDITION — ${escapeHtml(characterData.name)}</h1>
      <p class="text-secondary">${escapeHtml(castingData.title)}</p>
    </div>

    <div class="card mb-16">
      <div class="detail-block" style="margin-bottom:16px;">
        <h4>CHARACTER</h4>
        <p>${escapeHtml(characterData.name)} · ${escapeHtml(characterData.voice_type || '-')}</p>
      </div>
      <div class="detail-block" style="margin-bottom:16px;">
        <h4>VOICE DIRECTION</h4>
        <p>${escapeHtml(direction)}</p>
      </div>
      <div class="detail-block" style="margin-bottom:0;">
        <h4>DIALOG</h4>
        <div class="dialog-box">"${escapeHtml(script)}"</div>
      </div>
    </div>

    ${unsupportedReason ? `
    <div class="state-box">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      <div class="state-title">RECORDING NOT AVAILABLE</div>
      <p>${escapeHtml(unsupportedReason)}</p>
    </div>
    ` : `
    <div class="card recorder-box" id="recorderCard">
      <div class="recorder-status" id="recorderStatus">
        <svg class="icon" viewBox="0 0 24 24" style="width:16px;height:16px;"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>
        MICROPHONE READY
      </div>
      <div class="mic-circle" id="micCircle">
        <svg class="icon" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>
      </div>
      <div class="rec-timer hidden" id="recTimer">00:00</div>

      <div id="recorderControls">
        <button class="btn btn-primary" id="startRecordBtn">
          <svg class="icon" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>
          START RECORDING
        </button>
      </div>

      <div id="previewSection" class="hidden mt-24" style="text-align:left;">
        <div class="flex items-center gap-8 mb-16" style="justify-content:center; color:var(--success); font-weight:700; font-size:13px;">
          <svg class="icon" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg> RECORDING COMPLETE
        </div>

        <div class="audio-player">
          <button class="play-toggle" id="previewPlayBtn">
            <svg class="icon" id="previewPlayIcon" viewBox="0 0 24 24" style="stroke:#0B0B0D;"><path d="M5 3l14 9-14 9V3z"/></svg>
          </button>
          <div class="track">
            <div class="bar" id="previewBar"><div class="bar-fill" id="previewBarFill"></div></div>
            <div class="time"><span id="previewCurrentTime">00:00</span><span id="previewDuration">00:00</span></div>
          </div>
        </div>

        <div class="side-row"><span>Character</span><span>${escapeHtml(characterData.name)}</span></div>
        <div class="side-row"><span>Status</span><span>Ready to submit</span></div>

        <div class="recorder-actions mt-24">
          <button class="btn btn-secondary" id="recordAgainBtn">
            <svg class="icon" viewBox="0 0 24 24"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 105.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
            RECORD AGAIN
          </button>
          <button class="btn btn-primary" id="submitAuditionBtn">
            <svg class="icon" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            SUBMIT AUDITION
          </button>
        </div>
      </div>
    </div>
    `}
  `;

  if (!unsupportedReason) {
    document.getElementById('startRecordBtn').addEventListener('click', startRecording);
  }
  wireSubmitModal();
}

// ============================================================
// RECORDING SUPPORT DETECTION
// Recording silently "does nothing" for a few very common reasons —
// this pins down which one it is instead of showing one vague message.
// ============================================================
function getRecordingUnsupportedReason() {
  const isSecure = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!isSecure) {
    return `Perekaman suara butuh koneksi HTTPS (browser memblokir akses microphone di halaman "${location.protocol}//"). Deploy situs ini ke hosting HTTPS (Vercel/Netlify) atau akses lewat https://, lalu coba lagi.`;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return 'Browser ini tidak mendukung akses microphone. Buka dengan Chrome, Firefox, Edge, atau Safari versi terbaru — jangan dari dalam aplikasi seperti Instagram/TikTok/WhatsApp.';
  }
  if (!window.MediaRecorder) {
    return 'Browser ini tidak mendukung perekaman audio (MediaRecorder API tidak tersedia). Coba gunakan Chrome, Firefox, Edge, atau Safari versi terbaru.';
  }
  return null;
}

function microphoneErrorMessage(err) {
  switch (err && err.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Akses microphone ditolak. Klik ikon gembok/kamera di address bar browser, izinkan microphone untuk situs ini, lalu klik START RECORDING lagi.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'Tidak ada microphone yang terdeteksi di perangkat ini. Pastikan microphone tersambung, lalu coba lagi.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Microphone sedang dipakai aplikasi/tab lain. Tutup aplikasi lain yang memakai microphone, lalu coba lagi.';
    case 'OverconstrainedError':
      return 'Microphone tidak mendukung pengaturan yang diminta. Coba microphone lain.';
    case 'SecurityError':
      return 'Akses microphone diblokir oleh pengaturan keamanan browser untuk halaman ini.';
    default:
      return 'Tidak bisa mengakses microphone: ' + ((err && err.message) || (err && err.name) || 'unknown error') + '.';
  }
}

// ============================================================
// RECORDING
// ============================================================
function pickSupportedMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  for (const type of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

async function startRecording() {
  const unsupportedReason = getRecordingUnsupportedReason();
  if (unsupportedReason) {
    showToast(unsupportedReason, 'error', 8000);
    return;
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    showToast(microphoneErrorMessage(err), 'error', 7000);
    return;
  }

  recordingMimeType = pickSupportedMimeType();
  const options = recordingMimeType ? { mimeType: recordingMimeType } : undefined;

  try {
    mediaRecorder = options ? new MediaRecorder(mediaStream, options) : new MediaRecorder(mediaStream);
  } catch (err) {
    try {
      mediaRecorder = new MediaRecorder(mediaStream);
      recordingMimeType = mediaRecorder.mimeType || '';
    } catch (err2) {
      showToast('Browser ini tidak bisa merekam audio: ' + ((err2 && err2.message) || (err2 && err2.name) || 'unknown error') + '.', 'error', 7000);
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
      return;
    }
  }

  recordedChunks = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };
  mediaRecorder.onstop = handleRecordingStop;

  mediaRecorder.start();
  recordStartTime = Date.now();

  document.getElementById('recorderStatus').innerHTML = `<span class="rec-dot"></span> RECORDING`;
  document.getElementById('micCircle').classList.add('recording');
  document.getElementById('recTimer').classList.remove('hidden');
  document.getElementById('previewSection').classList.add('hidden');

  document.getElementById('recorderControls').innerHTML = `
    <button class="btn btn-danger" id="stopRecordBtn">
      <svg class="icon" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
      STOP RECORDING
    </button>
  `;
  document.getElementById('stopRecordBtn').addEventListener('click', stopRecording);

  recordTimerInterval = setInterval(() => {
    const elapsed = (Date.now() - recordStartTime) / 1000;
    document.getElementById('recTimer').textContent = formatDuration(elapsed);
  }, 200);
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
  recordedDurationSeconds = (Date.now() - recordStartTime) / 1000;
  mediaRecorder.stop();
  clearInterval(recordTimerInterval);
  mediaStream.getTracks().forEach(t => t.stop());
}

function handleRecordingStop() {
  const blobType = recordingMimeType || 'audio/webm';
  const newBlob = new Blob(recordedChunks, { type: blobType });

  if (!newBlob || newBlob.size === 0) {
    showToast('Recording failed — no audio captured. Please try again.', 'error');
    resetRecorderUI();
    return;
  }

  if (recordedDurationSeconds < MIN_RECORDING_SECONDS) {
    showToast('RECORDING IS TOO SHORT. Please record again.', 'error');
    resetRecorderUI();
    return;
  }

  const sizeMB = newBlob.size / (1024 * 1024);
  if (sizeMB > MAX_FILE_SIZE_MB) {
    showToast('FILE TOO LARGE. Please record a shorter clip.', 'error');
    resetRecorderUI();
    return;
  }

  // Replace old recording only after the new one is confirmed valid.
  if (previewAudio) {
    URL.revokeObjectURL(previewAudio.src);
  }
  recordedBlob = newBlob;

  document.getElementById('recorderStatus').innerHTML = `<svg class="icon" viewBox="0 0 24 24" style="width:16px;height:16px;"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/></svg> MICROPHONE READY`;
  document.getElementById('micCircle').classList.remove('recording');
  document.getElementById('recTimer').classList.add('hidden');
  document.getElementById('recorderControls').innerHTML = `
    <button class="btn btn-secondary" id="startRecordBtn2">
      <svg class="icon" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/></svg>
      RE-RECORD
    </button>
  `;
  document.getElementById('startRecordBtn2').addEventListener('click', startRecording);

  setupPreviewPlayer(recordedBlob);
  document.getElementById('previewSection').classList.remove('hidden');
}

function resetRecorderUI() {
  document.getElementById('recorderStatus').innerHTML = `<svg class="icon" viewBox="0 0 24 24" style="width:16px;height:16px;"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/></svg> MICROPHONE READY`;
  document.getElementById('micCircle').classList.remove('recording');
  document.getElementById('recTimer').classList.add('hidden');
  document.getElementById('recorderControls').innerHTML = `
    <button class="btn btn-primary" id="startRecordBtn">
      <svg class="icon" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/></svg>
      START RECORDING
    </button>
  `;
  document.getElementById('startRecordBtn').addEventListener('click', startRecording);
}

// ============================================================
// PREVIEW PLAYER (no autoplay — user must press play)
// ============================================================
function setupPreviewPlayer(blob) {
  const url = URL.createObjectURL(blob);
  previewAudio = new Audio(url);
  isPreviewPlaying = false;

  previewAudio.addEventListener('loadedmetadata', () => {
    document.getElementById('previewDuration').textContent = formatDuration(previewAudio.duration);
  });
  previewAudio.addEventListener('timeupdate', () => {
    const pct = previewAudio.duration ? (previewAudio.currentTime / previewAudio.duration) * 100 : 0;
    document.getElementById('previewBarFill').style.width = pct + '%';
    document.getElementById('previewCurrentTime').textContent = formatDuration(previewAudio.currentTime);
  });
  previewAudio.addEventListener('ended', () => {
    isPreviewPlaying = false;
    updatePreviewPlayIcon();
  });

  document.getElementById('previewPlayBtn').onclick = () => {
    if (isPreviewPlaying) {
      previewAudio.pause();
      isPreviewPlaying = false;
    } else {
      previewAudio.play();
      isPreviewPlaying = true;
    }
    updatePreviewPlayIcon();
  };

  document.getElementById('previewBar').onclick = (e) => {
    if (!previewAudio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    previewAudio.currentTime = pct * previewAudio.duration;
  };
}

function updatePreviewPlayIcon() {
  const icon = document.getElementById('previewPlayIcon');
  icon.innerHTML = isPreviewPlaying
    ? '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>'
    : '<path d="M5 3l14 9-14 9V3z"/>';
}

// ============================================================
// RECORD AGAIN
// ============================================================
document.addEventListener('click', (e) => {
  if (e.target.closest('#recordAgainBtn')) {
    document.getElementById('previewSection').classList.add('hidden');
    startRecording();
  }
});

// ============================================================
// SUBMIT FLOW
// ============================================================
function wireSubmitModal() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('#submitAuditionBtn')) {
      if (!recordedBlob) {
        showToast('Please record your audition first.', 'error');
        return;
      }
      openModal('submitModal');
    }
  });

  document.getElementById('cancelSubmitBtn')?.addEventListener('click', () => closeModal('submitModal'));
  document.getElementById('confirmSubmitBtn')?.addEventListener('click', submitAudition);
}

async function submitAudition() {
  const confirmBtn = document.getElementById('confirmSubmitBtn');
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<span class="spinner"></span> Submitting...';

  try {
    const ext = recordingMimeType.includes('mp4') ? 'm4a' : recordingMimeType.includes('ogg') ? 'ogg' : 'webm';
    const fileName = `${Date.now()}-audition.${ext}`;
    const storagePath = `${currentUser.id}/${castingData.id}/${characterData.id}/${fileName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from(BUCKET_VOICE_AUDITIONS)
      .upload(storagePath, recordedBlob, { contentType: recordingMimeType || 'audio/webm', upsert: false });

    if (uploadError) {
      showToast('Upload failed: ' + uploadError.message + '. Your recording is still available — please try submitting again.', 'error', 6000);
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'SUBMIT RECORDING';
      return;
    }

    const { data: auditionRow, error: auditionError } = await supabaseClient
      .from('voice_auditions')
      .insert({
        user_id: currentUser.id,
        casting_id: castingData.id,
        character_id: characterData.id,
        storage_path: storagePath,
        file_name: fileName,
        mime_type: recordingMimeType || 'audio/webm',
        duration_seconds: recordedDurationSeconds,
        status: 'submitted'
      })
      .select()
      .single();

    if (auditionError) {
      showToast('Failed to save audition record: ' + auditionError.message, 'error');
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'SUBMIT RECORDING';
      return;
    }

    const { error: appError } = await supabaseClient
      .from('applications')
      .upsert({
        user_id: currentUser.id,
        casting_id: castingData.id,
        character_id: characterData.id,
        voice_audition_id: auditionRow.id,
        status: 'pending'
      }, { onConflict: 'user_id,casting_id' });

    if (appError) {
      showToast('Failed to save application: ' + appError.message, 'error');
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'SUBMIT RECORDING';
      return;
    }

    closeModal('submitModal');
    showToast('Audition submitted successfully!', 'success');
    setTimeout(() => (location.href = 'auditions'), 1200);
  } catch (err) {
    showToast('Unexpected error: ' + err.message, 'error');
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'SUBMIT RECORDING';
  }
}
