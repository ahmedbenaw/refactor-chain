# Per-family formatter/linter scaffolds

Pick the block matching the detected family (from `scripts/lib/languages.mjs`), fill the
values from the guidelines manifest, and land it through the normal checkpoint→apply→verify
loop. Always mirror the OBSERVED convention — a config that fights the codebase fails the eval.

## Universal (every project)
`.editorconfig`
```ini
root = true
[*]
indent_style = <space|tab>
indent_size = <2|4>
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
```

## JS/TS (Node, Bun, Deno, browsers)
`.prettierrc.json` — `{ "singleQuote": <true|false>, "semi": <true|false>, "printWidth": <observed> }`
`eslint.config.js` — start from `@eslint/js` recommended; add the project's framework plugin only if already a dependency.

## JVM (Java, Kotlin, Scala)
Spotless (Maven/Gradle plugin) with `googleJavaFormat()` or the project's existing style XML; Checkstyle only if one is already present.

## Python
`pyproject.toml` → `[tool.ruff]` with `line-length = <observed>`; `ruff format` replaces black+isort in one tool.

## Go / Rust / Zig
Built-in formatters are the convention: `gofmt`/`go vet`, `cargo fmt`/`cargo clippy -D warnings`, `zig fmt`. Add nothing else unless the repo already does.

## BEAM (Elixir, Erlang)
`.formatter.exs` (mix format) / `rebar3 fmt`. Credo only if already a dep.

## C / C++ / Embedded
`.clang-format` seeded from the dominant observed style (`clang-format --style=file:...`); `.clang-tidy` with the checks the codebase already passes — tighten later, per gap report.

## .NET / C#
`.editorconfig` with `dotnet_diagnostic` severities; `dotnet format` in CI.

## Ruby / PHP
`.rubocop.yml` (start with `NewCops: disable`, codify observed style) / `php-cs-fixer` with `@PSR12` only if the repo is already PSR-ish.

## Shell
ShellCheck in CI (`shellcheck **/*.sh`); shfmt with the observed indent.
