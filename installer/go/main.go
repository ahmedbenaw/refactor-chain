// Command rcx is the no-runtime fallback installer for refactor-chain.
//
// It mirrors install.sh exactly, using only the Go standard library, for
// machines that have neither Node nor a package manager. It auto-detects
// Claude Code, Claude Cowork, Codex, and common editors, installs to each,
// verifies, self-troubleshoots, and prints a plain-language summary.
//
//	rcx [--yes] [--dry-run] [--only ids] [--skip ids] [--owner name] [--details] [--uninstall]
package main

import (
	"archive/tar"
	"bufio"
	"compress/gzip"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

const defaultOwner = "ahmedbenaw"

// ---- pretty output (color only on a TTY) ----

var (
	cB, cD, cG, cY, cR, cN string
)

func initColors() {
	if fi, err := os.Stdout.Stat(); err == nil && (fi.Mode()&os.ModeCharDevice) != 0 {
		cB, cD, cG, cY, cR, cN = "\033[1m", "\033[2m", "\033[32m", "\033[33m", "\033[31m", "\033[0m"
	}
}

func say(s string)     { fmt.Println(s) }
func ok(s string)      { fmt.Printf("  %s✓%s %s\n", cG, cN, s) }
func skipMsg(s string) { fmt.Printf("  %s–%s %s\n", cY, cN, s) }
func bad(s string)     { fmt.Printf("  %s✗%s %s\n", cR, cN, s) }
func head(s string)    { fmt.Printf("\n%s%s%s\n", cB, s, cN) }

// inList reports whether item appears in a comma-separated list.
func inList(list, item string) bool {
	for _, p := range strings.Split(list, ",") {
		if strings.TrimSpace(p) == item {
			return true
		}
	}
	return false
}

// have reports whether cmd is on PATH.
func have(cmd string) bool {
	_, err := exec.LookPath(cmd)
	return err == nil
}

// ---- global config, resolved from flags ----

type config struct {
	owner    string
	yes      bool
	dryRun   bool
	details  bool
	uninst   bool
	only     string
	skip     string
	homeDir  string
	claude   string // ~/.claude
	codex    string // ~/.codex
	src      string // resolved plugin source dir
	tmp      string // temp dir to clean up (if any)
	pm       string // detected package manager
	osName   string // macOS / Linux / Windows
}

func main() {
	initColors()

	var cfg config
	flag.BoolVar(&cfg.yes, "yes", false, "non-interactive; assume yes")
	flag.BoolVar(&cfg.yes, "y", false, "non-interactive; assume yes (shorthand)")
	flag.BoolVar(&cfg.dryRun, "dry-run", false, "detect + plan, install nothing")
	flag.BoolVar(&cfg.details, "details", false, "verbose / technical output")
	flag.BoolVar(&cfg.details, "v", false, "verbose (shorthand)")
	flag.BoolVar(&cfg.uninst, "uninstall", false, "remove refactor-chain from each surface")
	flag.StringVar(&cfg.only, "only", "", "comma-separated surface ids to act on")
	flag.StringVar(&cfg.skip, "skip", "", "comma-separated surface ids to skip")
	flag.StringVar(&cfg.owner, "owner", defaultOwner, "GitHub owner to install from")
	flag.Parse()

	if err := run(&cfg); err != nil {
		bad(err.Error())
		os.Exit(1)
	}
}

func run(cfg *config) error {
	cfg.homeDir = homeDir()
	cfg.claude = filepath.Join(cfg.homeDir, ".claude")
	cfg.codex = filepath.Join(cfg.homeDir, ".codex")
	defer cfg.cleanup()

	// ---- 1. locate plugin source ----
	if err := cfg.locateSource(); err != nil {
		return err
	}
	if cfg.details {
		say(cfg.dim("source: " + cfg.src))
	}

	// ---- 2. detect platform ----
	cfg.detectPlatform()
	head(fmt.Sprintf("refactor-chain installer  ·  %s  ·  package manager: %s", cfg.osName, orNone(cfg.pm)))

	// ---- 3. detect surfaces + 4. show plan ----
	plan := cfg.buildPlan()

	if cfg.dryRun {
		head("Dry run — nothing installed.")
		return nil
	}
	if !cfg.yes && stdinIsTTY() {
		fmt.Printf("\n%sProceed? [Y/n] %s", cB, cN)
		ans := readLine()
		if strings.HasPrefix(strings.ToLower(ans), "n") {
			say("Cancelled.")
			return nil
		}
	}

	// ---- 5-8. install / uninstall, verify, summary ----
	head("Installing…")
	if cfg.uninst {
		if plan.claude {
			cfg.uninstallClaude()
		}
		if plan.codex {
			cfg.uninstallCodex()
		}
		for _, e := range plan.editors {
			cfg.uninstallEditor(e)
		}
		head("Uninstalled. Restart your editor to clear loaded skills.")
		return nil
	}

	if plan.claude {
		cfg.installClaude()
	}
	if plan.codex {
		cfg.installCodex()
	}
	for _, e := range plan.editors {
		cfg.installEditor(e)
	}

	// ---- verify + summary ----
	head("Done.")
	if fileExists(filepath.Join(cfg.claude, "skills", "refactor-chain", "SKILL.md")) {
		ok("verified: Claude skills present")
	}
	say("")
	say(fmt.Sprintf("%sNext:%s open Claude Code (or your editor) and type %s/refactor%s — describe what you want fixed or tidied.", cB, cN, cB, cN))
	say(cfg.dim("Tips: /fix (something broke) · /check (review before shipping) · re-run with --uninstall to remove."))
	return nil
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

func (cfg *config) dim(s string) string { return cD + s + cN }

func homeDir() string {
	if h, err := os.UserHomeDir(); err == nil && h != "" {
		return h
	}
	if h := os.Getenv("HOME"); h != "" {
		return h
	}
	return "."
}

func orNone(s string) string {
	if s == "" {
		return "none"
	}
	return s
}

func fileExists(p string) bool {
	fi, err := os.Stat(p)
	return err == nil && !fi.IsDir()
}

func dirExists(p string) bool {
	fi, err := os.Stat(p)
	return err == nil && fi.IsDir()
}

func stdinIsTTY() bool {
	fi, err := os.Stdin.Stat()
	return err == nil && (fi.Mode()&os.ModeCharDevice) != 0
}

func readLine() string {
	r := bufio.NewReader(os.Stdin)
	line, err := r.ReadString('\n')
	if err != nil && line == "" {
		return "y"
	}
	return strings.TrimSpace(line)
}

func (cfg *config) cleanup() {
	if cfg.tmp != "" {
		_ = os.RemoveAll(cfg.tmp)
	}
}

// ---- 1. locate plugin source ----

func (cfg *config) locateSource() error {
	// Run from inside a clone? (installer/go/main.go -> plugin root is ../..)
	if exe, err := os.Executable(); err == nil {
		if root := pluginRootFrom(filepath.Dir(exe)); root != "" {
			cfg.src = root
		}
	}
	if cfg.src == "" {
		if wd, err := os.Getwd(); err == nil {
			if root := pluginRootFrom(wd); root != "" {
				cfg.src = root
			}
		}
	}
	if cfg.src != "" {
		return nil
	}

	// Otherwise download + extract the tarball.
	head("Downloading refactor-chain…")
	tmp, err := os.MkdirTemp("", "rcx")
	if err != nil {
		return fmt.Errorf("could not create temp dir: %v", err)
	}
	cfg.tmp = tmp
	url := fmt.Sprintf("https://github.com/%s/refactor-chain/archive/refs/heads/main.tar.gz", cfg.owner)
	src, err := downloadAndExtract(url, tmp)
	if err != nil {
		return fmt.Errorf("download failed (%s): %v", url, err)
	}
	cfg.src = src
	ok("downloaded")
	return nil
}

// pluginRootFrom walks up from dir looking for .claude-plugin/plugin.json.
func pluginRootFrom(dir string) string {
	for i := 0; i < 6 && dir != "" && dir != string(filepath.Separator); i++ {
		if fileExists(filepath.Join(dir, ".claude-plugin", "plugin.json")) {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return ""
}

// downloadAndExtract fetches a .tar.gz and unpacks it under dest, returning the
// plugin root (the dir containing .claude-plugin/plugin.json).
func downloadAndExtract(url, dest string) (string, error) {
	resp, err := http.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	gz, err := gzip.NewReader(resp.Body)
	if err != nil {
		return "", err
	}
	defer gz.Close()

	tr := tar.NewReader(gz)
	destAbs, err := filepath.Abs(dest)
	if err != nil {
		return "", err
	}
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", err
		}
		// Guard against path traversal.
		target := filepath.Join(destAbs, hdr.Name)
		if !strings.HasPrefix(target, destAbs+string(os.PathSeparator)) {
			continue
		}
		switch hdr.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, 0o755); err != nil {
				return "", err
			}
		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
				return "", err
			}
			f, err := os.OpenFile(target, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, os.FileMode(hdr.Mode)&0o777)
			if err != nil {
				return "", err
			}
			if _, err := io.Copy(f, tr); err != nil {
				f.Close()
				return "", err
			}
			f.Close()
		}
	}

	// Find the plugin root inside the extracted tree.
	var found string
	_ = filepath.Walk(destAbs, func(path string, info os.FileInfo, err error) error {
		if err != nil || found != "" {
			return nil
		}
		if info.Name() == "plugin.json" && filepath.Base(filepath.Dir(path)) == ".claude-plugin" {
			found = filepath.Dir(filepath.Dir(path))
		}
		return nil
	})
	if found == "" {
		return "", fmt.Errorf("could not find plugin in tarball")
	}
	return found, nil
}

