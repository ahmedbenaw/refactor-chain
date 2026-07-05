# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately through
**GitHub Security Advisories** on this repository
(*Security → Report a vulnerability*). Do not open a public issue for
anything exploitable. You will get an acknowledgement, a fix or a mitigation
plan, and credit in the advisory if you want it.

## Security model

### Hooks

refactor-chain registers six hooks (SessionStart, UserPromptSubmit,
PreToolUse, PostToolUse, Stop, SessionEnd). Their security posture:

- **They never auto-approve anything.** The PreToolUse risk-guard never emits
  an `allow` decision — doing so would bypass the host's permission system.
  It stays silent for safe cases (so the normal permission flow runs
  unchanged) and only ever emits **ask** when a risky action occurs inside an
  active chain.
- **Dormant unless a chain is active.** Every hook checks for
  `<project>/.refactor-chain/state.json` first and exits immediately, with no
  output and no side effects, when the project has no active run.
- **Never-throw, never-block.** Hook bodies are wrapped so any internal error
  exits 0. A hook failure can never break a session, veto a tool call, or
  trap the user in a stop loop.
- The Stop-hook ship-gate can *block a premature "done" narrative* for an
  active run — that is its job — but it defaults to approve on any error.

### Installer

The install wizard (`install.sh` / `install.ps1` / `rcx.mjs` / the Go binary)
touches **only user-home configuration directories** (for example `~/.claude`,
`~/.codex`, editor config dirs). It never writes to system locations, never
needs elevation, **backs up** any settings file before modifying it, and is
**idempotent** — re-running it converges to the same state, and
`--uninstall` restores the backups it made.

### Publishing

`publish.sh` reads its token from the environment or a hidden interactive
prompt and **never stores tokens** — not on disk, not in git, not in shell
history. It also rejects obvious placeholder values.

### Harness scripts

The orchestrator and diagnostic scripts are zero-dependency Node with no
network access. All git invocations use argument arrays (no shell
interpolation). The diagnostic engine is read-only; the only writes anywhere
are under the project's `.refactor-chain/` directory, and session memory
captures durable facts only — never transcripts, never secrets.

## Supported versions

Security fixes land on the latest released major version (v3.x). Older majors
receive fixes on a best-effort basis only.
