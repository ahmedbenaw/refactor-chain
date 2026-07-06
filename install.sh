#!/bin/sh
# refactor-chain universal installer (POSIX core) — macOS / Linux / Unix.
# Zero prerequisites: needs only `sh` + one of curl/wget (OS defaults).
# Auto-detects Claude Code, Claude Cowork, Codex, and your editors, installs to
# each, verifies, and self-troubleshoots. Reads installer/manifest.json when run
# from a clone; otherwise downloads the plugin tarball.
#
#   curl -fsSL https://raw.githubusercontent.com/ahmedbenaw/refactor-chain/main/install.sh | sh
#
# Flags: --yes --dry-run --only <ids> --skip <ids> --owner <name> --details --uninstall
set -eu

OWNER="ahmedbenaw"
REPO_DEFAULT_TARBALL="https://github.com/${OWNER}/refactor-chain/archive/refs/heads/main.tar.gz"
YES=0; DRYRUN=0; DETAILS=0; UNINSTALL=0; ONLY=""; SKIP=""
while [ $# -gt 0 ]; do
  case "$1" in
    --yes|-y) YES=1 ;;
    --dry-run) DRYRUN=1 ;;
    --details|-v) DETAILS=1 ;;
    --uninstall) UNINSTALL=1 ;;
    --only) ONLY="${2:-}"; shift ;;
    --skip) SKIP="${2:-}"; shift ;;
    --owner) OWNER="${2:-}"; shift ;;
    *) ;;
  esac
  shift
done

# ---- pretty output (color only on a TTY) ----
if [ -t 1 ]; then B="$(printf '\033[1m')"; D="$(printf '\033[2m')"; G="$(printf '\033[32m')"; Y="$(printf '\033[33m')"; R="$(printf '\033[31m')"; N="$(printf '\033[0m')"; else B=; D=; G=; Y=; R=; N=; fi
say()  { printf '%s\n' "$*"; }
ok()   { printf '  %s✓%s %s\n' "$G" "$N" "$*"; }
skip() { printf '  %s–%s %s\n' "$Y" "$N" "$*"; }
bad()  { printf '  %s✗%s %s\n' "$R" "$N" "$*"; }
head() { printf '\n%s%s%s\n' "$B" "$*" "$N"; }
in_list() { case ",$1," in *",$2,"*) return 0 ;; *) return 1 ;; esac }

have() { command -v "$1" >/dev/null 2>&1; }
HOME_DIR="${HOME:-$(cd ~ && pwd)}"

# ---- 1. locate plugin source ----
SELF_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" 2>/dev/null && pwd || echo "")
SRC=""
if [ -n "$SELF_DIR" ] && [ -f "$SELF_DIR/.claude-plugin/plugin.json" ]; then
  SRC="$SELF_DIR"
elif [ -f "./.claude-plugin/plugin.json" ]; then
  SRC="$(pwd)"
fi
TMP=""
cleanup() { [ -n "$TMP" ] && rm -rf "$TMP" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
if [ -z "$SRC" ]; then
  head "Downloading refactor-chain…"
  TMP=$(mktemp -d 2>/dev/null || echo "/tmp/rcx.$$"); mkdir -p "$TMP"
  TB="$TMP/rc.tgz"
  URL=$(printf '%s' "$REPO_DEFAULT_TARBALL" | sed "s/ahmedbenaw/${OWNER}/g")
  if have curl; then curl -fsSL "$URL" -o "$TB" || { bad "download failed ($URL)"; exit 1; }
  elif have wget; then wget -qO "$TB" "$URL" || { bad "download failed ($URL)"; exit 1; }
  else bad "need curl or wget to download (both missing)"; exit 1; fi
  ( cd "$TMP" && tar -xzf "$TB" ) || { bad "extract failed"; exit 1; }
  SRC=$(find "$TMP" -maxdepth 2 -name plugin.json -path '*/.claude-plugin/*' -exec dirname {} \; | head -1 | sed 's#/.claude-plugin##')
  [ -n "$SRC" ] || { bad "could not find plugin in tarball"; exit 1; }
  ok "downloaded"
fi
[ $DETAILS -eq 1 ] && say "${D}source: $SRC${N}"

# ---- 2. detect platform ----
OS=$(uname -s 2>/dev/null || echo unknown)
case "$OS" in Darwin) OSN="macOS" ;; Linux) OSN="Linux" ;; *) OSN="$OS" ;; esac
PM=""
for c in brew apt-get dnf pacman zypper apk; do have "$c" && { PM="$c"; break; }; done
head "refactor-chain installer  ·  $OSN  ·  package manager: ${PM:-none}"

