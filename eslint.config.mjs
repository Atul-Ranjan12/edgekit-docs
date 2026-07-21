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
  ]),
  {
    rules: {
      // This is a prose-heavy docs site — apostrophes/quotes in copy are intentional
      // and readable in source; escaping them to &apos; hurts authoring more than it helps.
      "react/no-unescaped-entities": "off",
      // The nav components legitimately sync from external systems on mount / route change
      // (localStorage theme, DOM headings, drawer-close on navigation) — the canonical
      // "subscribe to an external system" effect the rule itself allows.
      "react-hooks/set-state-in-effect": "off",
      // Chart previews are theme-swapped static PNGs from /public; plain <img> is the right
      // tool (next/image can't CSS-swap two sources and needs loader config for static export).
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
