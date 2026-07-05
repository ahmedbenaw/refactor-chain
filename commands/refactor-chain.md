---
description: Use this skill to run refactor-chain — a self-diagnosing, self-healing 'fix-it' pipeline for a codebase.
argument-hint: [target path or focus]
allowed-tools: Read, Edit, Write, MultiEdit, Grep, Glob, Bash, Skill, Agent, TodoWrite
---

Invoke the `refactor-chain` skill. Detect the lane for the target (default: current project), confirm the plan, then run the ordered chain step-by-step: checkpoint → invoke the step skill → apply → verify → advance or self-heal. `refactor-code-principles` runs by default as the final step. If `.refactor-chain/state.json` already exists, resume from the current step instead of re-initializing.

Target: $ARGUMENTS
