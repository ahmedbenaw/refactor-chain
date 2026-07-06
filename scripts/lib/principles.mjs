/**
 * refactor-chain — software-engineering principles registry.
 * Consumed by refactor-code-principles (principle-driven structural engine) and the
 * plan-phase decision window: the user sees the recommended set for their
 * detected stack and chooses — accept, mix-and-match, or deliberately apply an
 * unconventional combination (risks stated plainly).
 *
 * Schema: { id, name, appliesTo: "agnostic" | [families/language ids],
 *           pitch (one plain-language line), risks? (when applied off-family) }
 */
export const PRINCIPLES = [
  // ── Agnostic baseline (work with everything) ─────────────────────────────
  { id: "solid", name: "SOLID", appliesTo: "agnostic",
    pitch: "Five habits that keep classes/modules easy to change: one job each, extend don't rewrite, keep substitutes honest, small interfaces, depend on abstractions." },
  { id: "grasp", name: "GRASP", appliesTo: "agnostic",
    pitch: "Assign each responsibility to the thing that has the information to do it — ownership lands where the knowledge lives." },
  { id: "dry-kiss-yagni", name: "DRY · KISS · YAGNI", appliesTo: "agnostic",
    pitch: "Say it once, keep it simple, and don't build what nobody asked for." },
  { id: "separation-of-concerns", name: "Separation of concerns", appliesTo: "agnostic",
    pitch: "Different jobs live in different places — mixing them is how code gets scary to touch." },
  { id: "cohesion-coupling", name: "High cohesion, low coupling", appliesTo: "agnostic",
    pitch: "Things that change together live together; things that don't, barely know each other." },
  { id: "law-of-demeter", name: "Law of Demeter", appliesTo: "agnostic",
    pitch: "Talk to your friends, not your friends' friends — long dot-chains are a coupling smell." },
  { id: "composition-over-inheritance", name: "Composition over inheritance", appliesTo: "agnostic",
    pitch: "Assemble behavior from parts instead of deep family trees." },
  { id: "cqs", name: "Command–Query Separation", appliesTo: "agnostic",
    pitch: "A function either answers a question or changes something — never both secretly." },
  { id: "layering", name: "Dependency-rule layering (Clean / Hexagonal / Onion)", appliesTo: "agnostic",
    pitch: "Dependencies point inward: business rules never know about the database, the web, or the UI." },
  { id: "cupid", name: "CUPID", appliesTo: "agnostic",
    pitch: "Joyful-to-work-with code: composable, follows the platform's grain, unix-ish, predictable, idiomatic, domain-named." },
  { id: "unix", name: "Unix philosophy", appliesTo: "agnostic",
    pitch: "Do one thing well; make outputs another program's inputs." },
  { id: "fail-fast", name: "Fail fast", appliesTo: "agnostic",
    pitch: "Blow up loudly at the first sign of a bad state instead of limping into corrupt data." },
  { id: "least-astonishment", name: "Principle of least astonishment", appliesTo: "agnostic",
    pitch: "Code should do what its name and shape promise — surprises are bugs waiting to be filed." },
  // ── Family-mapped ────────────────────────────────────────────────────────
  { id: "functional-core", name: "Functional core, imperative shell", appliesTo: ["functional", "beam", "scala", "elixir", "erlang", "haskell", "ocaml", "lisp"],
    pitch: "Pure logic in the middle, side effects pushed to the edges — the core becomes trivially testable.",
    risks: "Applied to OO/imperative stacks it's a powerful but unfamiliar discipline — expect more refactoring churn up front." },
  { id: "immutability", name: "Immutability & referential transparency", appliesTo: ["functional", "beam", "js"],
    pitch: "Values don't change under you; the same call always means the same thing." },
  { id: "otp", name: "OTP supervision & actor boundaries", appliesTo: ["beam"],
    pitch: "Let processes crash and supervisors restart them — reliability by design, not by defensive code." },
  { id: "raii-ownership", name: "RAII / ownership discipline", appliesTo: ["systems", "cpp", "rust"],
    pitch: "Whoever creates a resource owns freeing it, enforced by scope — leaks and double-frees stop being possible." },
  { id: "design-by-contract", name: "Design by Contract", appliesTo: ["ada", "systems"],
    pitch: "Every routine states what it requires and guarantees — with Ada/SPARK the compiler can even prove it." },
  { id: "misra-safety", name: "Safety-subset discipline (MISRA-style)", appliesTo: ["c", "cpp"],
    pitch: "For embedded/safety code: no dynamic allocation after init, bounded loops, every return checked.",
    risks: "Heavyweight for ordinary application code — reserve for safety/embedded contexts." },
  { id: "data-oriented", name: "Data-oriented design", appliesTo: ["systems", "c", "cpp", "zig", "rust"],
    pitch: "Organize code around how data actually flows through memory — the CPU thanks you.",
    risks: "Trades abstraction niceties for performance; only worth it on genuinely hot paths." },
  { id: "twelve-factor", name: "12-Factor app", appliesTo: ["scripting", "jvm", "js", "dotnet", "beam", "go"],
    pitch: "Config in the environment, logs as streams, stateless processes — services that deploy anywhere." },
  { id: "ddd-tactical", name: "DDD tactical patterns", appliesTo: ["jvm", "dotnet", "java", "csharp"],
    pitch: "Entities, value objects, aggregates, repositories — the domain's language becomes the code's structure.",
    risks: "Overkill for CRUD apps; earns its weight when the domain itself is complex." },
  { id: "component-purity", name: "Component purity & unidirectional data flow", appliesTo: ["js", "dart"],
    pitch: "UI components render from props/state and never mutate what they don't own; data flows one way." },
  { id: "posix-conventions", name: "POSIX/CLI conventions", appliesTo: ["shell", "scripting"],
    pitch: "Exit codes mean things, stdout is data, stderr is diagnostics, flags behave like everyone expects." },
  { id: "set-based-sql", name: "Set-based thinking & normalization", appliesTo: ["sql", "data"],
    pitch: "Think in sets, not loops; store each fact once and derive the rest." },
  { id: "reproducibility", name: "Reproducibility & purity", appliesTo: ["nix", "infra"],
    pitch: "Same inputs, same build, every time, on every machine." },
];

/** Recommend a principle set for detected language families/ids. */
export function recommendPrinciples(detected /* array of {id, family} */) {
  const keys = new Set();
  for (const d of detected || []) { keys.add(d.id); keys.add(d.family); }
  const agnostic = PRINCIPLES.filter((p) => p.appliesTo === "agnostic");
  const mapped = PRINCIPLES.filter((p) => Array.isArray(p.appliesTo) && p.appliesTo.some((k) => keys.has(k)));
  const other = PRINCIPLES.filter((p) => Array.isArray(p.appliesTo) && !p.appliesTo.some((k) => keys.has(k)));
  return { recommended: [...agnostic.map((p) => p.id), ...mapped.map((p) => p.id)], agnostic, mapped, other };
}
