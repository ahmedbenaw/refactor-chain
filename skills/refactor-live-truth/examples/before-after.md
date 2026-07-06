# Worked example — the stale README default

## Setup

A web-lane chain step needs to change how the dev server proxies API calls. The
repo's `README.md` states:

> The dev server runs on port 8080 and proxies `/api` to the staging backend.

## Before — trusting the doc (what goes wrong)

The claim is taken at face value. The proxy edit is written assuming port 8080,
the verify step "passes" because the code compiles, and the PR description repeats
the README's sentence. First manual run: the dev server actually boots on **3000**
(`vite.config.ts` sets `server.port: 3000`; the README predates a Webpack→Vite
migration two years earlier), and the proxy rule was added to a config block Vite
never reads. Nothing works; an hour goes into "debugging" a fact that was never true.

The failure wasn't the edit — it was asserting a system fact from prose.

## After — live-truth applied

1. **Claim caught before action.** "README says port 8080 / proxies `/api`" is named
   as a level-6 claim (prose) with two load-bearing facts: the port and the proxy mechanism.
2. **Witness picked from the ladder.** Config beats prose: read the live dev-server
   config now.
   ```
   $ grep -n "port\|proxy" vite.config.ts
   12:    port: 3000,
   14:    proxy: { "/api": { target: process.env.API_TARGET ?? "http://localhost:9000" } },
   ```
3. **Verdict recorded.** Claim-verification log:
   | Claim | Source | Witness | Verdict |
   | --- | --- | --- | --- |
   | dev port is 8080 | README (prose) | `vite.config.ts:12` → 3000 | **stale** |
   | `/api` proxied to staging | README (prose) | `vite.config.ts:14` → env-driven, default localhost:9000 | **stale** |
4. **Repo wins; doc parked.** The edit targets the real Vite proxy block. The README
   discrepancy is flagged as a parked item in the step notes ("README ports/proxy
   section predates Vite migration — stale") — not silently rewritten mid-step.
5. **Verify cites the witness.** The verdict quotes the actual dev-server boot line
   (`Local: http://localhost:3000/`), not the README's promise.

## Why the after wins

- Thirty seconds of grep replaced an hour of phantom debugging.
- The write-up can cite evidence ("checked `vite.config.ts:12–14`"), so the reviewer
  doesn't have to re-litigate the facts.
- The stale README is now a tracked, deliberate fix instead of an invisible trap for
  the next person — parked, scoped, and mentioned in the write-up.
