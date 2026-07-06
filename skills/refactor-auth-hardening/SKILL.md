---
name: refactor-auth-hardening
description: "Use this skill ONLY when a project already has authentication code and you want to harden the EXISTING auth to safer patterns — better-auth, Auth0/@auth0, next-auth, passport, or raw oauth/jwt/session/login code detected in the repo. It refactors what's already there toward best practice (secure session handling, safe token storage, OAuth PKCE, secure/HttpOnly/SameSite cookies, mobile Keychain/Keystore, ACUL-style hosted login screens) while PRESERVING behavior — users log in the same way, just more safely. It NEVER adds a brand-new auth system where none exists. Trigger phrases: \"harden our auth\", \"is our login secure\", \"fix our session/cookie handling\", \"move tokens out of localStorage\", \"add PKCE\", \"our JWT handling looks off\". This is the conditional secure-phase step of the refactor-chain pipeline; it activates only when auth code is present and stays dormant otherwise."
---

# Harden Existing Authentication — refactor-chain · secure (conditional)

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** secure · **Prerequisite:** do-the-work + refactor-security flagged (or detected) auth risk · **Next:** review gate.
**Adaptivity / conditional:** **Activates ONLY when auth code is detected** — the harness `auth` signal is true (`better-auth`, `@auth0`, `next-auth`, `passport` deps, or paths matching `auth|login|session|oauth|jwt`). On a repo with no auth, it stays dormant and yields to the lane.

## Purpose
Take the authentication a project **already has** and make it safer without changing how it feels to use. It **refactors existing auth** toward current best practice — rotating sessions on login, moving tokens out of `localStorage` into HttpOnly cookies or the platform Keychain/Keystore, adding OAuth **PKCE**, setting `Secure`/`HttpOnly`/`SameSite` on cookies, verifying JWT signatures and expiry properly, and (for Auth0-style setups) moving to hosted/ACUL login screens. **It preserves behavior**: the same users sign in the same way and land in the same place — the mechanics underneath just stop being risky. It **never adds a new auth system** to a project that doesn't have one; that is out of scope by design.

## When to use
- The repo already has auth and someone wants it made safer. Triggers: "harden our auth", "is our login secure", "our JWT/session handling looks off".
- Tokens or sessions are stored or transmitted unsafely. Triggers: "move tokens out of localStorage", "our cookies aren't Secure/HttpOnly", "fix our session handling".
- An OAuth flow is missing modern protections. Triggers: "add PKCE", "our redirect flow looks outdated", "switch to the hosted login page".
- Mobile auth stores secrets insecurely. Triggers: "put tokens in the Keychain/Keystore", "our app saves the token in plaintext".
- **Do NOT use** to add login to an app that has none (that's a feature build, not a refactor), or as a general security audit (that's `refactor-security`).

## What I'll tell you (plain-language / ADHD-friendly)
- "Your app already has login. I'm going to make the login **safer**, not different — people will sign in exactly the same way and end up in the same place."
- "I will **not** add a new login system or change your provider. I only harden what's already here. If I found no auth code, I'd step aside entirely."
- "One change at a time. First: your session id isn't refreshed when someone logs in — that lets an attacker reuse an old one. I'll rotate it on login. Want me to proceed? (step 1 of 4)"
- "That didn't verify cleanly — I undid it and I'm trying the safer variant (attempt 2 of 3). Your login still works the way it did before."
- "Moving your token from `localStorage` into an HttpOnly cookie means JavaScript can't read it anymore, so a script-injection can't steal it. Login still works the same for the user."
- "Want the technical detail — the exact cookie flags, PKCE parameters, or Keychain accessibility class? Say 'show technical details'."

## Method
1. **Confirm the signal.** Verify auth code is actually present (`scripts/checklist.mjs --detect`, plus the harness `auth` signal). If not, **stop and hand back to the lane** — do not invent auth.
2. **Inventory the existing auth.** Identify provider/library (better-auth, Auth0, next-auth, passport, hand-rolled), the flows in use (password, OAuth/OIDC, magic-link, MFA), where tokens/sessions live (cookie, `localStorage`, memory, mobile store), and where cookies are set. Record the **behavior to preserve** (who can log in, the redirect target, the session lifetime).
3. **Diagnose against the hardening checklist** (`references/method.md` §hardening): session rotation & fixation, token storage, cookie flags, PKCE/OAuth params, JWT verification, MFA presence, logout/invalidation, mobile secure storage, hosted/ACUL login. Note each gap with `file:line`.
4. **Harden one pattern at a time**, behavior-preserving. Checkpoint before each (`orchestrate.mjs checkpoint`). Apply the safe swap (see `examples/before-after.md`), then verify the login flow still behaves identically (`orchestrate.mjs advance` / re-run the baseline).
5. **Ask before anything user-visible or risky** — a change to the hosted login page, cookie domain, or session lifetime pauses for confirmation, since it can log users out. Never rotate provider config silently.
6. **Report** into `templates/output.md`: what was hardened, the preserved behavior, and anything that needs a human/provider-side change (e.g. an Auth0 tenant setting).

## Guardrails
- **Behavior is preserved — this is a refactor.** Same users, same flow, same landing page; only the mechanics get safer. If a change would alter who can log in or where they land, stop and flag it.
- **Never add a new auth system.** No provider where there was none, no new login where none existed. If detection is false, this skill does nothing.
- **Provider config is the human's call.** Tenant/redirect-URI/allowed-origins changes on Auth0/next-auth are proposed, never silently applied; some require a dashboard change this skill can't make.
- **Secrets stay out of the diff.** Client secrets and keys move to env/secret stores, never inline. Redact when reporting.
- **User-logout risk is announced.** Cookie-domain, SameSite, or session-lifetime changes can invalidate live sessions — say so and confirm first.

## Verify
- Plain-language: "You can still log in the same way, land on the same page, and stay logged in as before — but the token/session/cookie is now handled the safe way. Nothing about the user experience changed."
- Technical: the recorded baseline / login smoke path passes unchanged; cookies now carry `Secure; HttpOnly; SameSite`; tokens no longer in `localStorage` (moved to HttpOnly cookie or Keychain/Keystore); OAuth uses PKCE (`code_challenge`/`code_verifier`); JWT verified with signature + expiry; `scripts/checklist.mjs` items are pass / hardened / not-applicable; `templates/output.md` populated with any provider-side follow-ups.

## Resources
- `references/method.md` — auth detection rules, the full hardening checklist, per-stack notes (better-auth, Auth0/ACUL, next-auth, passport, Swift/Keychain, Android/Keystore), and safe-swap sequences.
- `examples/before-after.md` — worked hardenings (localStorage→HttpOnly cookie; OAuth→PKCE; session rotation; mobile Keychain).
- `scripts/checklist.mjs` — zero-dep Node script; prints the hardening checklist as JSON and supports a `--detect` note for the auth-present gate.
- `templates/output.md` — the hardening report scaffold (what changed, behavior preserved, provider-side follow-ups).

## Chain position
Runs in the **secure** phase, conditionally, after do-the-work and typically after `refactor-security` has flagged auth risks. `refactor-security` *finds* auth weaknesses (advisory); this skill *fixes* them (refactor) — the two are complementary, not duplicates. Its output feeds the **review gate** near the end of the lane. When no auth code is present, it is skipped entirely.