// ---- 2. detect platform ----

func (cfg *config) detectPlatform() {
	switch runtime.GOOS {
	case "darwin":
		cfg.osName = "macOS"
	case "linux":
		cfg.osName = "Linux"
	case "windows":
		cfg.osName = "Windows"
	default:
		cfg.osName = runtime.GOOS
	}
	var candidates []string
	switch runtime.GOOS {
	case "darwin":
		candidates = []string{"brew"}
	case "windows":
		candidates = []string{"winget", "choco", "scoop"}
	default:
		candidates = []string{"apt-get", "dnf", "pacman", "zypper", "apk", "brew"}
	}
	for _, c := range candidates {
		if have(c) {
			cfg.pm = c
			break
		}
	}
}

// ---- 3. detect surfaces / editors ----

// editorIDs is the ordered list of editor surfaces (matches install.sh).
var editorIDs = []string{"cursor", "vscode", "windsurf", "zed", "continue", "gemini-cli", "aider", "opencode", "amp"}

// hasApp reports whether a macOS .app bundle is installed.
func (cfg *config) hasApp(name string) bool {
	if runtime.GOOS != "darwin" {
		return false
	}
	return dirExists(filepath.Join("/Applications", name+".app")) ||
		dirExists(filepath.Join(cfg.homeDir, "Applications", name+".app"))
}

