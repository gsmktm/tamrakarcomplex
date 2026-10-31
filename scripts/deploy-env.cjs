"use strict";

// Vite's publishable build configuration is validated, never logged.
const REQUIRED_KEYS = Object.freeze([
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
]);

function resolveBuildEnvironment(buildEnv = {}, fileEnv = {}) {
  // An explicitly supplied build environment must be complete. Never
  // silently fill missing values from a potentially unrelated local file.
  const hasBuildEnv = REQUIRED_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(buildEnv, key),
  );
  const source = hasBuildEnv ? buildEnv : fileEnv;
  const missing = REQUIRED_KEYS.filter((key) => {
    const value = source[key];
    return typeof value !== "string" ||
      !value.trim() ||
      /your-|replace|example|<|>/i.test(value);
  });
  return { source: hasBuildEnv ? "environment" : "file", missing };
}

module.exports = { resolveBuildEnvironment };
