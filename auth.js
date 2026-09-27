/* ============================================================
   HAR ANIMASI — VOICE ACTOR PORTAL
   auth.js — login / register / forgot password
   ============================================================ */

const VOICE_TYPES = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'child', label: 'Child' },
  { value: 'teen', label: 'Teen' },
  { value: 'adult', label: 'Adult' },
  { value: 'elderly', label: 'Elderly' },
  { value: 'character_voice', label: 'Character Voice' },
  { value: 'other', label: 'Other' }
];

function setFieldError(fieldEl, message) {
  fieldEl.classList.add('has-error');
  const err = fieldEl.querySelector('.field-error');
  if (err) err.textContent = message;
}
function clearFieldError(fieldEl) {
  fieldEl.classList.remove('has-error');
}
function clearAllErrors(formEl) {
  formEl.querySelectorAll('.field').forEach(clearFieldError);
}

// ============================================================
// LOGIN
// ============================================================
async function initLoginPage() {
  if (!requireSupabaseReady()) return;
  const session = await getSession();
  if (session) {
    const profile = await getCurrentProfile();
    location.href = profile && profile.role === 'admin' ? 'admin' : 'dashboard';
    return;
  }

  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors(form);

    const email = form.email.value.trim();
    const password = form.password.value;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!email) return setFieldError(form.email.closest('.field'), 'Email is required.');
    if (!password) return setFieldError(form.password.closest('.field'), 'Password is required.');

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Signing in...';

    let data, error;
    try {
      ({ data, error } = await withTimeout(
        supabaseClient.auth.signInWithPassword({ email, password }),
        15000,
        'Login is taking too long. Please check your connection and try again.'
      ));
    } catch (timeoutErr) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'LOGIN';
      showToast(timeoutErr.message, 'error', 6000);
      return;
    }

    if (error) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'LOGIN';
      showToast(error.message || 'Login failed. Please check your credentials.', 'error');
      return;
    }

    showToast('Welcome back!', 'success', 1200);

    const { data: profile } = await supabaseClient
      .from('profiles').select('role').eq('id', data.user.id).single();

    const params = new URLSearchParams(location.search);
    const next = params.get('next');

    // No timeout here — we already have what we need, this is just a redirect.
    if (next) location.href = decodeURIComponent(next);
    else location.href = profile && profile.role === 'admin' ? 'admin' : 'dashboard';
  });

  const forgotLink = document.getElementById('forgotPasswordLink');
  if (forgotLink) {
    forgotLink.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = prompt('Enter your account email to receive a password reset link:');
      if (!email) return;
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: location.origin + '/login'
      });
      if (error) showToast(error.message, 'error');
      else showToast('Password reset link sent to your email.', 'success');
    });
  }
}

// ============================================================
// REGISTER
// ============================================================
function populateVoiceTypeSelect(selectEl) {
  selectEl.innerHTML = '<option value="">Select voice type</option>' +
    VOICE_TYPES.map(v => `<option value="${v.value}">${v.label}</option>`).join('');
}

async function initRegisterPage() {
  if (!requireSupabaseReady()) return;
  const session = await getSession();
  if (session) {
    location.href = 'dashboard';
    return;
  }

  const voiceTypeSelect = document.getElementById('voiceType');
  if (voiceTypeSelect) populateVoiceTypeSelect(voiceTypeSelect);

  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors(form);

    const fullName = form.fullName.value.trim();
    const stageName = form.stageName.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;
    const age = form.age.value;
    const city = form.city.value.trim();
    const whatsapp = form.whatsapp.value.trim();
    const voiceType = form.voiceType.value;
    const experience = form.experience.value.trim();
    const equipment = form.equipment.value.trim();
    const software = form.software.value.trim();
    const aboutMe = form.aboutMe.value.trim();
    const termsAccepted = form.termsAccepted.checked;

    let hasError = false;
    const require = (field, val, msg) => {
      if (!val) {
        setFieldError(form[field].closest('.field'), msg);
        hasError = true;
      }
    };

    require('fullName', fullName, 'Full name is required.');
    require('email', email, 'Email is required.');
    require('password', password, 'Password is required.');
    if (password && password.length < 6) {
      setFieldError(form.password.closest('.field'), 'Password must be at least 6 characters.');
      hasError = true;
    }
    if (password !== confirmPassword) {
      setFieldError(form.confirmPassword.closest('.field'), 'Passwords do not match.');
      hasError = true;
    }
    if (!termsAccepted) {
      showToast('You must agree to the Voice Actor terms to continue.', 'error');
      hasError = true;
    }

    if (hasError) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Creating account...';

    let data, error;
    try {
      ({ data, error } = await withTimeout(
        supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              stage_name: stageName || null,
              age: age || null,
              city: city || null,
              whatsapp: whatsapp || null,
              voice_type: voiceType || null,
              experience: experience || null,
              equipment: equipment || null,
              software: software || null,
              about_me: aboutMe || null,
              terms_accepted: true
            }
          }
        }),
        15000,
        'Registration is taking too long. Please check your connection and try again.'
      ));
    } catch (timeoutErr) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'CREATE ACCOUNT';
      showToast(timeoutErr.message, 'error', 6000);
      return;
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'CREATE ACCOUNT';

    if (error) {
      showToast(error.message || 'Registration failed.', 'error');
      return;
    }

    // If email confirmation is disabled on the Supabase project, signUp()
    // already returns a live session — send the new user straight to their
    // dashboard instead of bouncing them through the login page.
    if (data && data.session) {
      showToast('Account created! Welcome to HAR Animasi.', 'success', 2500);
      location.href = 'dashboard';
      return;
    }

    showToast('Account created! Please check your email to confirm your account, then log in.', 'success', 6000);
    setTimeout(() => (location.href = 'login'), 2200);
  });
}
