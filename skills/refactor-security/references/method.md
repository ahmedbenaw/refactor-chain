# refactor-security — full method (static security audit of a refactor diff)

This is the depth behind `SKILL.md`. It is a **static, read-only** method: reason from
source, config, and dependency manifests. Never run the app, send a request, or exploit
anything live. Never edit code. Produce a ranked findings report.

---

## 0. Scope the audit to the diff

1. Establish the change set, in order of preference:
   - explicit file list from the caller;
   - `git diff <base>...HEAD` (branch under review);
   - `git diff` / `git diff --staged` (uncommitted work);
   - if none: audit the working tree and **state in the report** that there was no diff.
2. Prefer added (`+`) and moved lines. A refactor's classic security bug is a **moved
   guard**: a validation, auth check, or escaping call that used to sit in the dangerous
   path got relocated, duplicated, or dropped during the restructure. Diff both sides.
3. Pull in code the diff *touches but didn't change* only enough to judge a finding
   (the function a changed line calls, the middleware that used to run first). Note
   whole-repo issues as context; do not turn a diff audit into a full-repo audit.

---

## 1. The source -> sink model

A vulnerability is (untrusted **source**) reaching a dangerous **sink** without an
adequate **sanitizer/guard** in between. For every changed hunk, trace it.

**Untrusted sources:** HTTP request (query, body, params, headers, cookies), route
params, uploaded files/filenames, WebSocket/message payloads, env values derived from
user input, third-party API responses treated as trusted, deserialized data, DB rows
originally populated by users (stored-XSS/second-order injection), CLI args.

**Dangerous sinks by category** (below). The audit is: for each sink present in the diff,
is every path to it from an untrusted source guarded?

---

## 2. OWASP Top 10 categories — what to look for

### A. Injection (SQL, NoSQL, OS command, LDAP, template, header)
- **String-built queries:** query with `+ x`, f-strings/template literals into SQL,
  `.raw(...)`, string concat into Mongo `$where`, ORM `.whereRaw()`. Sink -> **parameterized
  queries / prepared statements / query builders with bound params**.
- **OS command:** a shell-spawning call built from a string with interpolated input, or a
  subprocess call run through a shell. Sink -> arg arrays, no shell, allow-lists.
- **Template/SSTI:** user input into a template string compiled at runtime.
- **Header/CRLF & log injection:** unescaped input into response headers or log lines.
- CWE-89, CWE-78, CWE-90, CWE-943, CWE-917.

### B. Broken authentication & session management
- Auth check removed/relocated by the refactor; endpoint newly reachable without the
  guard that used to protect it.
- Session fixation (session id not rotated on login), missing session invalidation on
  logout, tokens with no expiry, JWT verified with `alg:none` or without signature check,
  secret comparison with `==` (timing) instead of a constant-time compare.
- Passwords hashed with fast/broken algorithms (MD5, SHA1, unsalted SHA-256) instead of
  bcrypt/scrypt/argon2. CWE-287, CWE-384, CWE-613, CWE-916.
- *Deep auth-pattern fixes are `refactor-auth-hardening`'s job — here, flag the risk.*

### C. Secrets & credentials in code
- Hard-coded API keys, passwords, private keys, connection strings, cloud creds in
  source or config **in the diff**. Patterns: AWS access-key prefixes, `sk-`/`sk_live_`
  provider keys, PEM `BEGIN ... PRIVATE KEY` blocks, `password = "..."`, `token: "..."`,
  bearer literals, `.env` values committed.
- A secret moved from an env var to an inline literal during "cleanup" is a classic
  refactor regression — flag it. CWE-798, CWE-259.
- **Redact in the report:** show `file:line` and first/last 4 chars only.

### D. Weak / broken cryptography
- MD5/SHA1 for anything security-relevant; DES/3DES/RC4; ECB mode; static/zero IV;
  hard-coded keys; non-CSPRNG randomness for tokens, salts, or IDs; disabled TLS
  verification (reject-unauthorized off, verify off, skip-verify true). CWE-327, CWE-330,
  CWE-326, CWE-295.

