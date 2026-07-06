<!--
refactor-auth-hardening — hardening report scaffold.
Fill every {{placeholder}}. Delete bracketed guidance before shipping.
This skill REFACTORS EXISTING auth and PRESERVES behavior. It NEVER adds a new auth system.
Redact secrets to first/last 4 chars. Flag anything that needs a human/provider-side change.
-->

# Auth hardening report — {{project_or_branch_name}}

**Activation:** auth code detected ({{signal — e.g. `@auth0/auth0-react` dep + `src/auth/` paths}}). Skill ran.
**Promise kept:** existing auth hardened; **no new auth system added**; login behavior preserved.
**Behavior preserved (the invariant):** {{who can log in}} sign in via {{flow}} and land on {{post-login target}}; session lifetime {{unchanged | changed with consent}}.
**Date:** {{YYYY-MM-DD}}

---

## What was hardened
[One row per applied change. Each preserved the login experience.]

| # | Area | Before (risky) | After (safe) | File(s) | User-visible? | Verified login unchanged |
|---|------|----------------|--------------|---------|---------------|--------------------------|
| 1 | {{e.g. Token storage}} | {{localStorage token}} | {{HttpOnly+Secure+SameSite cookie}} | `{{file:line}}` | {{no}} | {{yes}} |
| 2 | {{e.g. OAuth flow}} | {{implicit}} | {{code + PKCE}} | `{{file:line}}` | {{no}} | {{yes}} |
| 3 | {{…}} | {{…}} | {{…}} | `{{…}}` | {{…}} | {{…}} |

---

## Gaps found but NOT changed (need your call)
[User-visible or provider-side items this skill won't apply silently. If none: "None."]

- **{{area}}** — `{{file:line or provider}}` — {{what & why it pauses — e.g. "switching to hosted login changes the redirect and can log users out"}}. **Proposed change:** {{…}}. **Confirm to proceed.**

---

## Provider / dashboard follow-ups (outside this skill)
[Tenant/redirect-URI/allowed-origins/MFA settings the skill can't change in code. If none: "None."]

- {{e.g. Auth0: add the PKCE app's callback URL to the tenant's Allowed Callback URLs}}
- {{e.g. Rotate the client secret that was previously committed inline}}

---

## Still worth doing (advisory)
[MFA, refresh rotation, shorter token lifetimes — advisory unless the user opts in.]

- {{item — why, and that it changes user behavior / needs consent}}

---

## Verify (how we know behavior is preserved)
- **Plain:** you log in the same way, land on the same page, and stay logged in as before — the token/session/cookie is just handled safely now.
- **Technical:**
  - baseline / login smoke path: {{PASS — identical}}
  - cookies now: `{{Secure; HttpOnly; SameSite=…}}`
  - tokens no longer in web storage: {{confirmed — moved to {{cookie | Keychain | Keystore}}}}
  - OAuth: {{code + PKCE (code_challenge/code_verifier), state & nonce verified}}
  - JWT: {{signature + exp/iss/aud verified; no secrets in payload}}
  - checklist `scripts/checklist.mjs`: {{all items pass / hardened / n-a}}

---

## Next step
- **Confirm pending items** above to apply the user-visible changes.
- **Apply provider follow-ups** in the dashboard, then re-verify login.
- These changes flow into the refactor-chain **review gate** for the final go/no-go.

*This skill hardened auth that already existed and preserved how users log in. It did not add a new auth system.*