// detectEditor reports whether an editor surface is present.
func (cfg *config) detectEditor(id string) bool {
	switch id {
	case "cursor":
		return cfg.hasApp("Cursor") || have("cursor")
	case "vscode":
		return cfg.hasApp("Visual Studio Code") || cfg.hasApp("VSCodium") || have("code") || have("codium")
	case "windsurf":
		return cfg.hasApp("Windsurf") || have("windsurf")
	case "zed":
		return cfg.hasApp("Zed") || have("zed")
	case "continue":
		return dirExists(filepath.Join(cfg.homeDir, ".continue"))
	case "gemini-cli":
		return have("gemini") || dirExists(filepath.Join(cfg.homeDir, ".gemini"))
	case "aider":
		return have("aider")
	case "opencode":
		return have("opencode")
	case "amp":
		return have("amp")
	}
	return false
}

// agentFor maps an editor id to its npx skills agent id.
func agentFor(id string) string {
	switch id {
	case "vscode":
		return "github-copilot"
	case "aider":
		return "aider-desk"
	}
	return id
}

// wants reports whether we should act on a surface given --only / --skip.
func (cfg *config) wants(id string) bool {
	if cfg.only != "" && !inList(cfg.only, id) {
		return false
	}
	if cfg.skip != "" && inList(cfg.skip, id) {
		return false
	}
	return true
}