### E. Sensitive data exposure / PII leaks
- PII or secrets written to logs, error messages, analytics, or responses (stack traces
  to the client, logging a user object with password/token fields, full objects
  serialized to responses). Overly-broad API responses (returning the whole user row
  incl. hash). Missing redaction the refactor removed. CWE-200, CWE-532, CWE-209.

### F. Unsafe deserialization
- Python `pickle` loads, Java native deserialization of untrusted bytes, YAML full-load
  without a safe loader, `eval`/`Function`/`vm` on input, PHP `unserialize`, .NET
  `BinaryFormatter`. CWE-502.

### G. SSRF / CORS / CSP / request forgery
- **SSRF:** server-side fetch/HTTP call to a URL built from user input without an
  allow-list (cloud-metadata `169.254.169.254`, internal hosts). CWE-918.
- **CORS:** allow-origin `*` combined with credentials, or reflecting the `Origin` header
  unchecked. CWE-942.
- **CSP:** missing or `unsafe-inline`/`unsafe-eval` policy on a page the diff added.
- **CSRF:** state-changing endpoint newly added without CSRF protection / same-site
  cookie. CWE-352.

### H. Broken access control / missing authorization
- Endpoint added with authentication but no **authorization** (any logged-in user can act
  on another's object — IDOR). Direct object reference by user-supplied id without an
  ownership check. CWE-639, CWE-285.

### I. Security misconfiguration
- Debug mode on, verbose errors to client, default credentials, permissive file
  permissions, `0.0.0.0` bind added, disabled security middleware/helmet, wildcard
  routes. CWE-16.

### J. Vulnerable & outdated dependencies
- Diff adds/bumps a dependency to a version with a known CVE, or adds a package with a
  typosquat-looking name. Note the manifest change; recommend `npm audit` / `pip-audit` /
  OWASP dependency-check as the runtime follow-up (this skill stays static). CWE-1104,
  CWE-1035.

---

## 3. Ranking rubric

| Rank | Meaning | Examples |
|---|---|---|
| **Blocker** | Fix before shipping. Exploitable now, secret exposed, or auth bypass. | SQL built from request body; committed live API key; auth check dropped; unsafe deserialization of request data. |
| **Worth fixing** | A real weakness, not immediately exploitable in this diff. | Weak hash on a low-value field; CORS reflect without credentials; verbose error text; missing rate-limit. |
| **Optional** | Hardening / defense-in-depth. | Add CSP header; tighten a type; add a length cap; prefer argon2 over bcrypt. |

Attach a **confidence** to every finding: *high* (clear source->sink, unguarded),
*medium* (likely but depends on a caller not in the diff), *low* (couldn't fully confirm
from static reading — say so).

Ordering in the report: Blockers first (highest confidence first), then Worth-fixing,
then Optional.

---

## 4. Language / framework notes (non-exhaustive)

- **JS/TS:** string-exec via the process module; `dangerouslySetInnerHTML`; Express
  routes missing `helmet`; sending `err.stack` to the client; `jsonwebtoken` verify
  options; `mongoose` `$where`.
- **Python:** subprocess run through a shell; YAML full-load; pickle; Django `raw()` /
  `.extra()`; Flask `debug=True`; requests with verification disabled.
- **Java:** `Statement` + concatenation vs `PreparedStatement`; object-input-stream on
  untrusted bytes; runtime exec of a string; disabled hostname verifier; Spring endpoint
  missing `@PreAuthorize`.
- **Go:** `Sprintf` into SQL vs `?` placeholders; shell-spawned command; TLS config with
  skip-verify.
- **Config/IaC:** `.env` in the diff; open security groups; `0.0.0.0/0`; public buckets.

---

## 5. Honesty & non-destructiveness rules

- Read-only. Never write, edit, or run. If a fix is wanted, it is a separate labeled change.
- Never fabricate a `file:line`, CVE, or CWE. If unsure, mark confidence *low* and say what
  a runtime check (SAST/`npm audit`/DAST) would settle.
- Redact secrets. Locate, don't reproduce.
- A clean audit is a valid result: report "no findings in the diff for categories X...Z"
  explicitly rather than implying silence.