# ---- surface helpers ----
node_bin() { for c in node "$HOME_DIR/.local/node-current/bin/node"; do command -v "$c" >/dev/null 2>&1 && { command -v "$c"; return 0; }; [ -x "$c" ] && { echo "$c"; return 0; }; done; return 1; }
ensure_node() {
  node_bin >/dev/null 2>&1 && return 0
  [ -n "$PM" ] || return 1
  say "  ${D}Node not found — bootstrapping via $PM…${N}"
  case "$PM" in
    brew) brew install node >/dev/null 2>&1 || return 1 ;;
    apt-get) sudo apt-get update >/dev/null 2>&1 && sudo apt-get install -y nodejs npm >/dev/null 2>&1 || return 1 ;;
    dnf) sudo dnf install -y nodejs >/dev/null 2>&1 || return 1 ;;
    pacman) sudo pacman -Sy --noconfirm nodejs npm >/dev/null 2>&1 || return 1 ;;
    zypper) sudo zypper install -y nodejs >/dev/null 2>&1 || return 1 ;;
    apk) sudo apk add nodejs npm >/dev/null 2>&1 || return 1 ;;
  esac
  node_bin >/dev/null 2>&1
}

# ---- 3. detect surfaces ----
CLAUDE_HOME="$HOME_DIR/.claude"
CODEX_HOME="$HOME_DIR/.codex"
has_app() { [ -d "/Applications/$1.app" ] || [ -d "$HOME_DIR/Applications/$1.app" ]; }
detect_editor() { # id -> return 0 if present
  case "$1" in
    cursor)     has_app Cursor || have cursor ;;
    vscode)     has_app "Visual Studio Code" || has_app VSCodium || have code || have codium ;;
    windsurf)   has_app Windsurf || have windsurf ;;
    zed)        has_app Zed || have zed ;;
    continue)   [ -d "$HOME_DIR/.continue" ] ;;
    gemini-cli) have gemini || [ -d "$HOME_DIR/.gemini" ] ;;
    aider)      have aider ;;
    opencode)   have opencode ;;
    amp)        have amp ;;
    *) return 1 ;;
  esac
}
# editor id -> npx skills agent id
agent_for() { case "$1" in vscode) echo github-copilot ;; aider) echo aider-desk ;; *) echo "$1" ;; esac; }
EDITORS="cursor vscode windsurf zed continue gemini-cli aider opencode amp"

wants() { # id -> should we act on this surface?
  [ -n "$ONLY" ] && { in_list "$ONLY" "$1" || return 1; }
  [ -n "$SKIP" ] && { in_list "$SKIP" "$1" && return 1; }
  return 0
}

# ---- plan ----
if [ $UNINSTALL -eq 1 ]; then ACT="uninstall"; else ACT="install"; fi
head "Here's what I found (and will ${ACT}):"
PLAN_CLAUDE=0; PLAN_CODEX=0; PLAN_ED=""
if wants claude-code; then
  if [ -d "$CLAUDE_HOME" ] || [ $UNINSTALL -eq 0 ]; then PLAN_CLAUDE=1; ok "Claude Code / Cowork  (~/.claude)"; fi
fi
if wants codex && [ -d "$CODEX_HOME" ]; then PLAN_CODEX=1; ok "Codex  (~/.codex)"; fi
for e in $EDITORS; do
  wants "$e" || continue
  if detect_editor "$e"; then PLAN_ED="$PLAN_ED $e"; ok "$e  (via skills CLI)"; else [ $DETAILS -eq 1 ] && skip "$e (not found)"; fi
