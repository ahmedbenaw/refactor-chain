# The Principle Method — one entry per registry principle

This file is the deep half of `refactor-code-principles`. The SKILL.md owns the flow
(detect → recommend → decision window → checkpoint/apply/verify); this file owns
the *content*: for every principle in
`~/.claude/skills/refactor-chain/scripts/lib/principles.mjs`, what it means in
plain words, the smells that betray a violation, the safe transform sequence
that fixes it without moving behavior, and idiom notes for the language families
where it applies.

Two rules govern everything below:

1. **Every transform is reversible and verified.** Checkpoint first, one move at
   a time, type-check/build/tests after each move, roll back on any drift.
2. **A principle is a diagnostic, not a quota.** You apply a principle where its
   smell actually appears. Zero findings for a chosen principle is a fine
   outcome — record it and move on.

General safe-move mechanics used throughout (referenced as *extract*, *parallel
change*, *seam*, *branch-drain*):

- **Extract:** copy the logic to its new home; make the old location a thin
  forwarder to the new one; verify; only then delete the old body. Never
  cut-and-paste in a single motion.
- **Parallel change (expand/contract):** when a contract has callers, add the
  new shape *next to* the old, migrate callers in small verified batches, and
  remove the old shape only when nothing references it.
- **Seam:** derive an interface/protocol/typeclass from how the code is
  *actually used today* (not how it might be used someday), make the existing
  concrete satisfy it, switch consumers to the abstraction, and bind the
  concrete in exactly one wiring location.
- **Branch-drain:** to retire a growing conditional, build the replacement
  dispatch (map, table, polymorphic call) containing the *same* cases, move one
  case across at a time with verification between, and delete the conditional
  only when it is empty.

---

## Part 1 — Agnostic baseline (fits every stack)

### SOLID (`solid`)

**Plain words.** Five checks that keep units easy to change: each unit changes
for one reason; new variants arrive without editing old code; anything claiming
to implement a contract really honors it; contracts stay small enough that
implementers never fake methods; important logic depends on contracts rather
than concrete machinery.

**Smells.**
- *S:* a file you must edit for two unrelated kinds of request (a schema change
  AND a formatting change AND a pricing change all land in the same class).
- *O:* a `switch`/`if-else` ladder that grows a new arm every time the business
  adds a variant.
- *L:* callers probing the concrete type before calling; implementations that
  throw "unsupported" or override with an empty body.
- *I:* implementers stubbing half the contract; callers importing a wide
  interface to use two members.
- *D:* policy-level code constructing its own database handles, HTTP clients,
  or clocks inline.

**Safe transforms.** S → *extract* along the change-axes: pull each
responsibility into its own unit and leave the original as a coordinator until
callers migrate. O → *branch-drain* into a registry or polymorphic dispatch.
L → don't "fix" the subtype; narrow or split the parent contract so every
implementation is honest, then migrate via *parallel change*. I → split the fat
interface into role-sized ones; the old interface can temporarily extend the new
slices during migration. D → *seam*: lift the concrete dependency behind a
contract, inject it, wire at one composition point.

**Family notes.** In dynamically-typed stacks (Python, Ruby, JS) the L and I
checks lean on duck-typing discipline and tests instead of a compiler. In Go,
prefer many one-or-two-method interfaces declared at the *consumer* side. In
Rust, traits give O and D nearly for free — reach for `impl Trait`/generics
before trait objects. **Guardrail:** never introduce an interface without a real
second implementation, a genuine test seam, or a true policy/detail boundary.

### GRASP (`grasp`)

**Plain words.** Give each job to the code that already holds the data the job
needs. Ownership follows knowledge: the thing that knows, does.

**Smells.** A "manager" that pulls fields out of another object, computes, and
pushes results back in. Feature envy — a method that reads five attributes of a
neighbor and one of its own. Creation scattered everywhere instead of near the
data required to construct.

