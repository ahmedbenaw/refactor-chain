---
description: Undo the last step — roll back safely.
argument-hint: 
allowed-tools: Read, Edit, Write, MultiEdit, Grep, Glob, Bash, Skill, Agent, TodoWrite
---

Use the `refactor-chain` skill's rollback: find the most recent checkpoint in `.refactor-chain/state.json` and `git stash apply` it to undo the last step, then tell me plainly what was undone. Ask before doing anything else.