type plan struct {
	claude  bool
	codex   bool
	editors []string
}

// buildPlan detects surfaces and prints the "here's what I found" checklist.
func (cfg *config) buildPlan() plan {
	act := "install"
	if cfg.uninst {
		act = "uninstall"
	}
	head("Here's what I found (and will " + act + "):")

	var p plan
	if cfg.wants("claude-code") {
		if dirExists(cfg.claude) || !cfg.uninst {
			p.claude = true
			ok("Claude Code / Cowork  (~/.claude)")
		}
	}
	if cfg.wants("codex") && dirExists(cfg.codex) {
		p.codex = true
		ok("Codex  (~/.codex)")
	}
	for _, e := range editorIDs {
		if !cfg.wants(e) {
			continue
		}
		if cfg.detectEditor(e) {
			p.editors = append(p.editors, e)
			ok(e + "  (via skills CLI)")
		} else if cfg.details {
			skipMsg(e + " (not found)")
		}
	}
	if !p.claude && !p.codex && len(p.editors) == 0 {
		skipMsg("no supported surfaces detected")
	}
	return p
}

// ---------------------------------------------------------------------------
// Node discovery + bootstrap
// ---------------------------------------------------------------------------

// nodeBin returns a usable node executable path, or "" if none is found.
func (cfg *config) nodeBin() string {
	if p, err := exec.LookPath("node"); err == nil {
		return p
	}
	fallback := filepath.Join(cfg.homeDir, ".local", "node-current", "bin", "node")
	if isExecutable(fallback) {
		return fallback
	}
	return ""
}

func isExecutable(p string) bool {
	fi, err := os.Stat(p)
	if err != nil || fi.IsDir() {
		return false
	}
	return fi.Mode()&0o111 != 0
}

// ensureNode returns true if node is available, bootstrapping via the package
// manager when possible.
func (cfg *config) ensureNode() bool {
	if cfg.nodeBin() != "" {
		return true
	}
	if cfg.pm == "" {
		return false
	}
	say(cfg.dim("  Node not found — bootstrapping via " + cfg.pm + "…"))
	var cmds [][]string
	switch cfg.pm {
	case "brew":
		cmds = [][]string{{"brew", "install", "node"}}
	case "apt-get":
		cmds = [][]string{{"sudo", "apt-get", "update"}, {"sudo", "apt-get", "install", "-y", "nodejs", "npm"}}
	case "dnf":
		cmds = [][]string{{"sudo", "dnf", "install", "-y", "nodejs"}}
	case "pacman":
		cmds = [][]string{{"sudo", "pacman", "-Sy", "--noconfirm", "nodejs", "npm"}}
	case "zypper":
		cmds = [][]string{{"sudo", "zypper", "install", "-y", "nodejs"}}
	case "apk":
		cmds = [][]string{{"sudo", "apk", "add", "nodejs", "npm"}}
	case "winget":
		cmds = [][]string{{"winget", "install", "-e", "--id", "OpenJS.NodeJS"}}
	case "choco":
		cmds = [][]string{{"choco", "install", "-y", "nodejs"}}
	case "scoop":
		cmds = [][]string{{"scoop", "install", "nodejs"}}
	default:
		return false
	}
	for _, c := range cmds {
		cmd := exec.Command(c[0], c[1:]...)
		if err := cmd.Run(); err != nil {
			return false
		}
	}
	return cfg.nodeBin() != ""
}