**Safe transforms.** Move the computation *into* the type that owns the data
(*extract* the method there, forward from the old site, then drain callers).
Concentrate construction in a creator that naturally aggregates the inputs.
Where two objects both hold half the knowledge, introduce a small value object
that owns the combined fact.

**Family notes.** In FP stacks, "ownership" maps to the module that defines the
data type: the function belongs in the module of its primary argument.

### DRY · KISS · YAGNI (`dry-kiss-yagni`)

**Plain words.** Each *fact or rule* is written once (DRY is about knowledge,
not about identical-looking lines). The simplest design that does the job wins
(KISS). Nothing gets built for a future nobody has confirmed (YAGNI).

**Smells.** The same business rule re-implemented in a validator, a report, and
a migration script — three places to fix one rule. Config flags nothing sets.
Abstract base classes with a single subclass. "Utils" that generalize one call
site. Conversely: two snippets that merely *look* similar but encode different
rules — merging them is the anti-DRY failure.

**Safe transforms.** For true duplication: *extract* one canonical home for the
rule, forward all copies to it, verify, delete copies one at a time. For
speculation: delete the unused option/hook/layer outright (dead-code removal is
the most behavior-safe transform there is — prove nothing references it first).
For a false merge already in the codebase: split it back apart via *parallel
change*.

### Separation of concerns (`separation-of-concerns`)

**Plain words.** Different kinds of work live in different places: deciding
(business rules), moving data (I/O), presenting (formatting/UI), wiring
(configuration). A reader should be able to look at one unit and hold one kind
of thinking in their head.

**Smells.** SQL strings inside a request handler. Presentation markup built
inside a calculation. Retry/backoff logic braided through domain rules. A
function whose name needs "and" to be honest.

**Safe transforms.** Identify the alien concern's lines, *extract* them into a
unit of their own kind, and let the original call it. When two concerns share
local variables, first group each concern's statements together (a pure
reordering — verify it), then extract. Work from the inside out: pure decision
logic is the easiest to pull free.

**Family notes — C modularity & header hygiene.** In C the unit of separation
is the `.c`/`.h` pair, and hygiene is the mechanism: a header exposes *only* the
functions and types that form the module's contract; everything else is
`static` in the `.c` file. Smells: headers that leak struct internals callers
then poke directly; one mega-header included everywhere; hidden coupling via
globals; include cycles. Transforms: introduce opaque pointer types (declare
`struct foo;` in the header, define it privately), mark internal functions
`static`, split god-headers by consumer need, replace shared globals with
explicit parameters or accessor functions — each as its own compile-verified
step. Include-what-you-use: every file includes exactly the headers it needs,
no transitive freeloading.

### High cohesion, low coupling (`cohesion-coupling`)

**Plain words.** Things that change together should sit together; things that
change independently should barely know each other exists.

**Smells.** Shotgun surgery — one logical change forces edits in six files.
Divergent change — one file is edited for every kind of request. A module
imported by everything and importing everything. Test files that need elaborate
setup of unrelated subsystems.

**Safe transforms.** Cluster by co-change: look at version history or reason
about which pieces move together, then *extract* the cluster into one unit.
Cut coupling by narrowing what crosses the boundary — pass the two fields a
function needs, not the whole context object (*parallel change* on the
signature). Break dependency knots with a *seam* at the narrowest waist.

### Law of Demeter (`law-of-demeter`)

**Plain words.** Ask your direct collaborators for what you need; don't reach
through them into their internals. A long chain of dot-hops means your code
knows the shape of three other objects' guts — three reasons to break.

**Smells.** `order.customer.address.country.code` deep in pricing logic.
Getters that exist only so outsiders can navigate. Mocks in tests that stub a
chain of returns-a-thing-that-returns-a-thing.

**Safe transforms.** Add a purposeful method at the near end of the chain
(`order.destinationCountry()`), implement it by delegation, switch callers via
*parallel change*, then consider whether intermediate hops can become private.
Don't mechanically wrap every hop — collapse chains where a *domain question*
is being asked; leave harmless chains on plain data structures alone.

