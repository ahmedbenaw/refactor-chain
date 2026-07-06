<#
.SYNOPSIS
  refactor-chain universal installer (PowerShell core) — Windows.

.DESCRIPTION
  Zero prerequisites: needs only Windows PowerShell 5.1+ (or PowerShell 7+) and
  Invoke-WebRequest, both OS defaults. Auto-detects Claude Code, Claude Cowork,
  Codex, and your editors, installs to each, verifies, and self-troubleshoots.
  Reads installer/manifest.json when run from a clone; otherwise downloads the
  plugin tarball and extracts it with tar (ships on Windows 10 1803+).

  Run directly:
    irm https://raw.githubusercontent.com/ahmedbenaw/refactor-chain/main/install.ps1 | iex

  Or from a clone:
    powershell -ExecutionPolicy Bypass -File .\install.ps1

.PARAMETER Yes
  Non-interactive; assume "yes" to the proceed prompt.
.PARAMETER DryRun
  Detect + plan only; install nothing.
.PARAMETER Only
  Comma-separated surface ids to act on exclusively (e.g. "claude-code,codex").
.PARAMETER Skip
  Comma-separated surface ids to skip.
.PARAMETER Owner
  GitHub owner to install from (default: ahmedbenaw).
.PARAMETER Details
  Verbose / technical output.
.PARAMETER Uninstall
  Remove refactor-chain from each detected surface.
#>
[CmdletBinding()]
param(
  [Alias('y')][switch]$Yes,
  [switch]$DryRun,
  [string]$Only = '',
  [string]$Skip = '',
  [string]$Owner = 'ahmedbenaw',
  [Alias('v')][switch]$Details,
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'
# StrictMode 1.0: catches uninitialized-variable typos without the aggressive
# property/dynamic-access checks of 2.0 that would make JSON traversal brittle.
Set-StrictMode -Version 1.0

# ---- pretty output (color only on a real console) ----
$script:UseColor = $false
try { if ($Host.UI.RawUI -and -not [Console]::IsOutputRedirected) { $script:UseColor = $true } } catch { $script:UseColor = $false }
function Write-C([string]$Text, [string]$Color) {
  if ($script:UseColor -and $Color) { Write-Host $Text -ForegroundColor $Color } else { Write-Host $Text }
}
function Say  ([string]$m) { Write-Host $m }
function Ok   ([string]$m) { Write-C ("  " + [char]0x2713 + " $m") 'Green' }   # check mark
function Skip ([string]$m) { Write-C ("  " + [char]0x2013 + " $m") 'Yellow' }  # en dash
function Bad  ([string]$m) { Write-C ("  " + [char]0x2717 + " $m") 'Red' }     # ballot X
function Head ([string]$m) { Write-Host ""; Write-C $m 'Cyan' }
function Detail([string]$m) { if ($Details) { Write-C ("  $m") 'DarkGray' } }

function Test-InList([string]$csv, [string]$id) {
  if ([string]::IsNullOrEmpty($csv)) { return $false }
  foreach ($p in ($csv -split ',')) { if ($p.Trim() -eq $id) { return $true } }
  return $false
}
function Have([string]$cmd) {
  try { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) } catch { return $false }
}

# ---- home + surface roots (Windows-appropriate) ----
$HomeDir     = if ($env:USERPROFILE) { $env:USERPROFILE } else { [Environment]::GetFolderPath('UserProfile') }
$ClaudeHome  = Join-Path $HomeDir '.claude'
$CodexHome   = Join-Path $HomeDir '.codex'
$OwnerTarball = "https://github.com/$Owner/refactor-chain/archive/refs/heads/main.tar.gz"

# ===================================================================
# 1. locate plugin source (local clone vs download tarball)
# ===================================================================
$SelfDir = ''
try { if ($PSScriptRoot) { $SelfDir = $PSScriptRoot } } catch { }
if (-not $SelfDir -and $PSCommandPath) { $SelfDir = Split-Path -Parent $PSCommandPath }

$Src = ''
if ($SelfDir -and (Test-Path (Join-Path $SelfDir '.claude-plugin\plugin.json'))) {
  $Src = $SelfDir
} elseif (Test-Path '.\.claude-plugin\plugin.json') {
  $Src = (Get-Location).Path
}