// ---------------------------------------------------------------------------
// settings.json / hooks.json editing (encoding/json, idempotent, space-free)
// ---------------------------------------------------------------------------

// hookSpec is one entry from manifest.hooks.
type hookSpec struct {
	event   string
	matcher string
	script  string // filename, e.g. "boot.mjs"
}

// manifestHooks mirrors manifest.json "hooks" (baked to avoid a runtime read).
var manifestHooks = []hookSpec{
	{"SessionStart", "*", "boot.mjs"},
	{"UserPromptSubmit", "*", "intake.mjs"},
	{"PreToolUse", "Edit|Write|MultiEdit|Bash", "risk-guard.mjs"},
	{"PostToolUse", "Edit|Write|MultiEdit", "guard.mjs"},
	{"Stop", "*", "ship-gate.mjs"},
	{"SessionEnd", "*", "memory-capture.mjs"},
}

// hookContainsRefactorChain reports whether a hook block's command references
// the refactor-chain scripts dir (used for idempotent removal).
func hookCommandIsRefactorChain(cmd string) bool {
	return strings.Contains(cmd, "refactor-chain/scripts/")
}

// loadJSONObject reads a JSON object from path, returning an empty map on any
// error (missing/malformed) so we start clean rather than fail.
func loadJSONObject(path string) map[string]interface{} {
	data, err := os.ReadFile(path)
	if err != nil {
		return map[string]interface{}{}
	}
	var m map[string]interface{}
	if err := json.Unmarshal(data, &m); err != nil || m == nil {
		return map[string]interface{}{}
	}
	return m
}

// writeJSONObject writes m as pretty JSON (2-space indent) to path.
func writeJSONObject(path string, m map[string]interface{}) error {
	out, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, out, 0o644)
}

// registerHooks edits a settings/hooks JSON file: for each manifest hook it
// removes any prior refactor-chain entry for that event and appends a fresh
// space-free `node <scriptsDir>/<file>` command. nodePath is embedded as the
// command's interpreter (matches install.sh, which uses process.execPath).
func (cfg *config) registerHooks(path, scriptsDir, nodePath string) error {
	m := loadJSONObject(path)

	hooksAny, _ := m["hooks"].(map[string]interface{})
	if hooksAny == nil {
		hooksAny = map[string]interface{}{}
	}

	for _, h := range manifestHooks {
		// Existing blocks for this event, minus any prior refactor-chain ones.
		var kept []interface{}
		if existing, ok := hooksAny[h.event].([]interface{}); ok {
			for _, blk := range existing {
				if !blockIsRefactorChain(blk) {
					kept = append(kept, blk)
				}
			}
		}
		command := nodePath + " " + scriptsDir + "/" + h.script
		block := map[string]interface{}{
			"matcher": h.matcher,
			"hooks": []interface{}{
				map[string]interface{}{
					"type":    "command",
					"command": command,
					"timeout": 10,
				},
			},
		}
		kept = append(kept, block)
		hooksAny[h.event] = kept
	}

	m["hooks"] = hooksAny
	return writeJSONObject(path, m)
}

// removeHooks strips every refactor-chain hook entry from a settings/hooks file.
func removeHooks(path string) {
	m := loadJSONObject(path)
	hooksAny, ok := m["hooks"].(map[string]interface{})
	if !ok {
		return
	}
	for event, v := range hooksAny {
		existing, ok := v.([]interface{})
		if !ok {
			continue
		}
		var kept []interface{}
		for _, blk := range existing {
			if !blockIsRefactorChain(blk) {
				kept = append(kept, blk)
			}
		}
		hooksAny[event] = kept
	}
	m["hooks"] = hooksAny
	_ = writeJSONObject(path, m)
}

