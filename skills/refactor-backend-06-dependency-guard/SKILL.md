---
name: refactor-backend-06-dependency-guard
description: "Use this skill when checking or repairing layered-architecture dependencies in a backend project in any registry-detected stack — controllers injecting other controllers, controllers calling DAOs/mappers directly, injecting a concrete `ServiceImpl` instead of its interface, database entities leaking into the controller layer, direct class references across module boundaries, or layered classes sitting in the wrong module. Triggers on phrases like \"dependency check\", \"dependency fix\", \"layered dependency check\", \"architecture dependency fix\". Step 6 of 9 in the layered-backend governance lane of the refactor-chain bundle. Works on any backend codebase in any registry-detected language; no product-, organization-, or language-locked rules."
---

# Layered Dependency Guard — refactor-chain · backend lane · step 06/09

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work · **Prerequisite:** refactor-backend-05-controller · **Next:** refactor-backend-07-api-naming.
**Adaptivity / conditional:** repo-agnostic — works on any layered backend project in any registry-detected stack. Module-name conventions (e.g. `<module>-controller`, `<module>-service`, `<module>-model`) are detected from the build files, never assumed.

## Purpose
Enforce the `Controller → Service interface → DAO` direction of a layered backend service. The skill scans controller-layer injections and imports, labels violations with a six-rule deterministic table (first match wins), reports them, and — on request — repairs them: removing controller-to-controller coupling, synthesizing a delegate-service intermediary where a controller talks to a DAO directly, and switching concrete-implementation injections to interfaces. It runs after steps 03–05 on purpose: by then every service interface the repairs need already exists, so a fix can never stall for want of an interface. Structure changes only; business logic never changes.

## When to use
- After the controller step (05) and before API naming (07).
- You say things like: "dependency check", "dependency fix", "layered dependency check", "architecture dependency fix", "why does this controller import a mapper".
- A controller injects another controller, imports from a `dao`/`mapper` package, injects `FooServiceImpl`, returns entity types, or references a sibling module's classes directly.

## What I'll tell you (plain-language / ADHD-friendly)
- "I'm checking that requests flow one way: controller → service interface → data access. Your endpoints keep behaving exactly the same."
- "You are here: step 6 of 9. First a scan and a labeled report; nothing changes until you approve the plan."
- "This controller calls the database directly. I'll add a thin pass-through service in between — the SQL stays exactly where it is, only the call routes through one more door."
- "That injection points at a remote client, which is legitimate — I checked that first, so it's marked SKIP, not flagged."
- "Fixed 4 of 11; compiling now before I continue, so a small mistake can't snowball."
- Want the rule table, the decision tree, and the interface-synthesis rules? Say "show technical details" — it's all in `references/method.md`.

## Method
1. **Scope.** Locate controller-layer sources and detect the module layout (which build modules hold controllers, services, models). Confirm scope with the user.
2. **Scan.** For every controller, collect `@Autowired`/`@Resource` field injections and `import` statements.
3. **Exclusion gate first.** Before any rule fires, test the injected type against the remote-client exclusion: `@FeignClient` (or equivalent) annotation, name ending `Client`/`Feign`/`Api`, mapping annotations on interface methods, or residence in a remote-client/API module ⇒ SKIP, recorded with the reason. Legitimate remote calls are never flagged.
4. **Label deterministically.** Apply rules DEP-1…DEP-6 in strict priority order — the first rule that matches the injected type's characteristics wins, so repeated runs agree:
   - **DEP-1** controller injects another controller (FAIL) — controller-hood decided by name suffix, live annotation, or `.controller.` package, whichever hits.
   - **DEP-2** controller injects a DAO/mapper directly (FAIL).
   - **DEP-3** controller injects a concrete `ServiceImpl` instead of the interface (FAIL).
   - **DEP-4** entity types surface in controller signatures/fields (WARN).
   - **DEP-5** direct class reference across module boundaries (WARN).
   - **DEP-6** layered class placed in the wrong module (FAIL).
5. **Report** with `templates/output.md`: per-violation file, line, rule, evidence, and proposed remedy.
6. **Fix (only when asked).** Confirmed plan first. Order: DEP-6 placement moves, then DEP-1 (decision tree: remote client? logger-only reference? existing interface covers the calls? append missing declarations? extract a private helper for composite logic? else SKIP for a human), then DEP-2 delegate-service synthesis (exact-signature pass-through; multiple DAOs merged per controller; SQL never moves out of the controller; new files go in the service module), then DEP-3 interface switches, then DEP-4 advisories. Interface design follows the hard rules in `references/method.md`: signatures copied character-for-character, deterministic prefixes only for genuine collisions, deterministic method ordering.
7. **Completeness loop.** After every 3–5 fixes: compile checkpoint. At the end: residual import sweeps (no `service.impl` or DAO imports left in controller modules), interface-completeness check against every caller, full build.

## Guardrails
- Behavior is preserved (refactor only): no method bodies, endpoints, or SQL change; delegate services are pure forwarders.
- Never "improve" while repairing: no renamed methods, no merged/split methods, no narrowed generics or return types, no semantic wrapper methods around DAO calls.
- Interfaces gain only methods callers actually invoke — never the implementation's whole public surface.
- One confirmed plan per run; classification is closed during execution — no rules invented mid-flight.
- Compile checkpoints are mandatory, not optional; a red build stops the run.

## Verify
Plain language: "no controller talks sideways or skips a layer, every injection is an interface, and the whole project still builds."
Technical (full checklist in `references/method.md`): residual-import grep of controller modules returns zero non-SKIP hits for `service.impl` and DAO packages; every replaced field's call sites are declared on its interface (overloads included); per-batch and final compile pass; module placement matches DEP-6; then the chain verify gate runs. `node scripts/checklist.mjs` prints the machine-readable step list.

## Resources
- `references/method.md` — rule table, exclusion gate, repair decision tree, delegate-service and interface-design rules, completeness loop.
- `examples/before-after.md` — a controller-to-DAO shortcut repaired end to end.
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — check-report and fix-plan scaffolds.

## Chain position
Runs as step 06 of the layered-backend governance lane. It deliberately follows 03 (DAO/model), 04 (service), and 05 (controller): those steps guarantee the interfaces and package layout this step's repairs rely on. On success the orchestrator (`~/.claude/skills/refactor-chain/scripts/orchestrate.mjs`) advances to refactor-backend-07-api-naming; `refactor-code-principles` and the review gate close the lane.
