/*
 * NOIR customer accounts (Supabase Auth, email + password and Google).
 *
 *   NoirAuth.signUp({ name, email, password })   -> { session } | { needsConfirmation } | { error }
 *   NoirAuth.signIn({ email, password })         -> { session } | { error }
 *   NoirAuth.signOut()
 *   NoirAuth.getSession()                        -> session | null (refreshes an expiring one)
 *   NoirAuth.resetPassword(email)                -> { ok } | { error }
 *   NoirAuth.updatePassword(password)            -> { ok } | { error }
 *   NoirAuth.updateName(name)                    -> { session } | { error }
 *   NoirAuth.getSettings()                       -> which providers the project has switched on
 *   NoirAuth.googleUrl(redirectTo)               -> URL to send the browser to
 *   NoirAuth.consumeRedirect(hash)               -> { session, type } | { error } | null
 *
 * Plain fetch against the Supabase Auth REST API, like noir-api.js. The session is kept in localStorage.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(root);
  } else {
    root.NoirAuth = factory(root);
  }
})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this), function (root) {
  const STORAGE_KEY = "noirSession";
  const TIMEOUT_MS = 12000;
  const REFRESH_MARGIN_S = 60;

  let memorySession = null; // used when localStorage is unavailable

  function getConfig() {
    const config = root.NOIR_SUPABASE;
    if (!config || !config.url || !config.key) throw new Error("Supabase is not configured.");
    return config;
  }

  const nowSeconds = () => Math.floor(Date.now() / 1000);

  /* ------------------------------------------------------------ storage */

  function readSession() {
    try {
      const raw = root.localStorage && root.localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (error) { /* fall through */ }
    return memorySession;
  }

  function writeSession(session) {
    memorySession = session;
    try {
      if (!root.localStorage) return;
      if (session) root.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      else root.localStorage.removeItem(STORAGE_KEY);
    } catch (error) { /* keep the in-memory copy */ }
  }

  // Turns the Auth API's token response into the small object the site keeps.
  function toSession(data) {
    if (!data || !data.access_token || !data.user) return null;

    const user = data.user;
    const meta = user.user_metadata || {};

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at || nowSeconds() + Number(data.expires_in || 3600),
      user: {
        id: user.id,
        email: user.email,
        name: meta.full_name || meta.name || "",
        emailConfirmed: Boolean(user.email_confirmed_at || user.confirmed_at)
      }
    };
  }

  /* ------------------------------------------------------------ requests */

  async function request(path, { method = "GET", body, token } = {}) {
    const { url, key } = getConfig();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const headers = { apikey: key, "Content-Type": "application/json", Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${url}/auth/v1${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal
      });

      const text = await response.text();
      let data = null;
      if (text) {
        try { data = JSON.parse(text); } catch (error) { /* not JSON */ }
      }

      if (!response.ok) {
        const failure = new Error((data && (data.msg || data.message || data.error_description || data.error)) || `Request failed (${response.status})`);
        failure.status = response.status;
        failure.code = data && (data.error_code || data.code || data.error);
        throw failure;
      }

      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  // Friendly text for the errors a shopper can actually cause.
  function friendlyError(error) {
    if (!error.status) return "We couldn't reach the store. Check your connection and try again.";

    const code = String(error.code || "");
    const message = String(error.message || "").toLowerCase();

    if (code === "user_already_exists" || message.includes("already registered") || message.includes("already exists")) {
      return "An account with this email already exists. Try signing in instead.";
    }
    if (code === "invalid_credentials" || message.includes("invalid login")) return "Incorrect email or password.";
    if (code === "email_not_confirmed" || message.includes("not confirmed")) {
      return "Please confirm your email first. We sent you a link when you signed up.";
    }
    if (code === "weak_password" || message.includes("password should")) {
      return "Choose a stronger password (at least 8 characters, mixing letters and numbers).";
    }
    if (code === "signup_disabled" || message.includes("signups not allowed")) return "New sign-ups are switched off right now.";
    if (error.status === 429 || code.includes("rate_limit")) return "Too many attempts. Please wait a few minutes and try again.";
    if (code === "same_password") return "Your new password must be different from the old one.";

    return "Something went wrong. Please try again.";
  }

  /* ------------------------------------------------------------ actions */

  async function signUp({ name, email, password }) {
    try {
      const data = await request("/signup", {
        method: "POST",
        body: { email, password, data: { full_name: name } }
      });

      const session = toSession(data);
      if (session) {
        writeSession(session);
        return { session };
      }

      // Email confirmation is on: no session yet. An empty identities list means the address is already taken.
      if (data && Array.isArray(data.identities) && data.identities.length === 0) {
        return { error: "An account with this email already exists. Try signing in instead." };
      }

      return { needsConfirmation: true };
    } catch (error) {
      return { error: friendlyError(error) };
    }
  }

  async function signIn({ email, password }) {
    try {
      const data = await request("/token?grant_type=password", { method: "POST", body: { email, password } });
      const session = toSession(data);
      if (!session) return { error: "Something went wrong. Please try again." };
      writeSession(session);
      return { session };
    } catch (error) {
      return { error: friendlyError(error) };
    }
  }

  async function refresh(session) {
    try {
      const data = await request("/token?grant_type=refresh_token", { method: "POST", body: { refresh_token: session.refreshToken } });
      const next = toSession(data);
      if (next) {
        writeSession(next);
        return next;
      }
    } catch (error) {
      // A rejected refresh token means the session is over; a network error keeps the old one for now.
      if (error.status && error.status < 500) writeSession(null);
      else return session;
    }
    return null;
  }

  async function getSession() {
    const session = readSession();
    if (!session || !session.accessToken) return null;
    if (session.expiresAt - nowSeconds() > REFRESH_MARGIN_S) return session;
    return refresh(session);
  }

  async function signOut() {
    const session = readSession();
    writeSession(null);

    if (session && session.accessToken) {
      try { await request("/logout?scope=local", { method: "POST", token: session.accessToken }); } catch (error) { /* already signed out locally */ }
    }
  }

  async function resetPassword(email) {
    try {
      await request("/recover", { method: "POST", body: { email } });
      return { ok: true };
    } catch (error) {
      // Same answer whether or not the address has an account.
      if (error.status && error.status < 500 && error.status !== 429) return { ok: true };
      return { error: friendlyError(error) };
    }
  }

  async function updatePassword(password) {
    const session = await getSession();
    if (!session) return { error: "Your session has expired. Please request a new reset link." };

    try {
      await request("/user", { method: "PUT", body: { password }, token: session.accessToken });
      return { ok: true };
    } catch (error) {
      return { error: friendlyError(error) };
    }
  }

  async function updateName(name) {
    const session = await getSession();
    if (!session) return { error: "Your session has expired. Please sign in again." };

    try {
      await request("/user", { method: "PUT", body: { data: { full_name: name } }, token: session.accessToken });
      const next = { ...session, user: { ...session.user, name } };
      writeSession(next);
      return { session: next };
    } catch (error) {
      return { error: friendlyError(error) };
    }
  }

  // Public project settings: which sign-in methods are switched on in the Supabase dashboard.
  async function getSettings() {
    try {
      const data = await request("/settings");
      const external = (data && data.external) || {};
      return {
        google: Boolean(external.google),
        phone: Boolean(external.phone),
        signupDisabled: Boolean(data && data.disable_signup)
      };
    } catch (error) {
      return null;
    }
  }

  function googleUrl(redirectTo) {
    const { url } = getConfig();
    return `${url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
  }

  // After Google (or an emailed link) sends the shopper back, the tokens arrive in the URL hash.
  async function consumeRedirect(hash) {
    const params = new URLSearchParams(String(hash || "").replace(/^#/, ""));

    if (params.get("error_description") || params.get("error")) {
      return { error: (params.get("error_description") || "Sign-in did not complete.").replace(/\+/g, " ") };
    }

    const accessToken = params.get("access_token");
    if (!accessToken) return null;

    try {
      const user = await request("/user", { token: accessToken });
      const session = toSession({
        access_token: accessToken,
        refresh_token: params.get("refresh_token"),
        expires_in: params.get("expires_in"),
        expires_at: Number(params.get("expires_at")) || undefined,
        user
      });
      writeSession(session);
      return { session, type: params.get("type") || "" };
    } catch (error) {
      return { error: friendlyError(error) };
    }
  }

  return { signUp, signIn, signOut, getSession, resetPassword, updatePassword, updateName, getSettings, googleUrl, consumeRedirect, _readSession: readSession };
});
