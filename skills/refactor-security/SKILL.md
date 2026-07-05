---
name: refactor-security
description: "Use this skill when the refactor is done and you need a static security audit of the diff before it ships — reading the changed code (not running or attacking it) for injection, broken auth/session, secrets or credentials committed in code, weak crypto, PII/data leaks, unsafe deserialization, and SSRF/CORS/CSP mistakes. Trigger phrases include \"security review\", \"is this safe to ship\", \"check for vulnerabilities\", \"audit this change\", \"did we leak a secret\", \"OWASP check\". This is the secure-phase gate of the refactor-chain pipeline; it runs after do-the-work and alongside/just before review. It is advisory — it reports ranked findings and never edits code on its own."
---

# Static Security Audit of the Refactor Diff — refactor-chain · secure

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** secure · **Prerequisite:** do-the-work (a lane produced changes) · **Next:** review gate (findings feed the reviewer, then ship).
**Adaptivity / conditional:** repo-agnostic and advisory-only — reads the diff, ranks findings, edits nothing.

## Purpose
Read the code the refactor changed and answer one question in plain words: *is it safe to ship?* This is a **static** audit — it reads source, config, and dependency manifests and reasons about them. It does **not** run the app, send payloads, or pen-test anything live. It walks the OWASP Top 10 lens over the diff — injection, broken auth/session, secrets in code, weak crypto, exposed PII, unsafe deserialization, SSRF/CORS/CSP — and hands back a ranked list of what to fix, worded so a non-security engineer can act on it. It changes no code; the developer (or the review gate) decides what to do.

## When to use
- A refactor lane just finished and you want a safety check before the review gate or ship. Triggers: "security review", "is this safe to ship", "audit this change".
- Someone worries a change introduced or exposed a vulnerability. Triggers: "check for vulnerabilities", "OWASP check", "did we open a hole".
- You suspect a secret or credential got committed. Triggers: "did we leak a secret", "is there an API key in here".
- Precondition: there is a diff to look at (`git diff`, a branch, or a set of changed files). With no diff, it audits the current working tree but says so.

## What I'll tell you (plain-language / ADHD-friendly)
- "I'm reading the changed code for safety problems. I am **not** running or attacking your app — just reading it. Nothing I do changes your code."
- "I found 7 things. 2 are blockers (fix before shipping), 3 are worth fixing, 2 are optional. Here they are, most important first."
- "Blocker: `db.query('... ' + userId)` in `users.ts:42` builds a database query out of untrusted input. That's how data gets stolen. The fix is a parameterized query — want me to show the exact change?"
- "Good news: I checked for leaked passwords and API keys in the diff and found none."
- "This is a judgement call, not a certainty — I'll tell you how sure I am on each one, and you decide what ships."
- "Want the technical detail? Say 'show technical details' and I'll give you the CWE, the exact line, and the exploit path."

## Method
1. **Get the diff.** Determine the change set: `git diff --stat` and `git diff` against the base (branch/commit), or the explicit file list. If none exists, audit the working tree and say so. Never edit — read-only.
2. **Read added and moved code with a threat lens.** For each hunk, ask: does untrusted input reach a dangerous sink? did a refactor move a check away from where it used to guard? is a secret, PII field, or credential now in the diff? See `references/method.md` for the full sink/source catalogue.
3. **Walk the OWASP Top 10 checklist** (baked into `scripts/checklist.mjs`): injection, broken auth/session, secrets/credentials in code, weak/broken crypto, PII/data leaks, unsafe deserialization, SSRF/CORS/CSP misconfig, missing authorization, security misconfiguration, vulnerable dependencies. Note each finding with `file:line`, the class, and evidence.
4. **Rank every finding** as **Blocker** (fix before shipping — exploitable, secret exposed, auth bypass), **Worth fixing** (real weakness, not immediately exploitable), or **Optional** (hardening / defense-in-depth). Attach a confidence level.
5. **Write the report** into `templates/output.md`: ranked findings, each with plain-English what/why/where, a concrete fix, confidence, and the CWE/OWASP tag behind "technical details."
6. **Hand off, do not fix.** Present the report. Blockers pause the chain and go to the human; the review gate consumes the report. If asked to fix, that is a separate, clearly-labeled change — not smuggled into the refactor.

## Guardrails
- **Advisory-only. This skill edits nothing.** It reads and reports; a human or the review gate acts on it.
- **Static only — never runtime.** No running the app, no sending requests, no live exploitation. Reason from source, config, and manifests.
- **Refactor-aware, not a full-codebase audit by default.** Focus on the diff and code it touches; note whole-repo issues separately as context, don't drown the diff report in them.
- **No false confidence.** State a confidence on every finding; "I couldn't tell from static reading" is a valid, honest answer. Do not invent line numbers or CWEs.
- **Secrets stay redacted.** When reporting a leaked credential, show enough to locate it (`file:line`, first/last few chars) — never paste the full secret back into the report or logs.

## Verify
- Plain-language: "Every finding names a file and line, says why it matters, and gives a fix. The top of the list is the thing to fix first. Nothing in your code changed."
- Technical: the report in `templates/output.md` is populated; each finding has `file:line`, an OWASP/CWE tag, a severity (Blocker/Worth-fixing/Optional), and a confidence; `scripts/checklist.mjs` ran and every checklist item is marked pass / finding / not-applicable; no code edits exist in the working tree attributable to this skill.

## Resources
- `references/method.md` — full source→sink catalogue, per-category detection rules, ranking rubric, and language/framework notes.
- `examples/before-after.md` — a worked audit: a refactor diff, the findings it surfaced, and the ranked report.
- `scripts/checklist.mjs` — zero-dep Node script that prints the OWASP-Top-10 audit checklist as JSON.
- `templates/output.md` — the ranked findings report scaffold the skill fills in.

## Chain position
Runs in the **secure** phase after do-the-work, once a lane (Java/Web/UI/SOLID) has produced changes. Its report feeds the **review gate**, which runs near the end of every lane alongside `refactor-code-principles`. Blockers pause the chain for a human decision before ship. If the repo contains auth code, `refactor-auth-hardening` runs in this same secure phase to harden it; this skill flags auth *risks*, that skill *fixes* auth patterns.
