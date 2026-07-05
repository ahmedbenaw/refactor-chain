# Worked examples — adopting shadcn/ui components

## Example 1 — bespoke button → shadcn `Button`

### Before
Five slightly-different hand-rolled buttons across the app. This one:
```tsx
// PrimaryButton.tsx — bespoke
export function PrimaryButton({ onClick, disabled, loading, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center gap-2 rounded-md bg-[#3b82f6] px-4 py-2
                 text-white font-medium hover:bg-[#2f6fe0] disabled:opacity-50"
    >
      {loading && <span className="animate-spin">◌</span>}
      {children}
    </button>
  );
}
```
Problems: hardcoded hex (not tokens), duplicated four more times with drift, no shared
focus-ring, no variant system.

### After
Adopt shadcn `Button`; theme it to tokens; compose the loading state.
```tsx
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// call site — behavior identical (onClick, disabled, loading, primary look)
<Button onClick={onClick} disabled={disabled || loading}>
  {loading && <Loader2 className="animate-spin" />}
  {children}
</Button>
```
`--primary` / `--primary-foreground` / `--ring` / `--radius` are mapped to the project's
`--color-primary` / `--color-on-primary` / `--radius-md` (see theme mapping), so it renders
in the app's blue — not shadcn's default. The four other bespoke buttons collapse to
`variant="secondary|outline|ghost|destructive"`. `PrimaryButton.tsx` is deleted.

**Prop/behavior map:** `onClick→onClick`, `disabled→disabled`, `loading→composed`,
`primary→variant="default"`. Same clicks, same disabled semantics, plus a real focus ring.

---

## Example 2 — div-modal → shadcn `Dialog`

### Before
A homemade modal with a hand-rolled focus trap, ESC handler, and overlay-click close.
```tsx
function ConfirmModal({ isOpen, onClose, onConfirm }) {
  useEffect(() => {                                  // hand-rolled ESC + focus trap
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50" onClick={onClose}>       {/* overlay */}
      <div role="dialog" className="..." onClick={(e) => e.stopPropagation()}>
        <h2>Delete item?</h2>
        <button onClick={onClose}>Cancel</button>
        <button onClick={onConfirm}>Delete</button>
      </div>
    </div>
  );
}
```
Problems: focus trap is incomplete, no `aria-labelledby`, overlay/ESC logic reinvented,
buttons are bespoke.

### After
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function ConfirmModal({ isOpen, onClose, onConfirm }) {
  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Delete item?</DialogTitle></DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```
**Prop/behavior map:** `isOpen→open`, `onClose→onOpenChange(false)`; ESC, overlay-click,
focus trap, and `aria-labelledby` (via `DialogTitle`) are now built-in — the hand-rolled
`useEffect` is deleted. Same open/close triggers, same confirm action.

---

## Why this is better
- **One source of truth per primitive** — five buttons become one `Button` with variants.
- **Registry components ship focus/keyboard/ARIA** — deletes reinvented (and often buggy) trap/ESC code.
- **Themed to the project's tokens**, so the app looks like itself, not like a shadcn demo.
- **Behavior preserved** via explicit prop/behavior maps — no user-visible change in what things do.
- **Accessibility improves for free**, and refactor-ui-a11y still verifies it downstream.
