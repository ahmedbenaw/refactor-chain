---
description: "The Conductor — resolve and run the whole refactor-chain method for a task automatically. A chain-of-skills per step (internal plus external installed skills), spec-kit (SDD) commands per phase, and the multi-pass review loop until dry (at least 3 passes for a review-class target). Emit-as-data and async by construction; composes with the pipeline, never bypasses it."
argument-hint: [optional path or task]
allowed-tools: Read, Edit, Write, MultiEdit, Grep, Glob, Bash, Skill, Agent, TodoWrite
---

Invoke the `refactor-orchestrate` skill: conduct the task — emit the chain-of-skills and spec-kit commands as data (read-only), dispatch the parallel work concurrently and the sequential work in order, and for a review-class target run the multi-pass review loop until it goes dry (at least three passes), then shape a SPEC and sprint plan from the findings. Honor the current mode (careful / autopilot / ask). Do not change code from a review unless I ask. Target / task: $ARGUMENTS
