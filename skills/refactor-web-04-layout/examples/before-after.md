# Worked example — bringing a drawer page up to standard

A Vue 3 project (the same reasoning applies in React/Svelte/Angular — see
`references/method.md` §3). The audit found four findings in one file; here is the file
before, the report, and the file after.

## Before — `src/views/invoice/InvoiceEditDrawer.vue`

```vue
<template>
  <a-drawer :width="1100" :mask="true" :mask-closable="true" title="Edit invoice">
    <div class="drawer-body">
      <div class="actions">
        <a-button type="primary" @click="save">Save</a-button>
        <a-button @click="openHistory">History</a-button>
      </div>
      <div class="fields"><!-- two-column form, ~40 rows --></div>
    </div>
  </a-drawer>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue';
function save() {
  // ...persist...
  Modal.info({ title: 'Saved', content: 'The invoice was saved.' });
}
function openHistory() {
  // opens a FULL-SCREEN history subpage from inside a drawer
  router.push({ name: 'invoice-history-fullscreen' });
}
</script>

<style scoped>
.drawer-body { height: 100%; overflow-y: auto; }
.actions { margin-bottom: 13px; }
</style>
```

## Audit report (excerpt)

| Rule | Severity | Finding | Fix |
|---|---|---|---|
| LAY-01 | ERROR | Drawer opens a full-screen subpage (`openHistory`) — heavier than its host surface. | Show history in an equal-weight surface: a second drawer or a dialog. |
| LAY-05 | WARNING | `:width="1100"` is a literal and exceeds half a 1920-wide viewport on smaller screens; editing drawer allows outside-click close. | Bind width to the wide-drawer token; keep the backdrop but set `mask-closable` false. |
| LAY-06 | ERROR | The whole `drawer-body` scrolls, so the Save/History actions scroll away. | Column flex: actions `flex-shrink: 0`, fields `flex: 1; overflow-y: auto`. |
| INT-03 | ERROR | `Modal.info` blocks the user to announce a success. | Non-blocking success toast that auto-dismisses. |
| LAY-09 | SUGGESTION | `margin-bottom: 13px` sits outside the spacing scale. | Use the spacing token step. |

## After

```vue
<template>
  <a-drawer
    :width="tokens.drawerWide"
    :mask="true"
    :mask-closable="false"
    title="Edit invoice"
  >
    <div class="invoice-drawer">
      <div class="invoice-drawer__actions">
        <a-button type="primary" @click="save">Save</a-button>
        <a-button @click="openHistory">History</a-button>
      </div>
      <div class="invoice-drawer__fields"><!-- unchanged form --></div>
    </div>
  </a-drawer>
  <a-drawer v-model:open="historyOpen" :width="tokens.drawerNarrow" :mask="false"
            title="Change history"><!-- read-only history list --></a-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { tokens } from '@/theme/tokens'; // resolves CSS custom properties

const historyOpen = ref(false);
function save() {
  // ...persist (unchanged)...
  message.success('Invoice saved'); // auto-dismisses; failure paths use message.error (sticky)
}
function openHistory() {
  historyOpen.value = true; // drawer -> drawer: equal weight, hierarchy holds
}
</script>

<style scoped>
.invoice-drawer { display: flex; flex-direction: column; height: 100%; }
.invoice-drawer__actions { flex-shrink: 0; margin-bottom: var(--space-4); }
.invoice-drawer__fields { flex: 1; overflow-y: auto; }
</style>
```

## Why this is a pass

- **Behavior preserved:** the same data is edited, saved, and browsable — only surface
  weight, sizing source, scroll structure, and notification style changed.
- **LAY-01:** history now opens in a *narrower, read-only* drawer (no backdrop — the edit
  context stays visible), never a heavier surface.
- **LAY-05/06:** widths come from tokens; actions stay pinned while the form scrolls;
  unsaved input is protected from stray outside clicks.
- **INT-03:** success announces itself and gets out of the way; only failures persist.
- Re-running the audit reports zero ERROR findings for this file, which is what the
  harness verify gate records before the lane advances.
