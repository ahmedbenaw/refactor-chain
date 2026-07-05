#!/bin/sh
# One-shot publisher for refactor-chain. Just run:
#
#   cd ~/.claude/plugins/refactor-chain && sh publish.sh
#
# For the v3 clean-history republish (rebuilds main as a single fresh commit,
# removes the old v2.0.0 tag + release, publishes v3.0.0):
#
#   cd ~/.claude/plugins/refactor-chain && sh publish.sh --rewrite
#
# It will ask you to paste your GitHub token (input hidden). The token is
# held in memory only — never stored in git config, never written to disk,
# never echoed. (Power users: GH_TOKEN=... sh publish.sh skips the prompt.)
set -eu
OWNER="ahmedbenaw"
REPO="refactor-chain"

# Version comes from the plugin manifest — no more hardcoded tags.
VERSION=$(node -e 'console.log(require("./.claude-plugin/plugin.json").version)' 2>/dev/null || \
          sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' .claude-plugin/plugin.json | head -1)
[ -n "$VERSION" ] || { echo "✗ Could not read version from .claude-plugin/plugin.json"; exit 1; }
TAG="v${VERSION}"
NOTES="docs/RELEASE-NOTES-${TAG}.md"
[ -f "$NOTES" ] || { echo "✗ Missing release notes: $NOTES"; exit 1; }

REWRITE=0
OLD_TAG="v3.0.0"
[ "${1:-}" = "--rewrite" ] && REWRITE=1

if [ "$REWRITE" -eq 1 ]; then
  echo "⚠  --rewrite will REPLACE the repository history on GitHub:"
  echo "   • main is rebuilt as ONE fresh commit of the current tree (old history gone)"
  echo "   • the ${OLD_TAG} tag and its GitHub release are DELETED"
  echo "   • ${TAG} is tagged and released"
  echo "   Existing installs keep working; old clones will need a fresh clone."
  printf "Type REWRITE to confirm: "
  read -r confirm
  [ "$confirm" = "REWRITE" ] || { echo "✗ Not confirmed — nothing done."; exit 1; }
fi

if [ -z "${GH_TOKEN:-}" ]; then
  echo "I need a GitHub token to publish (classic token with the 'repo' + 'workflow' scopes)."
  echo "Create one here if you haven't: https://github.com/settings/tokens/new?scopes=repo,workflow&description=refactor-chain-publish"
  printf "Paste your token and press Enter (input is hidden): "
  stty -echo 2>/dev/null || true
  read -r GH_TOKEN
  stty echo 2>/dev/null || true
  echo ""
fi
GH_TOKEN=$(printf '%s' "$GH_TOKEN" | tr -d ' \t\r\n')   # strip stray whitespace from pasting
[ -n "$GH_TOKEN" ] || { echo "✗ No token entered."; exit 1; }
case "$GH_TOKEN" in
  *Your*|*your-token*|*paste*|*TheN*) echo "✗ That looks like placeholder text, not a real token. A real one is ~40 random characters starting with ghp_ or github_pat."; exit 1 ;;
esac
command -v curl >/dev/null || { echo "✗ curl required"; exit 1; }
API="https://api.github.com"
AUTH="Authorization: token ${GH_TOKEN}"

# Pre-flight: verify the token actually has the scopes we need BEFORE touching
# anything. Classic tokens report scopes in the X-OAuth-Scopes header; a push
# containing .github/workflows/ is rejected outright without 'workflow'.
hdrs=$(curl -sSI -H "$AUTH" "$API/user" 2>/dev/null | tr -d '\r')
status=$(printf '%s' "$hdrs" | sed -n '1s/.* \([0-9][0-9][0-9]\).*/\1/p')
if [ "$status" = "401" ]; then
  echo "✗ GitHub says this token is INVALID or REVOKED (HTTP 401) — not a scope problem."
  echo "  Common causes: you clicked 'Regenerate token' (the old string stops working — copy the NEW one"
  echo "  shown at the top of the page), the token expired, or the paste was incomplete."
  echo "  Simplest fix: mint a fresh one → https://github.com/settings/tokens/new?scopes=repo,workflow&description=refactor-chain-publish"
  exit 1
fi
scopes=$(printf '%s' "$hdrs" | sed -n 's/^[Xx]-[Oo][Aa]uth-[Ss]copes: *//p')
case "$GH_TOKEN" in
  ghp_*)
    case ",$(printf '%s' "$scopes" | tr -d ' ')," in
      *,repo,*) : ;;
      *) echo "✗ Token is missing the 'repo' scope (has: ${scopes:-none})."; echo "  Create one with BOTH boxes ticked: https://github.com/settings/tokens/new?scopes=repo,workflow&description=refactor-chain-publish"; exit 1 ;;
    esac
    case ",$(printf '%s' "$scopes" | tr -d ' ')," in
      *,workflow,*) : ;;
      *) echo "✗ Token is missing the 'workflow' scope (has: ${scopes:-none}) — GitHub rejects pushes that touch .github/workflows/ without it."; echo "  Create one with BOTH boxes ticked: https://github.com/settings/tokens/new?scopes=repo,workflow&description=refactor-chain-publish"; exit 1 ;;
    esac
    echo "  ✓ token scopes OK (repo + workflow)" ;;
  github_pat_*)
    echo "  ⚠ fine-grained token — cannot pre-check scopes; it needs Contents:write + Workflows:write on this repo or the push will be rejected." ;;
