# refactor-chain v4.1.0

A point release on top of v4.0.0 (generic backend lane + principle-driven engine).

## Added
- **spec-kit Mode 2 — Co-author.** Spec-kit projects can now run in any of three modes, chosen per run at a mid-chat checkpoint:
  - **Integrate** — spec is the source of truth; code conforms to it.
  - **Co-author** — spec and code evolve together; conflicts are three-way decisions and approved spec amendments sync back into `.specify/`.
  - **Adopt** — the chain drives the spec-kit flow end to end.
- Prominent author credit at the top of the README.

## Fixed
- GitHub Action usage examples said `@v3` after the v4 rename — now `@v4`, with a moving `v4` major tag published so the reference resolves.

## Install
```sh
curl -fsSL https://raw.githubusercontent.com/ahmedbenaw/refactor-chain/main/install.sh | sh
```

—
Ahmed "Ben" Zayed · Head of Products & Ventures at ZAT.VC [Venture Partner]