$Tmp = ''
function Invoke-Cleanup {
  if ($Tmp -and (Test-Path $Tmp)) { try { Remove-Item -Recurse -Force $Tmp -ErrorAction SilentlyContinue } catch { } }
}

if (-not $Src) {
  Head "Downloading refactor-chain..."
  $Tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("rcx." + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force -Path $Tmp | Out-Null
  $Tarball = Join-Path $Tmp 'rc.tgz'
  $Url = $OwnerTarball
  try {
    try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch { }
    # -UseBasicParsing keeps this working on PS 5.1 without IE engine.
    Invoke-WebRequest -Uri $Url -OutFile $Tarball -UseBasicParsing
  } catch {
    Bad "download failed ($Url): $($_.Exception.Message)"
    Invoke-Cleanup
    exit 1
  }
  if (-not (Have 'tar')) {
    Bad "need 'tar' to extract (ships on Windows 10 1803+). Install Git/tar or use the Go binary."
    Invoke-Cleanup
    exit 1
  }
  try {
    & tar -xzf $Tarball -C $Tmp
    if ($LASTEXITCODE -ne 0) { throw "tar exited $LASTEXITCODE" }
  } catch {
    Bad "extract failed: $($_.Exception.Message)"
    Invoke-Cleanup
    exit 1
  }
  $found = Get-ChildItem -Path $Tmp -Recurse -Depth 3 -Filter 'plugin.json' -File -ErrorAction SilentlyContinue |
    Where-Object { $_.DirectoryName -match '[\\/]\.claude-plugin$' } | Select-Object -First 1
  if (-not $found) { Bad "could not find plugin in tarball"; Invoke-Cleanup; exit 1 }
  $Src = Split-Path -Parent (Split-Path -Parent $found.FullName)
  Ok "downloaded"
}
Detail "source: $Src"

# ===================================================================
# 2. detect platform (OS / arch / package manager)
# ===================================================================
$OsName = 'Windows'
$Arch = $env:PROCESSOR_ARCHITECTURE
if (-not $Arch) { $Arch = 'unknown' }
$Pm = ''
foreach ($c in @('winget', 'choco', 'scoop')) { if (Have $c) { $Pm = $c; break } }
$PmLabel = if ([string]::IsNullOrEmpty($Pm)) { 'none' } else { $Pm }
Head "refactor-chain installer  .  $OsName ($Arch)  .  package manager: $PmLabel"

# ---- Node helpers (bootstrap only when a surface needs it) ----
function Get-NodeBin {
  $cand = @()
  try { $g = Get-Command node -ErrorAction SilentlyContinue; if ($g) { $cand += $g.Source } } catch { }
  $cand += (Join-Path $HomeDir '.local\node-current\node.exe')
  $cand += (Join-Path $HomeDir '.local\node-current\bin\node.exe')
  foreach ($c in $cand) { if ($c -and (Test-Path $c)) { return $c } }
  return $null
}
function Get-NpxBin {
  $nb = Get-NodeBin
  if (-not $nb) { return $null }
  $dir = Split-Path -Parent $nb
  foreach ($n in @('npx.cmd', 'npx.exe', 'npx')) {
    $p = Join-Path $dir $n
    if (Test-Path $p) { return $p }
  }
  if (Have 'npx') { return (Get-Command npx).Source }
  return $null
}
function Install-Node {
  if (Get-NodeBin) { return $true }
  if (-not $Pm) { return $false }
  Detail "Node not found - bootstrapping via $Pm..."
  try {
    switch ($Pm) {
      'winget' { & winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements 2>&1 | Out-Null }
      'choco'  { & choco install nodejs-lts -y 2>&1 | Out-Null }
      'scoop'  { & scoop install nodejs-lts 2>&1 | Out-Null }
    }
  } catch { return $false }
  # PATH may not refresh in-session; re-check known locations too.
  return [bool](Get-NodeBin)
}

# ===================================================================
# 3. detect installed surfaces
# ===================================================================
function Test-App([string[]]$names) {
  # Windows: probe Start-Menu shortcuts + PATH; app names map to .lnk files.
  $menus = @(
    (Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs'),
    (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs')
  ) | Where-Object { $_ -and (Test-Path $_) }
  foreach ($n in $names) {
    foreach ($m in $menus) {
      try {
        if (Get-ChildItem -Path $m -Recurse -Filter "$n*.lnk" -File -ErrorAction SilentlyContinue | Select-Object -First 1) { return $true }
      } catch { }
    }
  }
  return $false
}
function Test-Editor([string]$id) {
  switch ($id) {
    'cursor'     { return ((Test-App @('Cursor')) -or (Have 'cursor')) }
    'vscode'     { return ((Test-App @('Visual Studio Code', 'VSCodium')) -or (Have 'code') -or (Have 'codium')) }
    'windsurf'   { return ((Test-App @('Windsurf')) -or (Have 'windsurf')) }
    'zed'        { return ((Test-App @('Zed')) -or (Have 'zed')) }
    'continue'   { return (Test-Path (Join-Path $HomeDir '.continue')) }
    'gemini-cli' { return ((Have 'gemini') -or (Test-Path (Join-Path $HomeDir '.gemini'))) }
    'aider'      { return (Have 'aider') }
    'opencode'   { return (Have 'opencode') }
    'amp'        { return (Have 'amp') }
    default      { return $false }
  }
}
# editor id -> npx skills agent id
function Get-AgentFor([string]$id) {
  switch ($id) {
    'vscode' { return 'github-copilot' }
    'aider'  { return 'aider-desk' }
    default  { return $id }
  }
}
$Editors = @('cursor', 'vscode', 'windsurf', 'zed', 'continue', 'gemini-cli', 'aider', 'opencode', 'amp')

function Test-Wants([string]$id) {
  if ($Only -and -not (Test-InList $Only $id)) { return $false }
  if ($Skip -and (Test-InList $Skip $id)) { return $false }
  return $true
}

# Cowork detection (shares ~/.claude with Claude Code — covered by claude-home).
function Test-Cowork {
  $dirs = @(
    (Join-Path $env:APPDATA 'Claude'),
    (Join-Path $HomeDir '.config\Claude')
  )
  foreach ($d in $dirs) { if ($d -and (Test-Path $d)) { return $true } }
  return $false
}

# ===================================================================
# 4. show the plan
# ===================================================================
$Act = if ($Uninstall) { 'uninstall' } else { 'install' }
Head "Here's what I found (and will ${Act}):"
$PlanClaude = $false; $PlanCodex = $false; $PlanEditors = @()

if (Test-Wants 'claude-code') {
  if ((Test-Path $ClaudeHome) -or (-not $Uninstall)) {
    $PlanClaude = $true
    $coworkNote = if (Test-Cowork) { ' + Cowork detected' } else { '' }
    Ok "Claude Code / Cowork  (~/.claude)$coworkNote"
  }
}
if ((Test-Wants 'codex') -and (Test-Path $CodexHome)) { $PlanCodex = $true; Ok "Codex  (~/.codex)" }
foreach ($e in $Editors) {
  if (-not (Test-Wants $e)) { continue }
  if (Test-Editor $e) { $PlanEditors += $e; Ok "$e  (via skills CLI)" }
  elseif ($Details) { Skip "$e (not found)" }
}
if (-not $PlanClaude -and -not $PlanCodex -and $PlanEditors.Count -eq 0) {
  Skip "no supported surfaces detected"
  Say ""
  Say "Manual per-surface commands:"
  Say "  Claude Code : re-run this script (installs to ~/.claude)"
  Say "  Editors     : npx -y skills@latest add $Owner/refactor-chain --global --agent <agent> --copy --full-depth"
}

if ($DryRun) { Head "Dry run - nothing installed."; Invoke-Cleanup; exit 0 }

if (-not $Yes) {
  Say ""
  $ans = Read-Host "Proceed? [Y/n]"
  if ($ans -match '^[nN]') { Say "Cancelled."; Invoke-Cleanup; exit 0 }
}

# ===================================================================
# 5. install helpers
# ===================================================================

# The 6 hooks — mirrors manifest.json / install.sh. Paths use forward slashes
# in JSON and are space-free absolute `node <path>` commands.
function Register-Hooks([string]$SettingsPath, [string]$ScriptsDir) {
  $nb = Get-NodeBin
  if (-not $nb) { return $false }
  $nodeFwd = ($nb -replace '\\', '/')
  $dirFwd  = ($ScriptsDir -replace '\\', '/')

  $hookDefs = @(
    @{ event = 'SessionStart';     matcher = '*';                        file = 'boot.mjs' },
    @{ event = 'UserPromptSubmit'; matcher = '*';                        file = 'intake.mjs' },
    @{ event = 'PreToolUse';       matcher = 'Edit|Write|MultiEdit|Bash'; file = 'risk-guard.mjs' },
    @{ event = 'PostToolUse';      matcher = 'Edit|Write|MultiEdit';     file = 'guard.mjs' },
    @{ event = 'Stop';             matcher = '*';                        file = 'ship-gate.mjs' },
    @{ event = 'SessionEnd';       matcher = '*';                        file = 'memory-capture.mjs' }
  )

  # Load existing settings (tolerate malformed -> start fresh, backup already taken).
  $settings = $null
  if (Test-Path $SettingsPath) {
    try { $settings = Get-Content -Raw -Path $SettingsPath | ConvertFrom-Json } catch { $settings = $null }
  }
  if ($null -eq $settings) { $settings = [pscustomobject]@{} }
  if (-not ($settings.PSObject.Properties.Name -contains 'hooks') -or $null -eq $settings.hooks) {
    $settings | Add-Member -NotePropertyName 'hooks' -NotePropertyValue ([pscustomobject]@{}) -Force
  }
  $hooksObj = $settings.hooks

  foreach ($h in $hookDefs) {
    $ev = $h.event
    # Existing blocks for this event (idempotent: drop prior refactor-chain entries).
    $existing = @()
    if ($hooksObj.PSObject.Properties.Name -contains $ev -and $null -ne $hooksObj.$ev) {
      foreach ($block in @($hooksObj.$ev)) {
        $isOurs = $false
        try {
          foreach ($hk in @($block.hooks)) {
            if ($hk -and $hk.command -and ($hk.command -like '*refactor-chain/scripts/*')) { $isOurs = $true; break }
          }
        } catch { $isOurs = $false }
        if (-not $isOurs) { $existing += $block }
      }
    }
    $cmd = "`"$nodeFwd`" `"$dirFwd/$($h.file)`""
    $newBlock = [pscustomobject]@{
      matcher = $h.matcher
      hooks   = @([pscustomobject]@{ type = 'command'; command = $cmd; timeout = 10 })
    }
    $existing += $newBlock
    $hooksObj | Add-Member -NotePropertyName $ev -NotePropertyValue ([object[]]$existing) -Force
  }

  $json = $settings | ConvertTo-Json -Depth 20
  Set-Content -Path $SettingsPath -Value $json -Encoding UTF8
  return $true
}

# ---- install: claude-home (Claude Code + Cowork share ~/.claude) ----
function Install-Claude([string]$Dir) {
  $skillsDst   = Join-Path $Dir 'skills'
  $commandsDst = Join-Path $Dir 'commands'
  $scriptsDst  = Join-Path $Dir 'skills\refactor-chain\scripts'
  $libDst      = Join-Path $scriptsDst 'lib'
  foreach ($d in @($skillsDst, $commandsDst)) { New-Item -ItemType Directory -Force -Path $d | Out-Null }
  # NOTE: scriptsDst/libDst are created AFTER the skills loop below — the loop removes
  # skills\refactor-chain and re-copies it without a scripts\ dir, which would wipe them.

  # skills
  $srcSkills = Join-Path $Src 'skills'
  if (Test-Path $srcSkills) {
    foreach ($sd in Get-ChildItem -Path $srcSkills -Directory -ErrorAction SilentlyContinue) {
      $dst = Join-Path $skillsDst $sd.Name
      if (Test-Path $dst) { Remove-Item -Recurse -Force $dst -ErrorAction SilentlyContinue }
      Copy-Item -Recurse -Force -Path $sd.FullName -Destination $dst
    }
  }
  # scripts (into the orchestrator skill dir; space-free path) — created here, AFTER the skills loop
  foreach ($d in @($scriptsDst, $libDst)) { New-Item -ItemType Directory -Force -Path $d | Out-Null }
  $srcScripts = Join-Path $Src 'scripts'
  if (Test-Path $srcScripts) {
    Get-ChildItem -Path $srcScripts -Filter '*.mjs' -File -ErrorAction SilentlyContinue |
      ForEach-Object { Copy-Item -Force -Path $_.FullName -Destination $scriptsDst }
    $srcLib = Join-Path $srcScripts 'lib'
    if (Test-Path $srcLib) {
      Get-ChildItem -Path $srcLib -Filter '*.mjs' -File -ErrorAction SilentlyContinue |
        ForEach-Object { Copy-Item -Force -Path $_.FullName -Destination $libDst }
    }
  }
  # commands
  $srcCommands = Join-Path $Src 'commands'
  if (Test-Path $srcCommands) {
    Get-ChildItem -Path $srcCommands -Filter '*.md' -File -ErrorAction SilentlyContinue |
      ForEach-Object { Copy-Item -Force -Path $_.FullName -Destination $commandsDst }
  }

  # hooks — never write a hook path with a space (the known veto bug).
  if ($scriptsDst -match '\s') {
    Bad "hook path has a space ($scriptsDst) - skipping hook registration (would veto tools)"
    return
  }
  $settingsPath = Join-Path $Dir 'settings.json'
  if (Test-Path $settingsPath) {
    try { Copy-Item -Force -Path $settingsPath -Destination "$settingsPath.bak.rcx" } catch { }
  } else {
    Set-Content -Path $settingsPath -Value '{}' -Encoding UTF8
  }

  $registered = $false
  try { $registered = Register-Hooks $settingsPath $scriptsDst } catch {
    Bad "hook registration errored: $($_.Exception.Message) - restoring backup"
    if (Test-Path "$settingsPath.bak.rcx") { Copy-Item -Force -Path "$settingsPath.bak.rcx" -Destination $settingsPath }
    $registered = $false
  }
  if ($registered) {
    Ok "Claude Code / Cowork - skills, commands, 6 hooks registered"
  } else {
    Skip "Claude files installed; hooks need Node (bootstrapping if possible)"
    if (Install-Node) {
      try {
        if (Register-Hooks $settingsPath $scriptsDst) { Ok "hooks registered after Node bootstrap" }
      } catch { Skip "hooks still need Node - install Node, then re-run" }
    } else {
      Skip "couldn't bootstrap Node - install Node, then re-run to register hooks"
    }
  }
}
function Uninstall-Claude([string]$Dir) {
  $skillsDst = Join-Path $Dir 'skills'
  if (Test-Path $skillsDst) {
    Get-ChildItem -Path $skillsDst -Directory -Filter 'refactor-*' -ErrorAction SilentlyContinue |
      ForEach-Object { Remove-Item -Recurse -Force $_.FullName -ErrorAction SilentlyContinue }
  }
  $commandsDst = Join-Path $Dir 'commands'
  if (Test-Path $commandsDst) {
    Get-ChildItem -Path $commandsDst -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -like 'refactor*.md' -or $_.Name -eq 'fix.md' -or $_.Name -eq 'check.md' } |
      ForEach-Object { Remove-Item -Force $_.FullName -ErrorAction SilentlyContinue }
  }
  # strip hook entries (pure PowerShell — no Node needed)
  $settingsPath = Join-Path $Dir 'settings.json'
  if (Test-Path $settingsPath) {
    try {
      $settings = Get-Content -Raw -Path $settingsPath | ConvertFrom-Json
      if ($settings.PSObject.Properties.Name -contains 'hooks' -and $null -ne $settings.hooks) {
        foreach ($ev in @($settings.hooks.PSObject.Properties.Name)) {
          $kept = @()
          foreach ($block in @($settings.hooks.$ev)) {
            $isOurs = $false
            try {
              foreach ($hk in @($block.hooks)) {
                if ($hk -and $hk.command -and ($hk.command -like '*refactor-chain/scripts/*')) { $isOurs = $true; break }
              }
            } catch { $isOurs = $false }
            if (-not $isOurs) { $kept += $block }
          }
          $settings.hooks | Add-Member -NotePropertyName $ev -NotePropertyValue ([object[]]$kept) -Force
        }
        Set-Content -Path $settingsPath -Value ($settings | ConvertTo-Json -Depth 20) -Encoding UTF8
      }
    } catch { }
  }
  Ok "Claude Code / Cowork - removed"
}

# ---- install: codex-home ----
function Install-Codex {
  $pluginDir = Join-Path $CodexHome 'plugins\refactor-chain'
  New-Item -ItemType Directory -Force -Path $pluginDir | Out-Null
  Copy-Item -Recurse -Force -Path (Join-Path $Src '*') -Destination $pluginDir
  $scriptsDir = Join-Path $pluginDir 'scripts'
  if ($scriptsDir -match '\s') {
    Bad "codex hook path has a space - skipping hooks"
    return
  }
  $hooksPath = Join-Path $CodexHome 'hooks.json'
  if (Test-Path $hooksPath) {
    try { Copy-Item -Force -Path $hooksPath -Destination "$hooksPath.bak.rcx" } catch { }
  } else {
    Set-Content -Path $hooksPath -Value '{}' -Encoding UTF8
  }
  $registered = $false
  try { $registered = Register-Hooks $hooksPath $scriptsDir } catch { $registered = $false }
  if ($registered) { Ok "Codex - plugin + hooks" } else { Skip "Codex plugin copied; hooks need Node" }
}
function Uninstall-Codex {
  $pluginDir = Join-Path $CodexHome 'plugins\refactor-chain'
  if (Test-Path $pluginDir) { Remove-Item -Recurse -Force $pluginDir -ErrorAction SilentlyContinue }
  Ok "Codex - removed"
}

# ---- install: editors via skills CLI (npx) ----
function Install-Editor([string]$e) {
  $ag = Get-AgentFor $e
  $manual = "npx -y skills@latest add $Owner/refactor-chain --global --agent $ag --copy --full-depth"
  if (-not (Get-NpxBin)) {
    if (-not (Install-Node)) {
      Skip "$e - needs Node/npx (couldn't bootstrap). Manual: $manual"
      return
    }
  }
  $npx = Get-NpxBin
  if (-not $npx) { Skip "$e - npx unavailable. Manual: $manual"; return }
  try {
    & $npx -y skills@latest add "$Owner/refactor-chain" --global --agent $ag --skill '*' -y --copy --full-depth 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Ok "$e - installed (agent: $ag)" }
    else { Skip "$e - skills CLI failed; manual: $manual" }
  } catch {
    Skip "$e - skills CLI failed; manual: $manual"
  }
}
function Uninstall-Editor([string]$e) {
  $ag = Get-AgentFor $e
  $npx = Get-NpxBin
  if ($npx) {
    try { & $npx -y skills@latest remove refactor-chain --global --agent $ag 2>&1 | Out-Null } catch { }
  }
  Ok "$e - remove attempted"
}

# ===================================================================
# 6-8. run install / uninstall, verify, summarize
# ===================================================================
try {
  Head "$((Get-Culture).TextInfo.ToTitleCase($Act))ing..."
  if ($Uninstall) {
    if ($PlanClaude) { Uninstall-Claude $ClaudeHome }
    if ($PlanCodex)  { Uninstall-Codex }
    foreach ($e in $PlanEditors) { Uninstall-Editor $e }
    Head "Uninstalled. Restart your editor to clear loaded skills."
    Invoke-Cleanup
    exit 0
  }

  if ($PlanClaude) { Install-Claude $ClaudeHome }
  if ($PlanCodex)  { Install-Codex }
  foreach ($e in $PlanEditors) { Install-Editor $e }

  # ---- verify + summary ----
  Head "Done."
  if (Test-Path (Join-Path $ClaudeHome 'skills\refactor-chain\SKILL.md')) { Ok "verified: Claude skills present" }
  Say ""
  Write-C "Next: open Claude Code (or your editor) and type /refactor - describe what you want fixed or tidied." 'Cyan'
  Detail "Tips: /fix (something broke)  /check (review before shipping)  re-run with -Uninstall to remove."
}
finally {
  Invoke-Cleanup
}
