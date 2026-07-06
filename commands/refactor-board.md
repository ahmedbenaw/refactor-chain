---
description: Convene the Review Board — a grumpy panel of named engineer personas that reviews a codebase through role-lenses, adversarially verifies every finding, and returns one ranked, deduped ledger with a go / fix-these-first / no-go decision.
argument-hint: [optional path or focus]
allowed-tools: Read, Edit, Write, MultiEdit, Grep, Glob, Bash, Skill, Agent, TodoWrite
---

Invoke the `refactor-board` skill: convene the review board over the target, dispatch each role-lens as a real subagent (finder), adversarially verify each finding (coordinator), then aggregate into one calm, ranked ledger. Read-only review by default; do not change code unless I ask. Target / focus: $ARGUMENTS