done
[ -z "$PLAN_ED$PLAN_CLAUDE$PLAN_CODEX" ] && { skip "no supported surfaces detected"; }

if [ $DRYRUN -eq 1 ]; then head "Dry run — nothing installed."; exit 0; fi
if [ $YES -eq 0 ] && [ -t 0 ]; then
  printf '\n%sProceed? [Y/n] %s' "$B" "$N"; read -r ans || ans=y
  case "$ans" in n*|N*) say "Cancelled."; exit 0 ;; esac
fi

# ---- install: claude-home (Claude Code + Cowork share ~/.claude) ----
register_hooks_node() { # $1 = settings.json, $2 = scripts dir
  NB=$(node_bin) || return 1
  "$NB" - "$1" "$2" <<'NODEEOF'
const fs=require("fs");const p=process.argv[2];const dir=process.argv[3];
let s={}; try{ s=JSON.parse(fs.readFileSync(p,"utf8")); }catch{ s={}; }
const NB=process.execPath;
const H={SessionStart:{m:"*",f:"boot.mjs"},UserPromptSubmit:{m:"*",f:"intake.mjs"},PreToolUse:{m:"Edit|Write|MultiEdit|Bash",f:"risk-guard.mjs"},PostToolUse:{m:"Edit|Write|MultiEdit",f:"guard.mjs"},Stop:{m:"*",f:"ship-gate.mjs"},SessionEnd:{m:"*",f:"memory-capture.mjs"}};
s.hooks=s.hooks||{};
for(const [ev,c] of Object.entries(H)){
  s.hooks[ev]=(s.hooks[ev]||[]).filter(b=>!(b.hooks||[]).some(h=>(h.command||"").includes("refactor-chain/scripts/")));
  s.hooks[ev].push({matcher:c.m,hooks:[{type:"command",command:'"'+NB+'" "'+dir+"/"+c.f+'"',timeout:10}]});
}
fs.writeFileSync(p,JSON.stringify(s,null,2));
NODEEOF
}
install_claude() {
  D="$1" # target ~/.claude
  mkdir -p "$D/skills" "$D/commands"
  # skills
  for sd in "$SRC/skills/"*/; do [ -d "$sd" ] || continue; n=$(basename "$sd"); rm -rf "$D/skills/$n"; cp -R "$sd" "$D/skills/$n"; done
  # scripts — MUST come AFTER the skills loop: that loop rm -rf's skills/refactor-chain
  # (the orchestrator skill) and re-copies it WITHOUT a scripts/ dir, so creating +
  # filling scripts/ earlier would be wiped, leaving every hook pointing at a missing file.
  mkdir -p "$D/skills/refactor-chain/scripts/lib"
  cp "$SRC/scripts/"*.mjs "$D/skills/refactor-chain/scripts/" 2>/dev/null || true
  cp "$SRC/scripts/lib/"*.mjs "$D/skills/refactor-chain/scripts/lib/" 2>/dev/null || true
  # commands
  cp "$SRC/commands/"*.md "$D/commands/" 2>/dev/null || true
  # hooks
  SCRIPTS_DIR="$D/skills/refactor-chain/scripts"
  case "$SCRIPTS_DIR" in *" "*) bad "hook path has a space ($SCRIPTS_DIR) — skipping hook registration (would veto tools)"; return 0 ;; esac
  [ -f "$D/settings.json" ] && cp "$D/settings.json" "$D/settings.json.bak.rcx" 2>/dev/null || true
  [ -f "$D/settings.json" ] || echo '{}' > "$D/settings.json"
  if register_hooks_node "$D/settings.json" "$SCRIPTS_DIR"; then ok "Claude Code / Cowork — skills, commands, 6 hooks registered"; else skip "Claude files installed; hooks need Node (run: install node, then re-run)"; ensure_node && register_hooks_node "$D/settings.json" "$SCRIPTS_DIR" && ok "hooks registered after Node bootstrap" || true; fi
}
uninstall_claude() {
  D="$1"; rm -rf "$D/skills/refactor-"* 2>/dev/null || true
  rm -f "$D/commands/refactor"*.md "$D/commands/fix.md" "$D/commands/check.md" 2>/dev/null || true
  NB=$(node_bin) && "$NB" - "$D/settings.json" <<'NODEEOF' 2>/dev/null || true
const fs=require("fs");const p=process.argv[2];try{const s=JSON.parse(fs.readFileSync(p,"utf8"));for(const ev of Object.keys(s.hooks||{})){s.hooks[ev]=s.hooks[ev].filter(b=>!(b.hooks||[]).some(h=>(h.command||"").includes("refactor-chain/scripts/")));}fs.writeFileSync(p,JSON.stringify(s,null,2));}catch{}
NODEEOF
  ok "Claude Code / Cowork — removed"
}

