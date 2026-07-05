# Worked examples — hardening EXISTING auth (behavior preserved)

Each example takes auth the project **already had** and makes it safer without changing how
users log in. None adds a new auth system. Detection was true in every case (auth code
present), so the skill activated.

---

## Example 1 — token in `localStorage` -> HttpOnly cookie (React SPA + Auth0)

**Detected:** `@auth0/auth0-react` in `package.json`; token read from `localStorage`.
**Behavior to preserve:** user clicks "Log in", authenticates with Auth0, lands on
`/dashboard`, stays logged in across reloads.

### Before
```js
// after callback
localStorage.setItem("access_token", token);      // readable by any script -> stealable
const token = localStorage.getItem("access_token");
fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } });
```

### After
```js
// server sets an HttpOnly cookie on the callback; the SPA never touches the raw token
// res.cookie("session", value, { httpOnly: true, secure: true, sameSite: "lax" })
fetch("/api/me", { credentials: "include" });      // cookie sent automatically; JS can't read it
```

**Why safer:** an injected script can no longer read the token — `HttpOnly` blocks JS
access, `Secure` keeps it HTTPS-only, `SameSite=Lax` defends CSRF.
**Behavior preserved:** same login button, same Auth0 flow, same `/dashboard` landing,
still logged-in across reloads. Nothing the user does changed.

---

## Example 2 — OAuth implicit flow -> authorization-code + PKCE

**Detected:** `response_type=token` (implicit) in the login redirect.
**Behavior to preserve:** same "Sign in with provider" button, same post-login page.

### Before
```
GET /authorize?response_type=token&client_id=...&redirect_uri=...   // implicit, deprecated
```

### After
```
// generate code_verifier + code_challenge (S256), keep state & nonce
GET /authorize?response_type=code&code_challenge=...&code_challenge_method=S256
              &state=...&nonce=...&client_id=...&redirect_uri=...
// exchange code + code_verifier at the token endpoint (server or PKCE-aware SPA SDK)
```

**Why safer:** the access token no longer rides in a URL fragment (leaks via history,
referrer, logs); PKCE binds the code to this client so a stolen code is useless; `state`
stops CSRF, `nonce` stops replay.
**Behavior preserved:** identical button, identical landing page — the exchange mechanics
changed underneath.

---

## Example 3 — session not rotated on login (session fixation)

**Detected:** Express + `express-session`; the same session id survives login.

### Before
```js
app.post("/login", (req, res) => {
  if (ok(req.body)) { req.session.userId = user.id; res.redirect("/app"); } // id unchanged
});
```

### After
```js
app.post("/login", (req, res) => {
  if (ok(req.body)) {
    req.session.regenerate(() => {          // NEW session id on login
      req.session.userId = user.id;
      res.redirect("/app");
    });
  }
});
```

**Why safer:** an attacker who fixed a victim's pre-login session id can no longer ride it
after login — the id is regenerated.
**Behavior preserved:** same login, same `/app` redirect, user stays logged in.

---

## Example 4 — mobile token in plaintext -> Keychain / Keystore

**Detected (iOS):** token written to `UserDefaults`.

### Before (iOS)
```swift
UserDefaults.standard.set(token, forKey: "authToken")   // plaintext, backed up, exposed
```

### After (iOS)
```swift
// store in the Keychain, this-device-only, requires unlock
let query: [String: Any] = [
  kSecClass as String: kSecClassGenericPassword,
  kSecAttrAccount as String: "authToken",
  kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
  kSecValueData as String: Data(token.utf8),
]
SecItemAdd(query as CFDictionary, nil)
```
*(Android equivalent: Keystore-backed EncryptedSharedPreferences instead of plain
SharedPreferences.)*

**Why safer:** the token is now hardware-protected, not readable from a backup or by
another process.
**Behavior preserved:** same login, same auto-sign-in on next launch (a one-time migration
reads the old location once, then deletes it).

---

## What every example has in common

- Auth **already existed** — the skill hardened it, it did not add a login system.
- The **login experience is identical** afterward (same button, flow, landing, persistence).
- The risky mechanic (script-readable token, token-in-URL, fixed session id, plaintext
  mobile store) was replaced with the safe one.
- User-visible or provider-side changes (cookie domain, hosted-login switch, tenant config)
  would have been **confirmed first** — none of these four required that, and each was
  checkpointed and verified against the preserved login behavior before advancing.
