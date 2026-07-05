# Permissions — <project name>

> Last synced by refactor-chain: <date> · lane `<lane>` · changed guards: <list>
> ⚠️ Any permission that CHANGED (not just moved) is also logged in the audit trail.

## Roles
| Role | Description |
|---|---|
| `<role>` | <who they are / what they can do> |

## Guarded routes & actions
| Route / action | Required role(s) | Guard location | Changed this refactor? |
|---|---|---|---|
| `<method> <path>` | `<role>` | `<middleware/guard path>` | moved / changed / no |
| `<action>` | `<role>` | `<guard path>` | no |

## Permission model notes
<How auth/roles are enforced (middleware, decorators, policy objects). Human prose — preserve.>

## Refactor delta (this run)
- Guards **relocated** (behavior identical): <list, or "none">
- Guards **changed** (behavior differs — audit-logged): <list, or "none">