// blockIsRefactorChain reports whether a hook block contains any command
// referencing refactor-chain/scripts/.
func blockIsRefactorChain(blk interface{}) bool {
	bm, ok := blk.(map[string]interface{})
	if !ok {
		return false
	}
	hooks, ok := bm["hooks"].([]interface{})
	if !ok {
		return false
	}
	for _, h := range hooks {
		hm, ok := h.(map[string]interface{})
		if !ok {
			continue
		}
		if cmd, ok := hm["command"].(string); ok && hookCommandIsRefactorChain(cmd) {
			return true
		}
	}
	return false
}

// ---------------------------------------------------------------------------
// file copy helpers
// ---------------------------------------------------------------------------

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	fi, err := in.Stat()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, fi.Mode()&0o777)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}

// copyDir recursively copies src into dst.
func copyDir(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if info.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		return copyFile(path, target)
	})
}

// copyGlob copies files matching pattern (a shell-style glob) into dstDir.
func copyGlob(pattern, dstDir string) {
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return
	}
	for _, m := range matches {
		if fi, err := os.Stat(m); err == nil && !fi.IsDir() {
			_ = copyFile(m, filepath.Join(dstDir, filepath.Base(m)))
		}
	}
}

// ---------------------------------------------------------------------------
// install: claude-home (Claude Code + Cowork share ~/.claude)
// ---------------------------------------------------------------------------

func (cfg *config) installClaude() {
	d := cfg.claude
	_ = os.MkdirAll(filepath.Join(d, "skills"), 0o755)
	_ = os.MkdirAll(filepath.Join(d, "commands"), 0o755)
	_ = os.MkdirAll(filepath.Join(d, "skills", "refactor-chain", "scripts", "lib"), 0o755)

	// skills: copy each skills/* dir, replacing any existing copy.
	skillDirs, _ := filepath.Glob(filepath.Join(cfg.src, "skills", "*"))
	for _, sd := range skillDirs {
		if fi, err := os.Stat(sd); err != nil || !fi.IsDir() {
			continue
		}
		name := filepath.Base(sd)
		dstSkill := filepath.Join(d, "skills", name)
		_ = os.RemoveAll(dstSkill)
		if err := copyDir(sd, dstSkill); err != nil {
			bad("failed copying skill " + name + ": " + err.Error())
		}
	}

	// scripts into the orchestrator skill dir (space-free path).
	scriptsDir := filepath.Join(d, "skills", "refactor-chain", "scripts")
	copyGlob(filepath.Join(cfg.src, "scripts", "*.mjs"), scriptsDir)
	copyGlob(filepath.Join(cfg.src, "scripts", "lib", "*.mjs"), filepath.Join(scriptsDir, "lib"))

	// commands
	copyGlob(filepath.Join(cfg.src, "commands", "*.md"), filepath.Join(d, "commands"))

	// hooks — refuse to register if the path contains a space (veto bug).
	if strings.Contains(scriptsDir, " ") {
		bad("hook path has a space (" + scriptsDir + ") — skipping hook registration (would veto tools)")
		return
	}

	settings := filepath.Join(d, "settings.json")
	if fileExists(settings) {
		_ = copyFile(settings, settings+".bak.rcx")
	} else {
		_ = os.WriteFile(settings, []byte("{}\n"), 0o644)
	}

	nb := cfg.nodeBin()
	if nb == "" {
		skipMsg("Claude files installed; hooks need Node (run: install node, then re-run)")
		if cfg.ensureNode() {
			nb = cfg.nodeBin()
		}
	}
	if nb == "" {
		return
	}
	if err := cfg.registerHooks(settings, scriptsDir, nb); err != nil {
		// Malformed write / restore backup path.
		if fileExists(settings + ".bak.rcx") {
			_ = copyFile(settings+".bak.rcx", settings)
		}
		bad("Claude hook registration failed: " + err.Error())
		return
	}
	ok("Claude Code / Cowork — skills, commands, 6 hooks registered")
}

