#!/usr/bin/env node
/**
 * refactor-auth-hardening — checklist printer.
 * Zero-dependency. Prints the auth-hardening checklist this skill applies to
 * EXISTING auth, as JSON. It reminds and classifies; it does NOT read code,
 * run the app, or edit anything. This skill is CONDITIONAL: it only runs when
 * auth code is detected.
 *
 * Usage:
 *   node checklist.mjs                # pretty JSON to stdout
 *   node checklist.mjs --ndjson       # one item per line
 *   node checklist.mjs --count        # number of items only
 *   node checklist.mjs --detect       # print the activation-gate reminder
 *
 * Each item: { id, area, question, safeSwap, userVisible }
 */

const PHASE = "secure";

// The activation gate: this skill does nothing unless auth already exists.
const DETECT = {
  gate: "auth code must be present — otherwise STOP and return to the lane",
  depSignals: ["better-auth", "@auth0/*", "next-auth", "passport"],
  pathSignals: ["auth", "login", "session", "oauth", "jwt"],
  onFalse: "report 'no authentication code detected — nothing to harden' and do nothing",
  neverDo: "never add a new auth system where none exists",
};

const CHECKLIST = [
  {
    id: "AUTH-01",
    area: "Session fixation / rotation",
    question: "Is the session id regenerated on login (and other privilege changes)?",
    safeSwap: "regenerate the session id inside the successful-login handler, copying session data across",
    userVisible: false,
  },
  {
    id: "AUTH-02",
    area: "Token storage (web)",
    question: "Are tokens kept out of localStorage/sessionStorage (HttpOnly cookie, or access-in-memory + refresh-in-HttpOnly-cookie)?",
    safeSwap: "move token to an HttpOnly+Secure+SameSite cookie; keep old read one step as fallback; then remove the web-storage write",
    userVisible: false,
  },
  {
    id: "AUTH-03",
    area: "Cookie flags",
    question: "Do all auth/session cookies carry HttpOnly, Secure, and SameSite (Lax/Strict), scoped narrowly?",
    safeSwap: "add the flags on set-cookie; verify auth still works",
    userVisible: true,
  },
  {
    id: "AUTH-04",
    area: "OAuth/OIDC PKCE + params",
    question: "Do public clients use authorization-code + PKCE (not implicit), with state and nonce verified and an exact redirect-URI allow-list?",
    safeSwap: "stand up code+PKCE alongside; point login at it; verify same landing; remove implicit path",
    userVisible: false,
  },
  {
    id: "AUTH-05",
    area: "JWT verification",
    question: "Are tokens verified with a checked signature (reject alg:none) plus exp/nbf/iss/aud, with no secrets/PII in the payload?",
    safeSwap: "replace unverified decode with full verify; shorten lifetime; add refresh rotation",
    userVisible: false,
  },
  {
    id: "AUTH-06",
    area: "MFA / step-up (advisory)",
    question: "If the provider supports MFA and the app has sensitive actions, is step-up auth available?",
    safeSwap: "note the option; enable only with user consent (changes user behavior)",
    userVisible: true,
  },
  {
    id: "AUTH-07",
    area: "Logout & invalidation",
    question: "Does logout invalidate the server session and clear the cookie, with revocable refresh tokens?",
    safeSwap: "invalidate server-side on logout; clear cookie; revoke refresh token",
    userVisible: false,
  },
  {
    id: "AUTH-08",
    area: "Mobile secure storage",
    question: "Are tokens in the iOS Keychain / Android Keystore (not UserDefaults / plain SharedPreferences), with a PKCE web-auth flow?",
    safeSwap: "write to secure store; one-time migrate from old location; verify auto-sign-in persists",
    userVisible: false,
  },
  {
    id: "AUTH-09",
    area: "Hosted / ACUL login",
    question: "For Auth0-style setups, is login hosted (universal login / ACUL) rather than an embedded credential form?",
    safeSwap: "move to hosted login; CONFIRM first (redirect target changes, can log users out)",
    userVisible: true,
  },
  {
    id: "AUTH-10",
    area: "Secrets out of the diff",
    question: "Are client secrets/keys in env/secret stores (not inline), with no client secret embedded in a public client?",
    safeSwap: "move secret to env/secret store; redact when reporting",
    userVisible: false,
  },
];

const argv = process.argv.slice(2);

if (argv.includes("--detect")) {
  process.stdout.write(JSON.stringify({ skill: "refactor-auth-hardening", phase: PHASE, conditional: true, detect: DETECT }, null, 2) + "\n");
} else if (argv.includes("--count")) {
  process.stdout.write(String(CHECKLIST.length) + "\n");
} else if (argv.includes("--ndjson")) {
  for (const it of CHECKLIST) process.stdout.write(JSON.stringify(it) + "\n");
} else {
  const payload = {
    skill: "refactor-auth-hardening",
    phase: PHASE,
    conditional: true,
    activation: "only when auth code is detected; never adds a new auth system",
    preservesBehavior: true,
    detect: DETECT,
    items: CHECKLIST,
  };
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}
