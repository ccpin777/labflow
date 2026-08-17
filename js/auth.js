/* LabFlow authentication and cloud session flow. Loaded before app.js. */
function setAuthLayout(isAuth) { document.body.classList.toggle("auth-mode", isAuth); }
function enterOfflineMode() { offlineMode = true; authSession = null; cloudHydrated = false; setCloudStatus("Offline", "error"); render(); }
function renderCloudUnavailable(message = "LabFlow cannot reach Supabase right now.") { setAuthLayout(true); document.querySelector(".app-shell")?.classList.add("auth-locked"); document.getElementById("app").innerHTML = '<div class="auth-page"><section class="auth-card"><div class="auth-brand"><span class="brand-mark" aria-hidden="true">⌁</span><span>LabFlow</span></div><h1>Cloud unavailable</h1><p class="subtle">' + escapeHtml(message) + '</p><p class="subtle">Check your network connection and reload the page.</p><button class="secondary-button offline-button" type="button" id="offlineButton">Continue offline</button></section></div>'; document.getElementById("offlineButton").onclick = enterOfflineMode; }
function renderLogin() {
  setAuthLayout(true);
  document.querySelector(".app-shell")?.classList.add("auth-locked");
  document.getElementById("app").innerHTML = '<div class="auth-page"><section class="auth-card"><div class="auth-brand"><span class="brand-mark" aria-hidden="true">⌁</span><span>LabFlow</span></div><img class="auth-artwork" src="assets/branding/labflow-branding-01.png" alt="" /><h1 id="authTitle">Welcome back</h1><form id="authForm" class="form"><div class="field"><label for="authEmail">Email</label><input id="authEmail" type="email" autocomplete="email" required><label class="remember-account"><input id="rememberAccount" type="checkbox"> Remember my email</label></div><div class="field"><label for="authPassword">Password</label><input id="authPassword" type="password" autocomplete="current-password" minlength="6" required><small class="subtle" id="authPasswordHint" hidden>New accounts should use at least 12 characters.</small></div><div class="auth-actions"><button class="primary-button" type="submit" data-auth-action="sign-in">Sign in</button><button class="secondary-button" type="button" data-auth-action="sign-up">Create account</button><button class="secondary-button" type="button" data-auth-action="reset">Forgot password</button></div><div id="authError" class="auth-error" role="alert"></div></form><a class="secondary-button calculator-entry" href="tools/Stock%20Solution%20Calculation.html"><span class="calculator-entry-icon" aria-hidden="true">⌗</span> Open Chemistry Calculator</a><button class="secondary-button offline-button" type="button" id="offlineButton">Continue offline</button></section></div>';
  const form = document.getElementById("authForm");
  const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY) || "";
  document.getElementById("authEmail").value = rememberedEmail;
  document.getElementById("rememberAccount").checked = Boolean(rememberedEmail);
  const title = document.getElementById("authTitle");
  const submitButton = form.querySelector('[data-auth-action="sign-in"]');
  const modeButton = form.querySelector('[data-auth-action="sign-up"]');
  const resetButton = form.querySelector('[data-auth-action="reset"]');
  const hint = document.getElementById("authPasswordHint");
  let authMode = "sign-in";
  const updateMode = () => {
    const isSignUp = authMode === "sign-up";
    title.textContent = isSignUp ? "Create account" : "Welcome back";
    submitButton.textContent = isSignUp ? "Create account" : "Sign in";
    modeButton.textContent = isSignUp ? "Back to sign in" : "Create account";
    hint.hidden = !isSignUp;
    document.getElementById("authError").textContent = "";
  };
  form.addEventListener("submit", async event => { event.preventDefault(); await submitAuth(authMode); });
  modeButton.onclick = () => { authMode = authMode === "sign-in" ? "sign-up" : "sign-in"; updateMode(); };
  resetButton.onclick = () => submitAuth("reset");
  document.getElementById("offlineButton").onclick = enterOfflineMode;
}
function renderAuthLoading() { setAuthLayout(true); document.querySelector(".app-shell")?.classList.add("auth-locked"); document.getElementById("app").innerHTML = '<div class="auth-page"><section class="auth-card auth-loading" aria-live="polite"><div class="auth-brand"><span class="brand-mark" aria-hidden="true">⌁</span><span>LabFlow</span></div><div class="loading-spinner" aria-hidden="true"></div><p class="subtle">Loading LabFlow…</p></section></div>'; }
function renderPasswordUpdate() { setAuthLayout(true); document.querySelector(".app-shell")?.classList.add("auth-locked"); document.getElementById("app").innerHTML = '<div class="auth-page"><section class="auth-card"><div class="auth-brand"><span class="brand-mark" aria-hidden="true">⌁</span><span>LabFlow</span></div><h1>Set new password</h1><form id="passwordUpdateForm" class="form"><div class="field"><label for="newPassword">New password</label><input id="newPassword" type="password" minlength="12" autocomplete="new-password" required></div><div class="field"><label for="confirmPassword">Confirm password</label><input id="confirmPassword" type="password" minlength="12" autocomplete="new-password" required></div><div class="auth-actions"><button class="primary-button" type="submit">Save password</button></div><div id="passwordUpdateError" class="auth-error" role="alert"></div></form></section></div>'; document.getElementById("passwordUpdateForm").onsubmit = async event => { event.preventDefault(); const errorNode = document.getElementById("passwordUpdateError"), password = document.getElementById("newPassword").value, confirmation = document.getElementById("confirmPassword").value; errorNode.textContent = password === confirmation ? "" : "Passwords do not match."; if (errorNode.textContent) return; const { error } = await supabaseClient.auth.updateUser({ password }); if (error) { errorNode.textContent = error.message; return; } await supabaseClient.auth.signOut(); window.history.replaceState({}, document.title, window.location.pathname); }; }
async function submitAuth(action) {
  const form = document.getElementById("authForm");
  const activeButton = action === "reset" ? form?.querySelector('[data-auth-action="reset"]') : form?.querySelector('[data-auth-action="sign-in"]');
  if (!form || !activeButton || activeButton.disabled) return;
  const originalLabel = activeButton.textContent;
  form.querySelectorAll("button").forEach(button => { button.disabled = true; });
  activeButton.classList.add("is-loading");
  activeButton.innerHTML = '<span class="button-spinner" aria-hidden="true"></span><span>' + (action === "reset" ? "Sending…" : action === "sign-up" ? "Creating…" : "Signing in…") + '</span>';
  const email = document.getElementById("authEmail").value.trim();
  if (document.getElementById("rememberAccount")?.checked) localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
  else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  const password = document.getElementById("authPassword").value;
  const errorNode = document.getElementById("authError");
  errorNode.textContent = "";
  if (action === "sign-up" && password.length < 12) {
    errorNode.textContent = "New passwords must be at least 12 characters.";
    form.querySelectorAll("button").forEach(button => { button.disabled = false; });
    activeButton.classList.remove("is-loading");
    activeButton.textContent = originalLabel;
    return;
  }
  try {
    if (action === "reset") {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
      errorNode.textContent = error ? error.message : "Password reset email sent. Check your inbox.";
      return;
    }
    const result = action === "sign-up"
      ? await supabaseClient.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + window.location.pathname } })
      : await supabaseClient.auth.signInWithPassword({ email, password });
    if (result.error) {
      errorNode.textContent = result.error.message;
      return;
    }
    if (action === "sign-up" && !result.data.session) errorNode.textContent = "Account created. Check your email to confirm it, then sign in.";
  } catch (error) {
    const message = String(error?.message || "");
    errorNode.textContent = /fetch|network|load|connect/i.test(message)
      ? "Cannot reach LabFlow Cloud from this network. Check the company firewall or try the local calculator instead."
      : message || "Sign in failed. Please try again.";
  } finally {
    form.querySelectorAll("button").forEach(button => { button.disabled = false; });
    activeButton.classList.remove("is-loading");
    activeButton.textContent = originalLabel;
  }
}
function withTimeout(promise, ms) { return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("Cloud connection timed out")), ms))]); }
function waitForSupabase(ms = 5000) { return new Promise(resolve => { const started = Date.now(); const check = () => { if (window.supabase?.createClient) return resolve(window.supabase); if (Date.now() - started >= ms) return resolve(null); setTimeout(check, 50); }; check(); }); }
async function initializeAuth() { if (!CLOUD_CONFIGURED) { authReady = true; render(); return; } if (!supabaseClient) { const sdk = await waitForSupabase(); if (sdk?.createClient) supabaseClient = sdk.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); } if (!supabaseClient) { offlineMode = true; authReady = true; setCloudStatus("Offline", "error"); render(); return; } try { const { data, error } = await withTimeout(supabaseClient.auth.getSession(), 5000); if (error) throw error; authSession = data.session; } catch (error) { offlineMode = true; authSession = null; setCloudStatus("Offline", "error"); } if (authSession && !(await loadCloudData())) { authReady = true; renderCloudUnavailable(); return; } authReady = true; render(); supabaseClient.auth.onAuthStateChange(async (event, session) => { if (offlineMode) return; authSession = session; cloudHydrated = false; if (event === "PASSWORD_RECOVERY") { renderPasswordUpdate(); return; } if (session) { if (await loadCloudData()) render(); else renderCloudUnavailable(); } else { setCloudStatus("Signed out"); render(); } }); }
