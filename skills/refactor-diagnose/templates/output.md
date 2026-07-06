# Diagnosis — <project-name>

_Produced by `refactor-diagnose` (read-and-classify only). Handed to the plan phase._

## Plain-language verdict
> <e.g. "I think you want to tidy up your front-end project's structure. I'm about
> 85% sure. Nothing has changed — this is just the plan.">

## Classification (from diagnose.mjs classify)
- **case:** `<refactor-web|refactor-backend|refactor-ui|refactor-code|whats-wrong|web-performance|code-memory>`
- **lane:** `<backend|web|ui|code|debug>`
- **platform:** `<web|mobile|desktop|backend|cli|monorepo>`  ·  **os:** `<posix|windows|ios|android|cross>`
- **framework:** `<framework-or-none>`  ·  **monorepo:** `<yes|no>`
- **confidence:** `<0.00–1.00>`  ·  **inScope:** `<yes|no>`
- **mode:** `<careful|autopilot|ask>`
- **signals:** `<the fired signals list>`

## Structured reasoning
1. **Evidence:** <which signals fired>
2. **Candidates:** <top lane + alternatives with scores>
3. **Winner & why:** <the deciding evidence/intent, one sentence>
4. **What could make me wrong:** <the ambiguity that would flip it>
5. **Decision:** <lane + mode + "proceeding" or "asking the clarify below">

## Clarify (only if ambiguous / monorepo)
- **Question asked:** <the single A/B or monorepo question, verbatim, or "none — confident">
- **Answer:** <A|B|package name, once received>

## Scope
- **In scope:** `<yes|no>`
- **Redirect (if out of scope):** <the plain-language redirect, or "n/a">

## Conditional add-ons armed
- **auth (security gate):** `<armed|off>`
- **telemetry (data plan):** `<armed|off>`
- **dags (Airflow tactics):** `<armed|off>`

## Handoff
> Ready for the **plan** phase with `{case, lane, os, platform, mode, conditional}`.
> After the run: call `diagnose.mjs learn --retro '{"lane":"<lane>","outcome":"done"}'`
> to improve confidence next time.
