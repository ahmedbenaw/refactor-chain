# refactor-chain installer — shared behavior spec

All four layers (`install.sh`, `install.ps1`, `bin/rcx.mjs`, Go binary) implement THIS SAME algorithm and read `installer/manifest.json`. Same inputs → same result. `ahmedbenaw` is substituted at publish time.

## Algorithm (every layer)

1. **Locate the plugin source.** If run from inside a clone (a `.claude-plugin/plugin.json` exists next to `installer/`), use local files. Otherwise download the tarball from `manifest.tarball` (curl → wget → fetch, whichever exists; PowerShell: `Invoke-WebRequest`) into a temp dir and extract. **git is optional** — tarball works with no git.

2. **Detect the platform.** OS (macOS/Linux/Windows), arch, and the available package manager from `manifest.package_managers[os]` (first one found on PATH). Record for the report.

3. **Detect installed surfaces.** For each surface in `manifest.surfaces`, mark PRESENT if any of its `detect` hits: a `dirs` path exists, an `apps` app is installed (macOS `/Applications/<App>.app`; Windows registry/Start-Menu; Linux `.desktop`), a `bins` command is on PATH, a `vscode_ext` extension dir exists under the editor's extensions folder, or `always_try` is true. `claude-cowork` PRESENT ⇒ it's covered by `claude-code` (`same_as`); don't double-install.

4. **Show the plan.** Print the detected OS + package manager and a checklist of surfaces that WILL be installed / skipped (not present), and ask to proceed (interactive) or proceed automatically (`--yes`). ADHD-friendly: one screen, plain words, "here's exactly what I'll do."

5. **Install per surface by `method`:**
   - **claude-home** (Claude Code / Cowork): copy `skills/*` → `~/.claude/skills/`, `commands/*` → `~/.claude/commands/`, `scripts/*` (+ `lib/`) → `~/.claude/skills/refactor-chain/scripts/`; then register the 6 `manifest.hooks` in `~/.claude/settings.json` using **space-free absolute** `node <hook_scripts_at>/<script>` commands. Back up `settings.json` first; idempotently remove any prior entries whose command contains `refactor-chain/scripts/` before adding. If Node is missing, still install files but warn the hooks/scripts need Node at runtime (offer to bootstrap Node via the package manager).
   - **codex-home** (Codex): copy the whole plugin → `~/.codex/plugins/refactor-chain/`; merge the 6 hooks into `~/.codex/hooks.json` (create if absent; same idempotent rule) using space-free paths under `hook_scripts_at`.
   - **npx-skills** (editors): run `manifest.npx_skills_broad` with the surface's `agent`. Requires Node/npx — if absent, try to bootstrap it via the package manager; if that fails, record SKIPPED with the reason and the manual one-liner.

6. **Verify each surface** via its `verify` paths (or that `npx skills list` shows the skills). Mark ✓ installed / ⚠ skipped / ✗ failed.

7. **Self-troubleshoot** common failures and act or advise:
   - Node missing → bootstrap via package manager (`brew/apt/dnf/... install node`); if no package manager, point to the Go binary / nodejs.org.
   - `settings.json`/`hooks.json` malformed → restore the backup, report.
   - Hook path would contain a space → refuse to write that hook, warn loudly (the known veto bug).
   - Permission denied on a dir → report the exact `chmod`/sudo hint; never silently sudo.
   - No surfaces detected → say so plainly and list the manual per-surface commands.

8. **Final summary.** Plain-language: what's installed ✓, what was skipped and why, and the ONE next action ("open Claude Code and type /refactor"). Non-zero exit only on a hard failure of a requested surface.

## Flags (all layers)
`--yes` (non-interactive), `--only <id,id>` (specific surfaces), `--skip <id,id>`, `--dry-run` (detect + plan, install nothing), `--owner <name>` (override `ahmedbenaw`), `--details` (verbose/technical), `--uninstall` (remove refactor-chain from each surface: delete skills/commands/plugin dirs, remove hook entries, restore backup).

## Tone
Calm, plain-language, ADHD-friendly. One screen per decision. Say what will happen before doing it. Never require anything be pre-installed for the shell core to run (POSIX sh + curl/wget, or PowerShell + Invoke-WebRequest, are OS defaults). The Node wizard is a nicer optional face; the Go binary is the no-runtime fallback.
