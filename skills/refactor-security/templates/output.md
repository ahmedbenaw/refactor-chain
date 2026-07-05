<!--
refactor-security — ranked findings report scaffold.
Fill every {{placeholder}}. Delete any bracketed guidance note before shipping.
This report is ADVISORY and STATIC: no code was changed and nothing was run.
Order findings Blocker -> Worth-fixing -> Optional; within a rank, highest confidence first.
Redact secrets to first/last 4 chars.
-->

# Security audit — {{project_or_branch_name}}

**Verdict:** {{Safe to ship | NOT safe to ship — N blocker(s)}}
**Scope:** static audit of {{diff description — e.g. `feature/x`..`main`, or "working tree (no diff)"}}
**Method:** read-only. No app was run, no requests sent, nothing was edited.
**Checked:** OWASP Top 10 lens (injection · auth/session · secrets · crypto · PII · deserialization · SSRF/CORS/CSP · access-control · misconfig · dependencies)
**Date:** {{YYYY-MM-DD}}

---

## Blockers — fix before shipping
[Exploitable now, secret exposed, or an auth bypass. If none, write "None." and say so — silence is not safety.]

### B1 · {{short title}}
- **Where:** `{{file}}:{{line}}`
- **What's wrong (plain):** {{one or two sentences a non-security engineer understands}}
- **Why it matters:** {{the concrete risk — data stolen, account charged, auth bypassed}}
- **Fix:** {{the concrete change to make}}
- **Confidence:** {{high | medium | low}}
- <details><summary>show technical details</summary>

  - **Category:** {{OWASP category}} · **{{CWE-xxx}}**
  - **Source → sink:** {{untrusted source}} → {{dangerous sink}}, unguarded
  - **Evidence:** `{{the offending code, secrets redacted}}`
  - **Refactor regression?** {{yes — was safe before this diff | no — new code}}
  </details>

[repeat B2, B3, … as needed]

---

## Worth fixing
[Real weaknesses, not immediately exploitable in this diff. If none: "None."]

### W1 · {{short title}}
- **Where:** `{{file}}:{{line}}`
- **What's wrong (plain):** {{…}}
- **Fix:** {{…}}
- **Confidence:** {{high | medium | low}}
- <details><summary>show technical details</summary>{{category · CWE · evidence}}</details>

[repeat as needed]

---

## Optional — hardening / defense-in-depth
[Nice to have; safe to defer. If none: "None."]

- **O1 · {{title}}** — `{{file}}:{{line}}` — {{what & the hardening suggestion}}. *({{CWE}})*

[repeat as needed]

---

## Checked and clean
[Name the categories you looked at and found no findings for, so silence isn't mistaken for safety.]
- {{e.g. Unsafe deserialization — none}}
- {{e.g. SSRF / CORS / CSP — none}}
- {{e.g. Broken access control — none}}

## Couldn't confirm from static reading
[Findings a runtime check (SAST / `npm audit` / DAST) would settle. Be honest about limits.]
- {{item — what a runtime tool would confirm}}

---

## Next step
Nothing here changed your code. To act on this:
- **Fix the blockers** — say "fix the blockers" and each will be proposed as a separate, clearly-labeled change (not folded into the refactor).
- **Send to review** — these findings feed the refactor-chain **review gate** for the final go/no-go.
- **Auth-specific items** — if this repo has login/session code, `refactor-auth-hardening` can harden those patterns directly.

*Ranking key — **Blocker:** fix before shipping · **Worth fixing:** real weakness, schedule it · **Optional:** hardening. Confidence — **high:** clear & unguarded · **medium:** likely, depends on code outside the diff · **low:** couldn't fully confirm statically.*