**Family notes.** Fluent builders and pipelines (method chaining that returns
the same object or the next stage of a pipeline) are *not* violations — the
principle targets structural reach-through, not chained calls.

### Composition over inheritance (`composition-over-inheritance`)

**Plain words.** Build behavior by plugging parts together instead of stacking
ever-deeper family trees. Inheritance hard-wires one axis of variation at
compile time; composition keeps each axis independent.

**Smells.** Class names like `AbstractBaseRetryingCachedHttpClient`. A subclass
overriding a parent method to do nothing. Combinatorial subclass explosions
(`PdfReportEmailer`, `PdfReportSlacker`, `CsvReportEmailer`…). Protected fields
poked by grandchildren.

**Safe transforms.** Identify each independent axis (format, delivery, retry),
give each a small contract, turn the subclass matrix into one class composed of
one part per axis — build the composed version alongside the hierarchy
(*parallel change*), migrate leaf-by-leaf, delete empty branches. For a shallow
misuse, "replace inheritance with delegation": hold the former parent as a
field and forward the calls you actually use.

**Family notes.** Rust and Go make this the default (no implementation
inheritance) — the smell there is trait/interface *bloat* instead. In React and
similar UI stacks, composition means children/slots and hooks, never component
subclassing.

### Command–Query Separation (`cqs`)

**Plain words.** A routine either answers a question (no observable change) or
performs a change (and says so) — never both in disguise. Readers should be
able to call a query fearlessly.

**Smells.** A `get…` that increments a counter, writes a cache entry visible to
others, or lazily mutates shared state. A "check" that consumes the thing it
checks (`isValid()` that pops). Functions returning a value *and* mutating an
argument.

**Safe transforms.** Split the double-agent into an honest pair: a pure query
and an explicit command; implement the old entry point as
query-then-command; migrate callers, then delete it (*parallel change*).
Rename until the side effect is audible: reserve `get`/`is`/`peek` for pure
reads, use `fetch`/`load`/`consume`/`commit` for effects.

**Family notes.** Idempotent caching that is *truly* invisible (memoization of
a pure function) is acceptable — the test is whether any caller can observe the
difference.

### Dependency-rule layering (`layering`)

**Plain words.** Arrange the code in rings with the business rules at the
center. Dependencies point inward only: the core never imports the web
framework, the ORM, or the UI. Outer rings adapt the messy world to the core's
contracts.

**Smells.** A framework type (request object, ORM row, protobuf) appearing in a
core function's signature. Domain logic that can't run without a live database.
An inner module importing an outer one. "Where does this go?" answered by
convenience.

**Safe transforms.** Work one leak at a time: define the core-owned contract
(a repository interface, a plain data shape), *seam* the infrastructure behind
it, translate at the boundary (map ORM row → plain shape), and move the wiring
of concretes to a single composition root. Direction of travel: make the core
compilable/testable with all outer rings stubbed.

**Family notes.** Ports-and-adapters, onion, and clean architecture are the
same rule with different diagrams — don't import the ceremony, import the
arrow direction. Small services may collapse to three files and still honor
the rule.

### CUPID (`cupid`)

**Plain words.** Properties of code that is a pleasure to work in: composable
(small surface, minimal hidden context), follows the platform's grain (uses the
language the way its community does), Unix-ish (one purpose per unit),
predictable (does what its shape suggests, no spooky action), idiomatic and
domain-named (the vocabulary of the business, not of the plumbing).

**Smells.** Functions demanding a giant context object "just in case". Java
written like C, Python written like Java. Names like `DataManagerHelperImpl`
that describe nothing. Surprising side effects on import or construction.

**Safe transforms.** Mostly renames and signature-narrowing, which are among
the safest moves available: type-aware rename toward domain vocabulary; shrink
parameter lists to what's used; replace framework-speak with business-speak in
public names via *parallel change*. Import-time side effects → wrap in an
explicit `start()`/factory and call it from the composition root.

### Unix philosophy (`unix`)

**Plain words.** Each program/module does one thing well, and its output is
shaped so another program can consume it. Compose small sharp tools instead of
growing one blunt one.

