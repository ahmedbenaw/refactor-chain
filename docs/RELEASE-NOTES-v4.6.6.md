# refactor-chain v4.6.6

A final-version hardening wave. A four-pass adversarial self-review (the plugin's own Review
Board, run on itself) found that the pipeline's two load-bearing gates did not actually gate, plus
a long tail of correctness, installer, and detection defects. This release fixes all of them, each
with a test that fails against the old code.

## Fixed — the gates now actually gate
- **The "done" gate was unwired.** The Stop hook meant to block a premature "done" checked
  `phase === "done"`, a value the harness never sets (the real terminal phase is `docs`), so it
  approved the moment the last step advanced. It now gates on the review-gate step's verified
  status, so "done" is unreachable until the gate step passes.
- **The mandatory 100% guidelines gate was bypassable.** `eval` trusted a cached (or hand-written)
  `guidelines.json`, and an "exception" was any bare id in a self-written array. Now it always
  re-extracts the observed facts, and an exception counts only as a recorded
  `{id, reason, approvedAt}` object. A fabricated manifest or a bare-id array can no longer pass.
- **The plan-phase decision window ran on wrong data.** The principle recommendation dropped each
  language's family, so JS/Python/Go/Elixir got an empty or truncated set. Family is now resolved
  from the registry, so the correct per-stack principles surface.
- **scope-fence was documentation, not a fence.** The `scope` field it keyed on was never
  populated and its guard only recorded (PostToolUse). The matcher is now path-segment and
  separator-normalized (a `node_modules/src` path no longer counts as `src/`, and Windows
  backslash paths compare correctly), and the docs are corrected to describe it honestly.

## Fixed — aggregation, harness, durability
- Review findings with a string `confidence` ("0.9") or `behaviorChanged` ("false") now aggregate
  identically to native types (string confidence was collapsing to 0.5 and flipping decisions).
- The dedupe merge reconciles verdicts, so a CONFIRMED duplicate is never masked by a SUSPECTED one.
- `readState` is guarded and `state.json`/`board.json` are written atomically (temp file + rename),
  so a corrupt or half-written file can no longer crash `status`/`advance`/`doctor` or the read-only
  Action. `doctor` reports corruption instead of hiding it.
- `checkpoint` no longer leaves the git index fully staged; `baseline` refuses to re-run mid-chain;
  `init` refuses to overwrite an active run; the board refuses to aggregate a partial round.
- `risk-guard` now catches the genuinely destructive commands it was missing (`rm -r`,
  `find -delete`, `curl | sh`, `git checkout -- .`) and stops nagging the safe `--force-with-lease`;
  the ship-file matcher no longer fires on `.env.example` or doc files.
- `intake` uses whole-word triggers, so "solidify" and "the refactoring book" no longer arm it.

## Fixed — installers and CI
- **No secret leak.** Installing from a working clone no longer copies a token-bearing `.env` or
  the `.git` directory into `~/.codex` (all four installers).
- Every installer verifies the harness scripts actually landed before printing success, so a
  partial copy fails loudly instead of registering hooks that point at missing files.
- The Windows Go binary uses `npx.cmd`; `rcx --help` no longer crashes; `install.sh`'s Node-less
  uninstall warns instead of stranding hooks.
- **CI now behaviorally exercises all four installers** (shell, Node, Go, and PowerShell on a real
  Windows runner), the checklist scripts of all 56 skills, and the installer download path for real
  (the previous download-path test silently ran the local path instead).

## Detection, registry, docs
- The secret scan now covers `.go`; the `auth` signal no longer false-fires on `AUTHORS.md`;
  Delphi/Pascal is one correctly-classified entry instead of two mis-mapped duplicates; the memory
  file is bounded; a committed or stale `state.json` no longer shows every teammate a phantom
  paused-run banner. `STATE-SCHEMA.md` was rewritten to match the actual state object.

—
Ahmed "Ben" Zayed · Head of Products & Ventures at ZAT.VC [Venture Partner]
