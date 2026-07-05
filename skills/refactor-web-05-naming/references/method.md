# Front-end naming — the eight rule categories in full

Severities: **ERROR** (breaks tooling or contradicts the framework), **WARNING** (inconsistent with the project's own convention), **SUGGESTION** (taste, flagged once).

## NAME-01 · Components
Multi-word PascalCase names that match their file (`InvoiceTable` in `InvoiceTable.(tsx|vue|svelte)` or the framework's file convention). Single-word component names are reserved by HTML in several frameworks → ERROR. Shared primitives keep the project's chosen prefix (`Base`/`App`/`Ui`) once detected — enforce the detected one, never introduce a new one.

## NAME-02 · Files & directories
Non-component files and directories are kebab-case (`table-data.ts`, `date-utils/`). Framework component-file conventions win where they differ (Angular's role-suffixed `invoice-table.component.ts`; Next.js route files). One convention per project — mixed casing in the same directory is a WARNING on every odd one out.

## NAME-03 · Variables & functions
camelCase for values and functions; UPPER_SNAKE_CASE for true constants; PascalCase for types/classes/enums; booleans read as questions (`is/has/can/should` prefixes). Abbreviations only when the project already uses them consistently.

## NAME-04 · Style classes
Detect the project's convention first — BEM (`block__element--modifier`), CSS Modules (camelCase keys), or utility classes — and enforce *that*. Introducing a second convention is an ERROR; drifting within the detected one is a WARNING.

## NAME-05 · Event handlers
Handler functions are `handle`-prefixed (`handleSubmit`); callback props are `on`-prefixed (`onSubmit`). Framework event-name casing is respected (React camelCase props; Vue emitted events kebab-case in templates; Svelte `on:event`).

## NAME-06 · User-facing labels
Short, business-worded, sibling-consistent (all buttons in a group share grammatical form). Placeholder text is not a label. SUGGESTION tier unless a label contradicts its action (then WARNING).

## NAME-07 · Workflow / menu nodes
Verb-object for actions ("Approve invoice"), role-based nouns for destinations ("Invoices"). Consistent depth naming within a menu tree.

## NAME-08 · Props & contract types
`ComponentName` + `Props` / `Emits` / `Slots` typed contracts; every public prop typed; prop names follow NAME-03 rules; no abbreviations in public contracts.

## Dialect detection (run before any check)
Sample up to 40 representative files. Record: component-file casing in use, shared-primitive prefix, style convention, handler prefixes already present, dominant variable casing. The project's own established choice ALWAYS beats the defaults above — these rules fill gaps, they don't fight incumbents.

## Rename-propagation protocol
1. Build the rename map (old → new per symbol/file/class).
2. Enumerate the propagation set: import/export paths, template/JSX usages, component registrations, style selectors, route/config strings, tests, storybook/docs references.
3. Show the plan; explicit approval required for any batch.
4. Apply atomically per rename (language-server rename where available; else edit all references together).
5. Prove zero survivors: `grep -r "<old-name>"` must return only intentional mentions (e.g. CHANGELOG).
6. Build/typecheck + test after each batch; a red result rolls the batch back.
