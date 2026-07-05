// Dependency-free flat config: ESLint core rules only (run: npx --yes eslint .).
// Guards the invariants this zero-dep codebase actually relies on.
export default [
  {
    files: ["**/*.mjs", "**/*.js"],
    ignores: ["installer/go/**"],
    languageOptions: { ecmaVersion: 2023, sourceType: "module" },
    rules: {
      "no-undef": "off",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }],
      "no-fallthrough": "error",
      "no-dupe-keys": "error",
      "no-unreachable": "error",
      "eqeqeq": ["error", "smart"],
      "no-var": "error",
      "prefer-const": "error",
    },
  },
];