esac
PUSH_URL="https://x-access-token:${GH_TOKEN}@github.com/${OWNER}/${REPO}.git"

if [ "$REWRITE" -eq 1 ]; then
  echo "→ 0/5 Rebuilding main as a single fresh commit…"
  git branch -D v3-clean 2>/dev/null || true   # stale branch from an aborted earlier run
  git checkout --orphan v3-clean
  git add -A
  git commit -m "refactor-chain ${TAG}" >/dev/null
  git branch -M v3-clean main
  echo "  ✓ new root commit: $(git rev-parse --short HEAD)"
fi

echo "→ 1/5 Creating public repo ${OWNER}/${REPO} (ok if it already exists)…"
code=$(curl -s -o /tmp/rcx-pub.json -w '%{http_code}' -X POST "$API/user/repos" \
  -H "$AUTH" -H "Accept: application/vnd.github+json" \
  -d "{\"name\":\"${REPO}\",\"description\":\"Self-diagnosing, self-healing refactor/modernize/fix pipeline for Claude Code, Cowork, Codex, and your editors. Plain-language, behavior-preserving, 56 skills, 40+ languages.\",\"private\":false}")
case "$code" in
  201) echo "  ✓ created" ;;
  422) echo "  ✓ already exists — continuing" ;;
  401|403) echo "  ✗ token rejected (needs 'repo' + 'workflow' scopes)"; exit 1 ;;
  *) echo "  ✗ unexpected HTTP $code"; sed -n '1,3p' /tmp/rcx-pub.json; exit 1 ;;
esac
rm -f /tmp/rcx-pub.json

echo "→ 2/5 Pushing main (token used inline, not saved)…"
if [ "$REWRITE" -eq 1 ]; then
  git push --force "$PUSH_URL" main:main
else
  git push "$PUSH_URL" main:main
fi
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/${OWNER}/${REPO}.git"
echo "  ✓ pushed; clean token-less remote set"

if [ "$REWRITE" -eq 1 ]; then
  echo "→ 2b Removing old ${OLD_TAG} tag + release…"
  rel=$(curl -s -H "$AUTH" "$API/repos/${OWNER}/${REPO}/releases/tags/${OLD_TAG}" | \
        sed -n 's/^[[:space:]]*"id":[[:space:]]*\([0-9]*\),.*/\1/p' | head -1)
  if [ -n "$rel" ]; then
    curl -s -X DELETE -H "$AUTH" "$API/repos/${OWNER}/${REPO}/releases/${rel}" >/dev/null && echo "  ✓ ${OLD_TAG} release deleted"
  else
    echo "  ✓ no ${OLD_TAG} release found (already gone)"
  fi
  git push "$PUSH_URL" ":refs/tags/${OLD_TAG}" 2>/dev/null && echo "  ✓ ${OLD_TAG} tag deleted" || echo "  ✓ ${OLD_TAG} tag already gone"
  git tag -d "$OLD_TAG" 2>/dev/null || true
fi

echo "→ 3/5 Tagging ${TAG}…"
git tag -f "$TAG"
git push "$PUSH_URL" "refs/tags/${TAG}" -f
echo "  ✓ tag pushed (release CI will build the Go binaries)"

echo "→ 4/5 Creating the GitHub release with the notes…"
body=$(node -e 'console.log(JSON.stringify(require("fs").readFileSync(process.argv[1],"utf8")))' "$NOTES" 2>/dev/null || \
       python3 -c 'import json,sys;print(json.dumps(open(sys.argv[1]).read()))' "$NOTES")
code=$(curl -s -o /tmp/rcx-rel.json -w '%{http_code}' -X POST "$API/repos/${OWNER}/${REPO}/releases" \
  -H "$AUTH" -H "Accept: application/vnd.github+json" \
  -d "{\"tag_name\":\"${TAG}\",\"name\":\"refactor-chain ${TAG}\",\"body\":${body}}")
case "$code" in
  201) echo "  ✓ release created" ;;
  422) echo "  ✓ release already exists" ;;
  *) echo "  ⚠ release HTTP $code (repo is still published fine)"; sed -n '1,3p' /tmp/rcx-rel.json ;;
esac
rm -f /tmp/rcx-rel.json

echo "→ 5/5 Verifying the public installer…"
sleep 2
curl -fsSL "https://raw.githubusercontent.com/${OWNER}/${REPO}/main/install.sh" | sh -s -- --dry-run || \
  echo "  ⚠ raw file may take ~a minute to propagate — retry the verify command shortly"

echo ""
echo "✅ Published: https://github.com/${OWNER}/${REPO} (${TAG})"
echo "   Install anywhere:  curl -fsSL https://raw.githubusercontent.com/${OWNER}/${REPO}/main/install.sh | sh"
echo "   ⚠ Now ROTATE the token you used: https://github.com/settings/tokens"
