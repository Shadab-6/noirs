const test = require("node:test");
const assert = require("node:assert/strict");

globalThis.NOIR_SUPABASE = { url: "https://example.supabase.co", key: "sb_publishable_test" };
const store = new Map();
globalThis.localStorage = {
  getItem: key => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: key => store.delete(key)
};
const NoirAuth = require("../assets/js/noir-auth");

function stubFetch(...replies) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const reply = replies.shift();
    if (reply instanceof Error) throw reply;
    return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, text: async () => JSON.stringify(reply.body) };
  };
  return calls;
}

const tokenResponse = (overrides = {}) => ({
  access_token: "access-1", refresh_token: "refresh-1", expires_in: 3600,
  user: { id: "u1", email: "a@b.co", user_metadata: { full_name: "Asha Rao" }, email_confirmed_at: "2026-09-20T00:00:00Z" },
  ...overrides
});

test.beforeEach(() => store.clear());

test("signUp with auto-confirm returns and stores a session, sending the name as metadata", async () => {
  const calls = stubFetch({ status: 200, body: tokenResponse() });
  const result = await NoirAuth.signUp({ name: "Asha Rao", email: "a@b.co", password: "longenough1" });

  assert.equal(result.session.user.name, "Asha Rao");
  assert.equal(calls[0].url, "https://example.supabase.co/auth/v1/signup");
  assert.deepEqual(JSON.parse(calls[0].options.body), { email: "a@b.co", password: "longenough1", data: { full_name: "Asha Rao" } });
  assert.equal(calls[0].options.headers.apikey, "sb_publishable_test");
  assert.ok(store.get("noirSession"));
});

test("signUp with email confirmation on asks the shopper to check their inbox", async () => {
  stubFetch({ status: 200, body: { id: "u1", email: "a@b.co", identities: [{ id: "x" }] } });
  const result = await NoirAuth.signUp({ name: "Asha", email: "a@b.co", password: "longenough1" });
  assert.equal(result.needsConfirmation, true);
  assert.equal(store.get("noirSession"), undefined);
});

test("signUp reports an existing address (empty identities or explicit error)", async () => {
  stubFetch({ status: 200, body: { id: "u1", identities: [] } }, { status: 422, body: { error_code: "user_already_exists", msg: "User already registered" } });
  assert.match((await NoirAuth.signUp({ name: "A", email: "a@b.co", password: "longenough1" })).error, /already exists/);
  assert.match((await NoirAuth.signUp({ name: "A", email: "a@b.co", password: "longenough1" })).error, /already exists/);
});

