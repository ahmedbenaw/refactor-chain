#!/usr/bin/env node
/**
 * refactor-security — checklist printer.
 * Zero-dependency. Prints the static OWASP-Top-10 audit checklist this skill
 * walks over a refactor diff, as JSON. It classifies and reminds; it does NOT
 * read code, run the app, or edit anything.
 *
 * Usage:
 *   node checklist.mjs                # pretty JSON to stdout
 *   node checklist.mjs --ndjson       # one item per line
 *   node checklist.mjs --count        # number of items only
 *
 * Each item: { id, category, phase, question, sinks, cwe, rankHint }
 */

const PHASE = "secure";

const CHECKLIST = [
  {
    id: "SEC-01",
    category: "Injection",
    question:
      "Does any untrusted input reach a SQL/NoSQL/OS-command/template/header sink without parameterization or escaping? Did the refactor turn a parameterized query into a string-built one?",
    sinks: ["string-concatenated queries", "raw()/whereRaw()", "shell-spawning exec", "runtime template compile", "unescaped response headers/logs"],
    cwe: ["CWE-89", "CWE-78", "CWE-90", "CWE-943", "CWE-917"],
    rankHint: "Blocker",
  },
  {
    id: "SEC-02",
    category: "Broken auth & session",
    question:
      "Did the refactor move, drop, or duplicate an auth/session check so an endpoint is reachable without its guard? Any session-fixation, missing-expiry, or unsigned/alg:none JWT?",
    sinks: ["relocated auth middleware", "no session rotation on login", "JWT verified without signature", "== on secrets"],
    cwe: ["CWE-287", "CWE-384", "CWE-613"],
    rankHint: "Blocker",
  },
  {
    id: "SEC-03",
    category: "Secrets & credentials in code",
    question:
      "Are any API keys, passwords, private keys, or connection strings hard-coded in the diff (especially a value that used to come from an env var)?",
    sinks: ["inline API/cloud keys", "PEM private-key blocks", "password/token literals", "committed .env values"],
    cwe: ["CWE-798", "CWE-259"],
    rankHint: "Blocker",
  },
  {
    id: "SEC-04",
    category: "Weak / broken crypto",
    question:
      "Any weak hash/cipher, ECB/static-IV, non-CSPRNG randomness for tokens/salts, or disabled TLS verification introduced?",
    sinks: ["MD5/SHA1 for security", "DES/3DES/RC4/ECB", "non-CSPRNG token/salt", "TLS verify disabled"],
    cwe: ["CWE-327", "CWE-330", "CWE-326", "CWE-295"],
    rankHint: "Worth-fixing",
  },
  {
    id: "SEC-05",
    category: "Sensitive data / PII exposure",
    question:
      "Does the diff log or return PII/secrets, send stack traces to the client, or broaden a response (e.g. SELECT * incl. password hash)?",
    sinks: ["PII/secret in logs", "err.stack to client", "over-broad API response"],
    cwe: ["CWE-200", "CWE-532", "CWE-209"],
    rankHint: "Worth-fixing",
  },
  {
    id: "SEC-06",
    category: "Unsafe deserialization",
    question:
      "Is untrusted data deserialized through an unsafe path (native deserialization / full-YAML-load / eval / .NET binary formatter)?",
    sinks: ["native object deserialization", "YAML full-load", "eval/Function/vm on input", "binary formatter"],
    cwe: ["CWE-502"],
    rankHint: "Blocker",
  },
  {
    id: "SEC-07",
    category: "SSRF / CORS / CSP / CSRF",
    question:
      "Does a server-side request use a user-controlled URL without an allow-list? Is CORS wildcard-with-credentials or reflecting Origin? Missing CSP/CSRF on new pages/endpoints?",
    sinks: ["server fetch of user URL", "ACAO:* with credentials", "reflected Origin", "no CSRF on state change"],
    cwe: ["CWE-918", "CWE-942", "CWE-352"],
    rankHint: "Worth-fixing",
  },
  {
    id: "SEC-08",
    category: "Broken access control / authz",
    question:
      "Is a new endpoint authenticated but not authorized (any logged-in user can act on another user's object — IDOR)? Object referenced by user id without an ownership check?",
    sinks: ["missing ownership check", "user-supplied id -> direct object access"],
    cwe: ["CWE-639", "CWE-285"],
    rankHint: "Blocker",
  },
  {
    id: "SEC-09",
    category: "Security misconfiguration",
    question:
      "Debug mode on, verbose errors, default creds, disabled security middleware, 0.0.0.0 bind, or permissive permissions added?",
    sinks: ["debug=true", "helmet/security middleware removed", "0.0.0.0 bind", "default credentials"],
    cwe: ["CWE-16"],
    rankHint: "Worth-fixing",
  },
  {
    id: "SEC-10",
    category: "Vulnerable / outdated dependencies",
    question:
      "Does the diff add or bump a dependency to a version with a known CVE, or add a typosquat-looking package? (Recommend npm audit / pip-audit as the runtime follow-up.)",
    sinks: ["dependency bump to CVE version", "new dependency, unaudited", "typosquat name"],
    cwe: ["CWE-1104", "CWE-1035"],
    rankHint: "Worth-fixing",
  },
];

const argv = process.argv.slice(2);
const payload = {
  skill: "refactor-security",
  phase: PHASE,
  mode: "static, read-only, advisory",
  ranks: ["Blocker", "Worth-fixing", "Optional"],
  confidenceLevels: ["high", "medium", "low"],
  items: CHECKLIST,
};

if (argv.includes("--count")) {
  process.stdout.write(String(CHECKLIST.length) + "\n");
} else if (argv.includes("--ndjson")) {
  for (const it of CHECKLIST) process.stdout.write(JSON.stringify(it) + "\n");
} else {
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}