# ---- install: codex-home ----
install_codex() {
  mkdir -p "$CODEX_HOME/plugins/refactor-chain"
  cp -R "$SRC/." "$CODEX_HOME/plugins/refactor-chain/" 2>/dev/null || true
  SD="$CODEX_HOME/plugins/refactor-chain/scripts"
  case "$SD" in *" "*) bad "codex hook path has a space — skipping hooks"; return 0 ;; esac
  [ -f "$CODEX_HOME/hooks.json" ] && cp "$CODEX_HOME/hooks.json" "$CODEX_HOME/hooks.json.bak.rcx" || true
  [ -f "$CODEX_HOME/hooks.json" ] || echo '{}' > "$CODEX_HOME/hooks.json"
  if register_hooks_node "$CODEX_HOME/hooks.json" "$SD"; then ok "Codex — plugin + hooks"; else skip "Codex plugin copied; hooks need Node"; fi
}
uninstall_codex() { rm -rf "$CODEX_HOME/plugins/refactor-chain" 2>/dev/null || true; ok "Codex — removed"; }

# ---- install: editors via skills CLI ----
install_editor() {
  e="$1"; ag=$(agent_for "$e")
  ensure_node || { skip "$e — needs Node/npx (couldn't bootstrap). Manual: npx -y skills@latest add ${OWNER}/refactor-chain --global --agent $ag --copy --full-depth"; return 0; }
  NB=$(node_bin); NPX=$(dirname "$NB")/npx
  if "$NPX" -y skills@latest add "${OWNER}/refactor-chain" --global --agent "$ag" --skill '*' -y --copy --full-depth >/dev/null 2>&1; then ok "$e — installed (agent: $ag)"; else skip "$e — skills CLI failed; manual: npx -y skills@latest add ${OWNER}/refactor-chain --global --agent $ag --copy --full-depth"; fi
}
uninstall_editor() { e="$1"; ag=$(agent_for "$e"); NB=$(node_bin) && NPX=$(dirname "$NB")/npx && "$NPX" -y skills@latest remove refactor-chain --global --agent "$ag" >/dev/null 2>&1 || true; ok "$e — remove attempted"; }

head "Installing…"
if [ $UNINSTALL -eq 1 ]; then
  [ $PLAN_CLAUDE -eq 1 ] && uninstall_claude "$CLAUDE_HOME"
  [ $PLAN_CODEX -eq 1 ] && uninstall_codex
  for e in $PLAN_ED; do uninstall_editor "$e"; done
  head "Uninstalled. Restart your editor to clear loaded skills."
  exit 0
fi
[ $PLAN_CLAUDE -eq 1 ] && install_claude "$CLAUDE_HOME"
[ $PLAN_CODEX -eq 1 ] && install_codex
for e in $PLAN_ED; do install_editor "$e"; done

# ---- verify + summary ----
head "Done."
[ -f "$CLAUDE_HOME/skills/refactor-chain/SKILL.md" ] && ok "verified: Claude skills present" || true
say ""
say "${B}Next:${N} open Claude Code (or your editor) and type ${B}/refactor${N} — describe what you want fixed or tidied."
say "${D}Tips: /fix (something broke) · /check (review before shipping) · re-run with --uninstall to remove.${N}"
