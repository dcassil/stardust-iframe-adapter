// @ts-check
/**
 * Strict guard-rails ESLint config for the standalone DEMO consumer project.
 *
 * Module-boundary scheme (eslint-plugin-boundaries), mirrored in
 * `demo/.dependency-cruiser.cjs`:
 *   - `site` and `admin` are independent apps. `site` must NEVER import `admin`
 *     and `admin` must NEVER import `site` (and vice-versa) — no shared app
 *     internals.
 *   - Both may import `shared` (via the `@demo/shared/*` aliases) and the
 *     published `@stardust-cms/*` / `versioned-content-engine` packages.
 *   - `shared` is a LEAF: it may not import either app.
 *   - `e2e` is Playwright test code; it may import anything.
 */
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import boundaries from "eslint-plugin-boundaries";
import importPlugin from "eslint-plugin-import";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import reactHooks from "eslint-plugin-react-hooks";

const SIZE_COMPLEXITY_RULES = {
  "max-lines": ["error", { max: 200, skipBlankLines: true, skipComments: true }],
  "max-lines-per-function": [
    "error",
    { max: 80, skipBlankLines: true, skipComments: true },
  ],
  complexity: ["error", 12],
  "max-depth": ["error", 4],
  "max-params": ["error", 4],
  "max-nested-callbacks": ["error", 3],
};

const ESCAPE_HATCH_RULES = {
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-non-null-assertion": "error",
  "@typescript-eslint/ban-ts-comment": "error",
  "@eslint-community/eslint-comments/no-use": ["error", { allow: [] }],
};

const IMPORT_RULES = {
  "import/no-cycle": ["error", { maxDepth: Infinity }],
  "import/no-useless-path-segments": ["error", { noUselessIndex: true }],
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        {
          group: ["../../**", "../../../**"],
          message:
            "Deep relative import banned: import from a module's public entry (or the @demo/shared alias), not across 2+ parent dirs.",
        },
      ],
    },
  ],
};

const BOUNDARY_ELEMENTS = [
  { type: "shared", pattern: "demo/shared/**", mode: "file" },
  { type: "site", pattern: "demo/site/**", mode: "file" },
  { type: "admin", pattern: "demo/admin/**", mode: "file" },
  { type: "e2e", pattern: "demo/e2e/**", mode: "file" },
];

const BOUNDARY_RULES = [
  { from: ["shared"], allow: ["shared"] },
  { from: ["site"], allow: ["site", "shared"] },
  { from: ["admin"], allow: ["admin", "shared"] },
  { from: ["e2e"], allow: ["e2e", "shared", "site", "admin"] },
];

const typeAwareRules = {
  ...SIZE_COMPLEXITY_RULES,
  ...ESCAPE_HATCH_RULES,
  ...IMPORT_RULES,
  ...reactHooks.configs.recommended.rules,
  "boundaries/element-types": [
    "error",
    {
      default: "disallow",
      message:
        "Boundary violation: '{{file.type}}' may not import '{{dependency.type}}'. site and admin must not import each other; both go through @demo/shared. Allowed edges are declared in demo/eslint.config.mjs.",
      rules: BOUNDARY_RULES,
    },
  ],
  "boundaries/no-private": "error",
  "boundaries/no-unknown": "error",
};

/** Build a type-aware block for one demo sub-project's tsconfig. */
function projectBlock(files, project) {
  return {
    files,
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: { project, tsconfigRootDir: import.meta.dirname },
    },
    plugins: {
      boundaries,
      import: importPlugin,
      "@eslint-community/eslint-comments": eslintComments,
      "react-hooks": reactHooks,
    },
    settings: {
      "boundaries/elements": BOUNDARY_ELEMENTS,
      "boundaries/include": ["demo/**/*"],
      "import/resolver": {
        typescript: { alwaysTryTypes: true, project },
      },
    },
    rules: typeAwareRules,
  };
}

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "**/dist/**",
      "test-results/**",
      "**/*.config.*",
      "**/*.d.ts",
    ],
  },
  js.configs.recommended,
  // Loose TS (Playwright e2e + vitest setup) — parsed by the TS parser but not
  // type-checked (not part of any app tsconfig's program).
  {
    files: ["e2e/**/*.ts", "vitest.setup.ts"],
    extends: [...tseslint.configs.recommended],
  },
  projectBlock(["site/src/**/*.{ts,tsx}"], "./site/tsconfig.json"),
  projectBlock(["admin/src/**/*.{ts,tsx}"], "./admin/tsconfig.json"),
  projectBlock(["shared/src/**/*.{ts,tsx}"], "./shared/tsconfig.json"),
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.e2e.ts",
      "e2e/**",
      "vitest.setup.ts",
    ],
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "max-nested-callbacks": "off",
      "boundaries/element-types": "off",
      "no-restricted-imports": "off",
    },
  },
);
