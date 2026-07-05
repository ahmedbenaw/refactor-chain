# refactor-auth-hardening — full method

Depth behind `SKILL.md`. This skill **refactors existing authentication** toward safer
patterns while **preserving behavior**. It is **conditional**: it runs only when auth code
is detected. It **never adds a new auth system**. If detection is false, it does nothing
and hands control back to the lane.

---

## 0. The activation gate (must pass, or stop)

This skill activates only when authentication already exists. Confirm at least one of:

- **Dependency signal** (harness `auth` signal): `better-auth`, `@auth0/*`, `next-auth`,
  `passport` in the manifest.
- **Path signal:** files/dirs matching `auth`, `login`, `session`, `oauth`, `jwt`
  (the harness's `anyPath(/(auth|login|session|oauth|jwt)/i)` check).
- **Code signal:** a sign-in/callback/token-issue/session-set path in the source.

If none is present: **stop.** Report "no authentication code detected — nothing to harden"
and return to the lane. Do **not** scaffold login, add a provider, or introduce sessions.

---

## 1. Inventory the existing auth (before touching anything)

Record, read-only:

1. **Provider / library:** better-auth · Auth0 (SPA/regular-web/native) · next-auth ·
   passport (which strategies) · hand-rolled.
2. **Flows in use:** username/password, OAuth/OIDC (authorization-code, implicit?),
   magic-link/email OTP, social, MFA/step-up.
3. **Token & session storage:** cookie (which flags?), `localStorage`/`sessionStorage`,
   in-memory, mobile store (Keychain / Keystore / plaintext prefs), server session store.
4. **Cookie set-sites:** every place a session/auth cookie is written.
5. **Behavior to preserve — write it down:** who can log in, the post-login redirect
   target, session lifetime / "remember me", logout behavior. This is the invariant the
   verify step checks against.

---

## 2. Hardening checklist (diagnose each; note gap with file:line)

### H1 — Session fixation / rotation
- Session identifier must be **regenerated on privilege change** (login, step-up). If the
  same id survives an anonymous->authenticated transition, an attacker who planted it can
  ride the session. Fix: rotate/regenerate the session id at login.

### H2 — Token storage (web)
- Access/refresh/ID tokens in `localStorage` or `sessionStorage` are readable by any
  script and stealable via injection. Prefer **HttpOnly + Secure + SameSite cookies** (JS
  can't read them), or keep short-lived access tokens **in memory** with the refresh token
  in an HttpOnly cookie. Never persist a long-lived token where JS can read it.

### H3 — Cookie flags
- Every auth/session cookie needs `HttpOnly` (no JS access), `Secure` (HTTPS only), and
  `SameSite=Lax` or `Strict` (CSRF defense). Scope `Path`/`Domain` as narrowly as the app
  allows. `SameSite=None` requires `Secure` and is only for genuine cross-site needs.

### H4 — OAuth / OIDC: PKCE and params
- Public clients (SPA, mobile, native) must use the **authorization-code flow with PKCE**
  (`code_challenge` + `code_verifier`), never the deprecated implicit flow. Verify `state`
  (CSRF) and `nonce` (replay) are generated, sent, and checked. Redirect URIs must be an
  exact allow-list. Fix: migrate implicit->code+PKCE; add/verify state & nonce.

### H5 — JWT verification
- Tokens must be verified with a **checked signature** (reject `alg:none`, reject
  algorithm confusion), plus `exp`/`nbf`/`iss`/`aud` validation. Don't trust an unverified
  decode. Don't put secrets/PII in a JWT payload (it's readable). Fix: verify properly;
  shorten lifetime; use refresh rotation.

### H6 — MFA / step-up (note, don't force)
- If the provider supports MFA and the app handles sensitive actions, note the option for
  step-up auth. This is advisory unless the user asks — enabling MFA changes user behavior
  and is out of "preserve behavior" scope without consent.

### H7 — Logout & invalidation
- Logout must invalidate the server session and clear the cookie; refresh tokens should be
  revocable. A logout that only drops the client token leaves a live session. Fix: invalidate
  server-side on logout.

### H8 — Mobile secure storage
- **iOS:** tokens belong in the **Keychain** with an appropriate accessibility class
  (e.g. `WhenUnlockedThisDeviceOnly`), never in `UserDefaults`/plaintext. Prefer ASWebAuth
  session for the login flow; use PKCE.
- **Android:** tokens belong in the **Keystore**-backed EncryptedSharedPreferences or the
  Keystore directly, never in plain `SharedPreferences`. Use Custom Tabs / AppAuth with
  PKCE for the flow.

### H9 — Hosted / ACUL login (Auth0-style)
- Prefer the provider's **hosted / universal login** over an embedded credential form:
  it centralizes security, bot detection, and updates. For advanced brandable login, the
  provider's **ACUL (Advanced Customization for Universal Login)** approach keeps the flow
  hosted while allowing a custom screen. Moving to hosted login is user-visible — confirm
  first (redirect target changes).

### H10 — Secrets out of the diff
- Client secrets, signing keys, and provider credentials move to env/secret stores, never
  inline. Public clients must not embed a client secret at all. Redact when reporting.

---

## 3. Safe-swap sequences (behavior-preserving)

Each swap: **checkpoint -> apply -> verify login unchanged -> advance.** One pattern per step.

- **localStorage token -> HttpOnly cookie:** add the cookie-set on the server callback;
  read from the cookie; keep the old read as a fallback for one step; migrate; then remove
  the `localStorage` write. Verify the user still lands logged-in.
- **Implicit -> code+PKCE:** stand up the code+PKCE flow alongside; point the login button
  at it; verify the same user reaches the same post-login page; remove the implicit path.
- **Session rotation on login:** regenerate the session id inside the successful-login
  handler, copying existing session data across; verify the user stays logged in.
- **Add cookie flags:** set `HttpOnly; Secure; SameSite` on the set-cookie; verify the app
  still authenticates. **Warn:** a `SameSite`/`Domain` change can log users out — confirm.
- **Mobile plaintext -> Keychain/Keystore:** write new tokens to the secure store; read
  from it with a one-time migration from the old location; verify sign-in persists.

---

## 4. Per-stack notes

- **better-auth:** prefer its built-in cookie/session handling and secure defaults; ensure
  cookies use the secure flag set; use its CSRF protection.
- **Auth0:** SPA -> code+PKCE via the SPA SDK; regular web -> code flow with server session;
  native -> code+PKCE + Keychain/Keystore; prefer universal/hosted login, ACUL for custom
  branded screens. Tenant/redirect-URI changes are dashboard-side — propose, don't apply.
- **next-auth:** verify `session.strategy`, cookie options, `NEXTAUTH_SECRET` from env,
  callback allow-lists.
- **passport:** confirm the strategy verifies properly; session serialization is minimal;
  cookies flagged; regenerate on login.

---

## 5. Preserve-behavior & consent rules

- The invariant is the login experience: same users, same flow, same landing page, same
  session lifetime unless the user asked to change it.
- Anything user-visible (hosted-login switch, cookie domain, SameSite, session lifetime,
  enabling MFA) pauses and asks — it can log users out.
- Provider/tenant config is proposed, never silently changed; some changes require a
  dashboard action outside this skill.
- Never add auth where none exists. Never leave a secret in the diff.
