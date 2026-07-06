# Attack log — step {{N}} of {{M}}: `{{step skill name}}`

> `refactor-adversarial-verify` · {{ISO timestamp}} · target: `{{target dir}}`
> Numbered per `refactor-chain/references/reasoning-protocol.md` — revisions to a
> claim are shown as C1 → C1', never silently rewritten.

## Claim
C1. {{One falsifiable present-tense sentence: what is now true — including "…with a
pass-set identical to baseline." If C1 was revised mid-verify, keep the original AND
the revision: C1' — {{revised claim}} (revised because attack {{A|B|C}} landed).}}

## Attack A — wrong-assumption
Assumptions this step rests on:
- A1. {{assumption}} → evidence: {{command/file:line/output that checked it against the LIVE repo}} → {{holds | LANDS: what broke}}
- A2. {{…}}

## Attack B — edge-case
Two most plausible edges for this claim (plausible, not easiest):
- B1. {{edge — e.g. empty input / called twice / old-name residue}} → {{traced through {{file:lines}} | executed via {{command}}}} → {{holds | LANDS: divergence found}}
- B2. {{…}}

## Attack C — does-it-actually-run
Changed paths and their execution evidence:
- C-a. `{{path/file — changed lines}}` → evidence: {{baseline test that reaches it | direct run: command + observed output}} → {{holds | LANDS: no execution evidence}}
- C-b. {{…}}

{{If any attack came up empty: "Searched: {{what was actually searched/checked}} — found nothing." An empty attack without a search trail is theater.}}

## Verdict
**{{SURVIVED — 3/3 | FELL — attack {{A|B|C}} landed}}**

{{On SURVIVED:}} → `orchestrate.mjs advance --target {{dir}} --delta legal --note "adversarial-verify: survived 3/3{{ after {{X}} landed and was fixed}}"`
{{On FELL:}} → no advance. Action taken: {{fixed within scope + re-ran refactor-verify + re-attacked | rolled back to checkpoint `{{sha}}` + advance --delta drift + fail --reason "{{attack that landed}}"}}

## Parked (out-of-scope finds for the write-up)
- {{anything the attacks surfaced that is NOT this step's job — test gaps, adjacent bugs — flagged, never silently fixed (see refactor-scope-fence)}}
