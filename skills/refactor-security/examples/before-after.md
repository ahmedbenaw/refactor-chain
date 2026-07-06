# Worked example — static security audit of a refactor diff

A "clean up the user lookup" refactor was run on a small Express + Postgres API. The
`refactor-security` skill audited the resulting diff. Nothing below was executed — every
finding came from **reading** the change.

---

## The diff under audit

```diff
--- a/src/routes/users.ts
+++ b/src/routes/users.ts
@@ -8,15 +8,17 @@ import { pool } from "../db";
-  // old: parameterized
-  const { rows } = await pool.query(
-    "SELECT id, name FROM users WHERE id = $1", [req.params.id]
-  );
+  // "tidied" into a helper that builds the string
+  const { rows } = await pool.query(buildUserQuery(req.params.id));
   res.json(rows[0]);
 }
+
+function buildUserQuery(id: string) {
+  return `SELECT * FROM users WHERE id = '${id}'`;
+}
@@ -30,6 +32,8 @@
-  logger.info("login attempt");
+  logger.info(`login attempt for ${email} pw=${password}`);
+  const hash = crypto.createHash("md5").update(password).digest("hex");
```

Also in the diff: `src/config.ts` gained `const STRIPE_KEY = "sk_live_51H...9aQz";`.

---

## What the audit found (reasoning, not running)

1. **`buildUserQuery` (`users.ts:22`)** — request param `req.params.id` flows into a SQL
   string via template interpolation. Untrusted **source** → SQL **sink**, no parameter
   binding. The refactor *removed* the parameterized query that was there. → **Injection,
   Blocker, high confidence.**
2. **`SELECT *` (`users.ts:23`)** — was `SELECT id, name`; now returns every column,
   including any password hash / PII. Over-broad response. → **PII exposure, Worth-fixing,
   medium.**
3. **`logger.info(... pw=${password})` (`users.ts:33`)** — plaintext password written to
   logs. → **Sensitive data in logs, Blocker, high.**
4. **`crypto.createHash("md5")` (`users.ts:34`)** — password hashed with MD5. → **Weak
   crypto, Blocker, high.**
5. **`STRIPE_KEY = "sk_live_..."` (`config.ts`)** — live Stripe secret committed inline
   (was an env var before the refactor). → **Secret in code, Blocker, high.** Redacted in
   report to `sk_l…9aQz`.

---

## The ranked report produced

> **Is it safe to ship? No — 4 blockers.**
>
> **Blockers (fix before shipping)**
> 1. `users.ts:22` — database query built from the URL id by gluing strings. That's SQL
>    injection; an attacker can read or dump the whole table. The old code used a safe
>    `$1` parameter — restore that. *(CWE-89 · high)*
> 2. `config.ts:4` — a live Stripe key `sk_l…9aQz` is now hard-coded in the source.
>    Anyone with the repo can charge your account. Move it back to an env var and rotate
>    the key. *(CWE-798 · high)*
> 3. `users.ts:33` — the login log now prints the user's password in plaintext. Remove
>    `pw=${password}` from the log line. *(CWE-532 · high)*
> 4. `users.ts:34` — passwords are hashed with MD5, which is broken. Use bcrypt/argon2.
>    *(CWE-916 · high)*
>
> **Worth fixing**
> 5. `users.ts:23` — `SELECT *` now returns every user column (incl. the hash) to the
>    client. Select only `id, name`. *(CWE-200 · medium)*
>
> **Optional** — none this diff.
>
> **Checked and clean:** unsafe deserialization, SSRF, CORS/CSP, broken-access-control —
> no findings in this diff.
>
> Nothing in your code was changed by this audit. Fixing these is a separate step — say
> "fix the blockers" and I'll propose the exact edits.

---

## Why this is the right output

- Every finding has `file:line`, plain-English *why it matters*, and a concrete fix.
- It caught the **refactor regression** (a safe parameterized query turned unsafe) — the
  signature failure mode this phase exists to catch.
- The secret is **redacted**, not reproduced.
- It ranked honestly and named the categories it checked and found clean, so silence
  isn't mistaken for safety.
- It edited nothing and offered the fix as an explicit, separate next step.
