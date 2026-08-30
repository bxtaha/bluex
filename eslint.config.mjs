import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored audio worklets, copied verbatim from their packages by
    // `npm run worklets:sync` — see `scripts/sync-worklets.ts` for why they
    // are served from this origin. Linting them reports 240 warnings about
    // somebody else's minified build output, which buries our own.
    "public/worklets/**",
  ]),
]);

export default eslintConfig;
