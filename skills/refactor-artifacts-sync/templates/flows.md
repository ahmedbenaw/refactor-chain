# Flows — <project name>

> Last synced by refactor-chain: <date> · lane `<lane>` · changed flows: <list>

Each flow describes an end-to-end user or data journey and the code it routes through.
Refactor sync updates the code references; the flow's intent stays.

## Flow: <name, e.g. "User login">
**Trigger:** <what starts it>
**Steps:**
1. <actor/UI> → `<entry file/route>`
2. → `<service/handler path>`
3. → `<data/persistence path>`
4. → <result / response>

**Key files:** `<path>`, `<path>`
**Notes:** <edge cases, error paths — human prose, preserve>

---

## Flow: <name>
**Trigger:** <…>
**Steps:**
1. <…>

**Key files:** `<…>`

---

<Repeat per critical flow. After a refactor, only re-point moved/renamed references.>