**Smells.** A CLI or job that parses, transforms, uploads, and emails in one
inseparable lump. Output formatted only for human eyes where machines need to
read it. Flags that switch a tool between unrelated personalities.

**Safe transforms.** *Extract* each stage into an independently callable unit
with data-in/data-out contracts; keep the original as the pipeline that
composes them (behavior identical, structure now separable). Split
"personality" flags into separate entry points sharing the extracted stages.

### Fail fast (`fail-fast`)

**Plain words.** When the code detects an impossible or invalid state, stop
loudly *right there* instead of soldiering on and corrupting data three calls
later. Distance between fault and failure is debugging cost.

**Smells.** `catch`-and-continue with a logged-and-forgotten error. Defaulting
bad input to zero/empty and proceeding. Deep functions re-checking what should
have been guaranteed at the boundary (defensive clutter is the mirror smell).

**Safe transforms — behavior caution.** Turning a silent continue into a loud
failure **changes behavior** — inside this skill you may only *centralize and
clarify* existing checks: hoist scattered validations to the boundary where the
data enters, replace repeated internal re-checks with a single validated type
(parse once, then trust the type), and make existing failure paths carry better
context. Where the code *should* fail but currently limps, record it in the
report for the review gate; do not change the outcome here.

### Principle of least astonishment (`least-astonishment`)

**Plain words.** Code should do what its name, shape, and position promise.
Every surprise a reader survives is borrowed time.

**Smells.** A function named `validate` that also saves. Parameters whose order
invites silent transposition (`(to, from)` anyone?). Overloaded operators or
magic methods doing heavy I/O. Two functions with the same name and different
contracts in sibling modules.

**Safe transforms.** Truth-in-naming renames (type-aware, all references move
together). Split misleading double-duty functions (see CQS). Replace positional
boolean/same-type parameter runs with named parameters or a small options type
via *parallel change*. Align sibling modules on one vocabulary — one concept,
one word, everywhere.

---

## Part 2 — Family-mapped principles

### Functional core, imperative shell (`functional-core`)

**Plain words.** Put every decision in pure functions (data in, data out, no
clock, no randomness, no I/O) and push every effect to a thin outer shell that
gathers inputs, calls the core, and executes the core's answers.

**Smells.** Business rules interleaved with awaits and DB calls so nothing is
testable without infrastructure. Functions that both compute and send. Hidden
reads of time/config/randomness deep inside logic.

**Safe transform sequence.** (1) Inside the mixed function, reorder statements
so reads happen first, decisions second, writes third — a pure reordering,
verified. (2) *Extract* the decision block into a pure function taking
everything it needs as parameters (time and randomness passed in as values).
(3) Make the original function the shell: gather → call core → apply effects.
(4) Where the core must *request* effects mid-flow, have it return a
description of what to do (a plain data value) and let the shell interpret it.
Each step is compile/test verified; the observable I/O sequence must not
change.

**Family notes.** Native grain for Haskell/OCaml/Elixir/Erlang/Clojure. On the
BEAM, the shell is typically a `GenServer` whose callbacks delegate instantly
to pure module functions. Applied to OO/imperative stacks it works well but is
an unconventional choice — expect more churn and say so in the decision window.

### Immutability & referential transparency (`immutability`)

**Plain words.** Values never change after creation — "changing" something
means making a new value. The same call with the same arguments always means
the same thing, so readers can substitute and reason freely.

**Smells.** Functions mutating their arguments as a side channel. Shared
objects edited from multiple places ("who changed this?" debugging). Defensive
copies sprinkled everywhere because nobody trusts anybody.

**Safe transforms.** Convert mutate-in-place helpers to return-new-value
functions one at a time: add the returning variant, switch callers, delete the
mutating one (*parallel change*). Freeze data shapes at boundaries (readonly
types, frozen objects, immutable collections). Localize unavoidable mutation:
a mutable accumulator confined inside one function body is fine — it's *shared*
mutation that hurts.