test("signIn stores the session; wrong credentials and outages get friendly messages", async () => {
  const calls = stubFetch(
    { status: 200, body: tokenResponse() },
    { status: 400, body: { error_code: "invalid_credentials", msg: "Invalid login credentials" } },
    { status: 400, body: { error_code: "email_not_confirmed", msg: "Email not confirmed" } },
    new Error("offline")
  );

  assert.equal((await NoirAuth.signIn({ email: "a@b.co", password: "x" })).session.user.email, "a@b.co");
  assert.equal(calls[0].url, "https://example.supabase.co/auth/v1/token?grant_type=password");

  assert.equal((await NoirAuth.signIn({ email: "a@b.co", password: "bad" })).error, "Incorrect email or password.");
  assert.match((await NoirAuth.signIn({ email: "a@b.co", password: "x" })).error, /confirm your email/);
  assert.match((await NoirAuth.signIn({ email: "a@b.co", password: "x" })).error, /couldn't reach the store/);
});

test("getSession returns a fresh session and refreshes one that is about to expire", async () => {
  const calls = stubFetch(
    { status: 200, body: tokenResponse() },
    { status: 200, body: tokenResponse({ access_token: "access-2", refresh_token: "refresh-2" }) }
  );
  await NoirAuth.signIn({ email: "a@b.co", password: "x" });
  assert.equal((await NoirAuth.getSession()).accessToken, "access-1");
  assert.equal(calls.length, 1); // no refresh needed

  const stored = JSON.parse(store.get("noirSession"));
  stored.expiresAt = Math.floor(Date.now() / 1000) + 10;
  store.set("noirSession", JSON.stringify(stored));

  assert.equal((await NoirAuth.getSession()).accessToken, "access-2");
  assert.equal(calls[1].url, "https://example.supabase.co/auth/v1/token?grant_type=refresh_token");
});

test("a rejected refresh token ends the session", async () => {
  stubFetch({ status: 200, body: tokenResponse() }, { status: 400, body: { error_code: "refresh_token_not_found", msg: "Invalid Refresh Token" } });
  await NoirAuth.signIn({ email: "a@b.co", password: "x" });
  const stored = JSON.parse(store.get("noirSession"));
  stored.expiresAt = 1;
  store.set("noirSession", JSON.stringify(stored));

  assert.equal(await NoirAuth.getSession(), null);
  assert.equal(store.get("noirSession"), undefined);
});

test("signOut clears the local session even if the request fails", async () => {
  stubFetch({ status: 200, body: tokenResponse() }, new Error("offline"));
  await NoirAuth.signIn({ email: "a@b.co", password: "x" });
  await NoirAuth.signOut();
  assert.equal(store.get("noirSession"), undefined);
});

test("resetPassword never reveals whether an address has an account", async () => {
  stubFetch({ status: 200, body: {} }, { status: 400, body: { msg: "User not found" } }, { status: 429, body: { error_code: "over_email_send_rate_limit" } });
  assert.deepEqual(await NoirAuth.resetPassword("a@b.co"), { ok: true });
  assert.deepEqual(await NoirAuth.resetPassword("nobody@b.co"), { ok: true });
  assert.match((await NoirAuth.resetPassword("a@b.co")).error, /Too many attempts/);
});

test("getSettings reads which providers are on; googleUrl points at the Auth authorize endpoint", async () => {
  stubFetch({ status: 200, body: { external: { google: true, phone: false, email: true }, disable_signup: false } }, new Error("offline"));
  assert.deepEqual(await NoirAuth.getSettings(), { google: true, phone: false, signupDisabled: false });
  assert.equal(await NoirAuth.getSettings(), null);
  assert.equal(NoirAuth.googleUrl("https://noir.example/account.html"),
    "https://example.supabase.co/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fnoir.example%2Faccount.html");
});

test("consumeRedirect turns the URL hash from Google / emailed links into a session", async () => {
  stubFetch({ status: 200, body: { id: "u1", email: "a@b.co", user_metadata: { name: "Asha Rao" } } });
  const result = await NoirAuth.consumeRedirect("#access_token=tok&refresh_token=ref&expires_in=3600&type=recovery");
  assert.equal(result.type, "recovery");
  assert.equal(result.session.user.name, "Asha Rao");

  assert.equal(await NoirAuth.consumeRedirect("#nothing=here"), null);
  assert.match((await NoirAuth.consumeRedirect("#error=access_denied&error_description=Access+denied")).error, /Access denied/);
});

test("updateName saves the name and refreshes the stored session", async () => {
  const calls = stubFetch(
    { status: 200, body: tokenResponse() },
    { status: 200, body: { id: "u1", email: "a@b.co", user_metadata: { full_name: "Asha R." } } }
  );
  await NoirAuth.signIn({ email: "a@b.co", password: "x" });

  const result = await NoirAuth.updateName("Asha R.");
  assert.equal(result.session.user.name, "Asha R.");
  assert.equal(calls[1].url, "https://example.supabase.co/auth/v1/user");
  assert.equal(calls[1].options.method, "PUT");
  assert.deepEqual(JSON.parse(calls[1].options.body), { data: { full_name: "Asha R." } });
  assert.equal(JSON.parse(store.get("noirSession")).user.name, "Asha R.");
});