func (cfg *config) uninstallClaude() {
	d := cfg.claude
	// remove skills/refactor-*
	if matches, _ := filepath.Glob(filepath.Join(d, "skills", "refactor-*")); matches != nil {
		for _, m := range matches {
			_ = os.RemoveAll(m)
		}
	}
	// remove commands
	patterns := []string{
		filepath.Join(d, "commands", "refactor*.md"),
		filepath.Join(d, "commands", "fix.md"),
		filepath.Join(d, "commands", "check.md"),
	}
	for _, pat := range patterns {
		if matches, _ := filepath.Glob(pat); matches != nil {
			for _, m := range matches {
				_ = os.Remove(m)
			}
		}
	}
	// strip hook entries
	settings := filepath.Join(d, "settings.json")
	if fileExists(settings) {
		removeHooks(settings)
	}
	ok("Claude Code / Cowork — removed")
}

// ---------------------------------------------------------------------------
// install: codex-home
// ---------------------------------------------------------------------------

func (cfg *config) installCodex() {
	pluginDir := filepath.Join(cfg.codex, "plugins", "refactor-chain")
	_ = os.MkdirAll(pluginDir, 0o755)
	if err := copyDir(cfg.src, pluginDir); err != nil {
		bad("Codex copy failed: " + err.Error())
		return
	}
	scriptsDir := filepath.Join(pluginDir, "scripts")
	if strings.Contains(scriptsDir, " ") {
		bad("codex hook path has a space — skipping hooks")
		return
	}
	hooksFile := filepath.Join(cfg.codex, "hooks.json")
	if fileExists(hooksFile) {
		_ = copyFile(hooksFile, hooksFile+".bak.rcx")
	} else {
		_ = os.WriteFile(hooksFile, []byte("{}\n"), 0o644)
	}
	nb := cfg.nodeBin()
	if nb == "" {
		if cfg.ensureNode() {
			nb = cfg.nodeBin()
		}
	}
	if nb == "" {
		skipMsg("Codex plugin copied; hooks need Node")
		return
	}
	if err := cfg.registerHooks(hooksFile, scriptsDir, nb); err != nil {
		if fileExists(hooksFile + ".bak.rcx") {
			_ = copyFile(hooksFile+".bak.rcx", hooksFile)
		}
		skipMsg("Codex plugin copied; hooks need Node")
		return
	}
	ok("Codex — plugin + hooks")
}

func (cfg *config) uninstallCodex() {
	_ = os.RemoveAll(filepath.Join(cfg.codex, "plugins", "refactor-chain"))
	ok("Codex — removed")
}

// ---------------------------------------------------------------------------
// install: editors via skills CLI (npx)
// ---------------------------------------------------------------------------

func (cfg *config) manualLine(agent string) string {
	return "npx -y skills@latest add " + cfg.owner + "/refactor-chain --global --agent " + agent + " --copy --full-depth"
}

func (cfg *config) installEditor(e string) {
	ag := agentFor(e)
	if !cfg.ensureNode() {
		skipMsg(e + " — needs Node/npx (couldn't bootstrap). Manual: " + cfg.manualLine(ag))
		return
	}
	nb := cfg.nodeBin()
	npx := filepath.Join(filepath.Dir(nb), "npx")
	cmd := exec.Command(npx, "-y", "skills@latest", "add", cfg.owner+"/refactor-chain",
		"--global", "--agent", ag, "--skill", "*", "-y", "--copy", "--full-depth")
	if err := cmd.Run(); err != nil {
		skipMsg(e + " — skills CLI failed; manual: " + cfg.manualLine(ag))
		return
	}
	ok(e + " — installed (agent: " + ag + ")")
}

func (cfg *config) uninstallEditor(e string) {
	ag := agentFor(e)
	if nb := cfg.nodeBin(); nb != "" {
		npx := filepath.Join(filepath.Dir(nb), "npx")
		cmd := exec.Command(npx, "-y", "skills@latest", "remove", "refactor-chain", "--global", "--agent", ag)
		_ = cmd.Run()
	}
	ok(e + " — remove attempted")
}
