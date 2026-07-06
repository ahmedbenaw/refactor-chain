---
description: Show where we are in the current fix, on one screen.
argument-hint: 
allowed-tools: Read, Edit, Write, MultiEdit, Grep, Glob, Bash, Skill, Agent, TodoWrite
---

Run `node "$HOME/.claude/skills/refactor-chain/scripts/orchestrate.mjs" status --target .` and tell me in plain words: which step we're on (N of M), whether the safety-net is set, and what's next. Offer "show technical details" for the raw state. If something seems off (state won't load, hooks silent, steps stuck), run `node "$HOME/.claude/skills/refactor-chain/scripts/orchestrate.mjs" doctor` and explain its findings in plain words.