**Family notes.** In JS/TS, prefer `readonly` types and spread-updates;
mind performance only on measured hot paths. On the BEAM it's already the law;
the refactor is removing process-state misuse (ETS/process dictionary as a
mutable global).

### OTP supervision & actor boundaries (`otp`)

**Plain words.** On the BEAM, reliability comes from structure: isolated
processes own state, supervisors own restart policy, and unexpected errors
crash the process rather than being defensively absorbed — the supervisor
restores a known-good state.

**Smells.** Try/rescue wrapped around everything "just in case" (defensive
code doing a supervisor's job). One god-process holding unrelated state.
Processes spawned bare with `spawn/1` outside any supervision tree. Blocking
calls inside `init/1`. Raw message passing where a `GenServer`/`gen_statem`
contract belongs.

**Safe transforms.** Move bare processes under a supervisor with an explicit
restart strategy (*parallel change*: add supervised child spec, migrate
callers to the registered name, remove the bare spawn). Split a god-process
along state-ownership lines, one extracted process at a time. Replace
defensive rescue-everything with let-it-crash *only where a supervisor now
provably restores the same state* — otherwise record it for review, since
error behavior is observable. Keep callbacks thin; delegate to a pure core
(see `functional-core`).

### RAII / ownership discipline (`raii-ownership`)

**Plain words.** Every resource (memory, file, lock, socket) has exactly one
owner, and release is tied to the owner's scope ending — cleanup happens by
construction, not by remembering.

**Smells.** Paired `open`/`close` or `lock`/`unlock` calls separated by early
returns that skip the second half. Raw `new`/`delete` or `malloc`/`free` in
application code. Comments like "caller must free". Double-free and
use-after-free bug history. In Rust: `clone()` sprinkled to silence the borrow
checker, `Rc<RefCell<…>>` where a plain reference would do.

**Safe transforms.** Wrap each resource in a scope-bound guard type (C++:
`unique_ptr`, custom RAII wrapper, `lock_guard`; Rust: the owning type itself;
C: a create/destroy pair used through one owner function with `goto cleanup`
convergence). Introduce the wrapper alongside raw usage, migrate call sites
one at a time, then remove raw acquire/release. Clarify transfer-of-ownership
in signatures (by-value / `unique_ptr` param / documented sink) so the type
system carries the contract.

### Design by Contract (`design-by-contract`)

**Plain words.** Every routine publishes a deal: what it requires
(preconditions), what it guarantees (postconditions), and what always holds
(invariants). Callers meet the requirement; the routine delivers the promise;
blame is assignable at the boundary.

**Smells.** Comments saying "must not be null / must be sorted" enforced
nowhere. Every function re-validating what its caller validated. Invariants
maintained by folklore. In Ada/SPARK: contracts expressible in the language
left as prose.

**Safe transforms.** Make implicit contracts explicit *without changing
outcomes*: encode preconditions in types where possible (non-null types,
`NonEmptyList`, range types — parse at the boundary, trust thereafter), and
lift duplicated internal checks to the single entry boundary (removing
redundant checks is safe when a dominating check provably runs first). In Ada:
move prose contracts into `Pre =>` / `Post =>` aspects and type predicates —
with SPARK, run `gnatprove` to turn the contract into a proof. Adding *new*
enforced checks where none existed changes failure behavior — flag those for
the review gate instead of enabling them silently.

### Safety-subset discipline (`misra-safety`)

**Plain words.** For embedded and safety-critical C/C++: restrict the language
to a subset whose behavior is fully predictable — no dynamic allocation after
startup, bounded loops, every return value checked, no recursion, no
undefined-behavior corners.

**Smells.** `malloc` in the steady-state loop of a device. Loops whose bound
depends on unvalidated input. Ignored return codes from writes and sends.
Recursion in interrupt-adjacent code. Clever pointer arithmetic relying on UB.

**Safe transforms.** Replace steady-state allocation with pools or fixed
buffers sized at init (*parallel change*: allocate the pool, route one call
site at a time). Give every loop an explicit bound derived from a named
constant. Route ignored return codes into the *existing* error path — if there
is no error path, record it; inventing one changes behavior. Verify each step
with the cross-target build and static analyzer. **Heavyweight by design** —
reserve for genuinely safety/embedded contexts; applied to ordinary app code
it's ceremony (say so in the decision window).

### Data-oriented design (`data-oriented`)

**Plain words.** On hot paths, organize code around how data actually moves
through memory: contiguous arrays, fields grouped by access pattern, batch
transforms — because cache behavior, not instruction count, dominates.

**Smells (hot paths only).** An array of fat heap-allocated objects traversed
per-frame/per-tick touching two fields of each. Pointer-chasing graphs in inner
loops. Virtual dispatch per element in a million-element pass. Measured cache
misses, not vibes.

**Safe transforms.** *Measure first* — this principle without a profile is
premature. Then: split structure-of-arrays from array-of-structures behind the
existing API (keep the object facade, back it with columnar storage —
*parallel change* on the storage, not the interface); batch per-element virtual
calls into per-type loops (*branch-drain* in reverse: group by type once,
dispatch once). Re-run the benchmark and the tests: identical results, same or
better time. **Trade-off is explicit:** you spend abstraction to buy locality;
only worth it where the profile says so.

### 12-Factor app (`twelve-factor`)

**Plain words.** A deployable service keeps config in the environment, treats
logs as plain event streams, stays stateless between requests (state lives in
backing services), and declares its dependencies explicitly — so it can be
built once and run anywhere.

**Smells.** Hard-coded hostnames, ports, keys, or feature flags in source.
Per-environment `if (env === "prod")` forks in logic. Sessions or caches in
process memory that break on the second replica. Logs written to bespoke files
with bespoke rotation. "Works in staging" deploys.

**Safe transforms.** Config: introduce one config module that reads the
environment at startup and *defaults to the currently hard-coded values* —
route consumers to it one at a time (identical behavior until ops chooses to
override). Logs: swap bespoke file handling for stream output behind the
existing log call sites. In-process state: front it with the existing backing
store via a *seam*, keeping the in-memory path as the initial implementation,
so the cutover is an ops decision, not a silent behavior change.

### DDD tactical patterns (`ddd-tactical`)

**Plain words.** Make the business's own concepts the units of code: entities
(things with identity over time), value objects (things equal by value),
aggregates (a consistency boundary with one root that outsiders must go
through), repositories (collection-like access to aggregates), domain services
(operations that belong to no single entity). The team's spoken language and
the code's names converge.

**Smells.** Primitive obsession — money as `float`, email as `string`, ids as
naked `int`s passed in the wrong order. Anemic objects (bags of getters) with
all rules in "service" classes. Any code editing any table. Invariants like
"order total equals sum of lines" enforced in some call sites.

**Safe transforms.** Start with value objects — wrap a primitive in a typed
value with its validation and arithmetic, migrate signatures via *parallel
change* (the compiler finds every site). Then push behavior from service
classes into the entities that own the data (GRASP move). Then draw aggregate
boundaries: pick the invariant, make the root the only public mutator,
convert outside writers to go through the root one at a time. Repositories:
*seam* over existing data access, one per aggregate root.

**Family notes.** Strongest fit where the registry maps it: JVM/.NET codebases
with genuinely complex domains. **Overkill for CRUD** — a form-over-table app
gains nothing but ceremony; say so when it's chosen anyway.

### Component purity & unidirectional data flow (`component-purity`)

**Plain words.** UI components are functions of their inputs: same props/state,
same rendering. Data flows down; events flow up; a component never mutates
what it doesn't own. Effects are declared, scoped, and cleaned up.

**Smells.** Child components writing to objects received via props. Two
components fighting over the same DOM/state. Effects with wrong dependency
lists (stale reads, or destroy-and-recreate storms on every keystroke).
Derived data stored and manually synced instead of computed. Business rules
living inside render functions.

**Safe transforms.** Lift mutated-prop state to the owner and pass a callback
down (*parallel change*: add callback, switch the write, remove the mutation).
Replace stored-and-synced derived state with computation (memoized if
measured). Split "create once" from "update on change" effects. *Extract*
business rules out of components into pure functions/hooks the component
calls — the component becomes the shell (see `functional-core`).

**Family notes.** React, Vue, Svelte, and Flutter all reward the same shape:
presentational components with logic extracted to hooks/composables/stores;
one owner per piece of state.

### POSIX/CLI conventions (`posix-conventions`)

**Plain words.** Command-line tools behave the way forty years of users expect:
exit code 0 means success and non-zero means a specific failure; stdout carries
the *data*; stderr carries diagnostics and progress; flags parse conventionally;
the tool composes in a pipeline.

**Smells.** Errors printed to stdout, corrupting piped output. `exit 0` after a
failure (silently breaking `&&` chains and CI). Progress spinners written into
data streams. Prompts that hang when stdin isn't a TTY. Output that changes
shape when piped without documentation.

**Safe transforms — behavior caution.** Stream and exit-code fixes are
*observable* to scripts that already depend on the wrong behavior. Inside this
skill: restructure so the correction is one honest change — centralize output
through two writers (data → stdout, diagnostics → stderr) and centralize exit
through one path that maps error kinds to codes — then, if current routing is
wrong, record the wrongness for the review gate rather than silently flipping
it. Pure structure (one exit path, two writers, flag parsing through one
parser) is fair game now.

### Set-based thinking & normalization (`set-based-sql`)

**Plain words.** Databases answer questions about *sets*, not one row at a
time. Store each fact exactly once and derive the rest; express work as
declarative set operations and let the engine plan it.

**Smells.** Row-by-row loops in application code doing what one query could
(N+1 patterns, fetch-all-then-filter). Cursors/loops in SQL where a join or
window function serves. The same fact stored in two tables and reconciled by a
cron job. Copy-pasted query fragments differing by one predicate.

**Safe transforms.** N+1 → replace the per-row query with one set query
feeding the same in-memory shape (*extract* the loop body's data need, verify
identical result sets on real data before deleting the loop). Duplicate facts
→ pick the authoritative home, re-point readers via a view with the old shape
(*parallel change*), retire the copy when nothing writes it. Repeated
fragments → views or CTE-producing helpers. Always compare result sets, plans,
and row counts before/after — SQL refactors drift silently through NULL
handling and duplicate rows.

### Reproducibility & purity (`reproducibility`)

**Plain words.** For Nix and infrastructure code: the same inputs must produce
the same system, every time, on every machine. No build step may depend on
anything undeclared — no network fetches without pinned hashes, no reading the
host's mutable state, no "works on my machine".

**Smells.** Unpinned channels or floating branch references. `builtins.fetch*`
without a hash. Environment variables or absolute host paths leaking into
builds. Copy-pasted derivation boilerplate. `--impure` as a habit.
Configuration drift between "identical" hosts.

**Safe transforms.** Pin every input (flake inputs with locked revisions;
hashes on every fetch) — the lock file makes "identical output" checkable.
Factor copy-pasted derivations into functions/overlays/modules, verifying the
built output hash is unchanged after each factoring (Nix gives you the
strongest verify step in this whole file: identical store paths = identical
behavior). Hoist impurities to explicitly-declared inputs.

---

## Choosing well in the decision window

- The **agnostic baseline** is almost always worth accepting whole — its
  principles are cheap to check and safe to apply anywhere.
- **Family-mapped** principles are recommended because they match the stack's
  grain; skipping one is fine, but say why in the record.
- **Off-family combinations** are legitimate tools (functional-core on a C#
  service is often excellent) — the requirement is *informed* choice: quote the
  registry's `risks` line, add the caution notes above, get one confirmation,
  record it.
- When two chosen principles pull in opposite directions (data-oriented vs.
  deep encapsulation; DDD richness vs. KISS), the tie-breaker is the smell you
  can actually point to at a `file:line` — principles serve findings, not the
  other way around.
