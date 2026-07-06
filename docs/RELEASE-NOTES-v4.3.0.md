# refactor-chain v4.3.0

The discipline pack graduates from documented contracts to **harness-enforced gates** — and its spec-kit behavior is fully specified.

## Added
- **plan-gate blocks baseline** — no safety net until a written mini-plan exists.
- **adversarial-verify gates advance** — a step cannot be marked done until its "it worked" claim survived the attack pass (`advance --delta legal --adversarial`).
- **scope-fence hard-flags drift into `state.notes`** — out-of-scope edits are durably recorded, not just surfaced as a message.
- **spec-kit × discipline matrix** — every discipline skill's behavior is specified across Integrate / Co-author / Adopt; the behavior-preservation baseline stays the non-negotiable floor in all three.

All enforcement is additive and reversible: clear, actionable block messages with inline escape hatches (e.g. `baseline --plan-note "..."`), and the documented contracts remain.

## Install
```sh
curl -fsSL https://raw.githubusercontent.com/ahmedbenaw/refactor-chain/main/install.sh | sh
```

—
Ahmed "Ben" Zayed · Head of Products & Ventures at ZAT.VC [Venture Partner]
