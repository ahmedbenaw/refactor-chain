# refactor-ruthless-editor — full method: the cutting rules

One principle: **every sentence earns its place.** The edit changes length, never meaning.

## What is in scope
Prose the pipeline emits: the final write-up, shipping artifacts, PR bodies, reports, retro
summaries, README additions the chain drafted. **Out of scope, always:** source code, config,
tests, data files, fenced code blocks inside prose, `identifiers` and paths in backticks, direct
quotes, and any span the user asked to keep verbatim (check state notes for keep-verbatim flags).

## The fact inventory (do this FIRST)
Before touching a word, list every unit of information the draft carries:
- claims ("the build was green before and after")
- numbers and measurements ("38 files", "p95 214ms")
- file paths, commands, identifiers
- decisions and their reasons ("kept the legacy adapter because X depends on it")
- caveats, risks, open items ("the flaky test was skipped, not fixed")
- instructions to the reader ("run the migration before deploying")

This list is the loss detector. After editing, every entry must still be findable in the text.
If one is missing, revert the cut that removed it — do not re-add the fact from memory, because
memory paraphrases and paraphrase drifts.

## Cutting passes (in order — one category at a time)
1. **Throat-clearing.** Openers that delay the point: "It is worth noting that", "In this section
   we will", "As mentioned above". Delete; start at the point.
2. **Empty hedges.** Hedges that assert nothing ("somewhat", "fairly", "it could be argued").
   Distinguish from real caveats — a hedge that encodes genuine uncertainty is a fact; keep it.
3. **Duplicates.** The same point made in the intro, the body, and the summary. Keep the strongest
   occurrence (usually the one with the evidence attached); cut the rest.
4. **Non-working adjectives/adverbs.** "Comprehensive", "robust", "simply", "very". If deleting
   the word changes nothing, it was doing nothing.
5. **Passive detours.** "Changes were made to the parser by the chain" → "The chain changed the
   parser." Shorter and clearer, same claim.
6. **Heading echoes.** Sentences that restate the heading above them. The heading already said it.
7. **List compression.** Prose enumerations ("first… second… third…") become bullet lists when
   that is shorter; bullets that share a stem get the stem factored out.

Passes are ordered from safest to most structural. Stop early rather than force a rewrite —
a full rewrite is exactly the over-eager behavior this pipeline bans elsewhere for code, and the
same rule applies to prose.

## The 30% target
Typical pipeline drafts shed 25–40% without loss. Treat 30% as the expectation, not a quota:
- A draft already tight at 10% savings: take the 10% and say so.
- A bloated draft offering 50%: take it, but re-verify the inventory extra carefully.
- Never cut a fact to reach a number. Information loss is a defect; length is only a preference.

## Verification protocol
1. Run `scripts/checklist.mjs --measure <before> <after>` → words before/after, reduction %.
2. Walk the fact inventory item by item against the edited text. Tick each.
3. Diff the code blocks / verbatim spans between draft and edit — they must be byte-identical.
4. Record all of it in `templates/output.md`; an edit without a log did not happen.

## Tone preservation
The pipeline speaks calmly and plainly to the person running it. Cutting must not turn calm into
curt: keep the sentence that tells the user their code still works the same, even though a purely
information-theoretic edit might drop it. Reassurance the reader relies on is a fact.
