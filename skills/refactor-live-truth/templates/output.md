# Claim-Verification Log — <step / task>

**Chain step:** <N of M — skill name> · **Date:** <date> · **Phase:** <understand | diagnose | verify>

## Load-bearing claims checked

| # | Claim | Original source (ladder level) | Live witness (file:line or command → output) | Verdict |
| --- | --- | --- | --- | --- |
| 1 | <the fact as stated> | <README / comment / memory note / …> | <what was checked and what it showed> | confirmed / stale / partly true |
| 2 | … | … | … | … |

## Divergences → parked items

<!-- One per stale claim. These feed the step notes and the write-up; scope-fence forbids fixing them mid-step. -->
- **<artifact>** claims <X>; the live <witness> shows <Y>. Parked as: "<one-line fix description>".

## Memory recalls re-verified

<!-- Only when a boot-banner / sessions.jsonl note was used this step. Delete if none. -->
- Recalled: "<note>" → checked <state.json / history.jsonl / code> → <still true | stale, superseded by …>.

## Attestation

- [ ] Every fact that drove an edit, plan line, or verdict has a row above.
- [ ] All witnesses were checked in THIS session, after the last edit that could affect them.
- [ ] No verify verdict cites documentation as evidence.
