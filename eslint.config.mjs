// @ts-check
/**
 * Strict guard-rails ESLint config for the LIBRARY (`src/`).
 *
 * The standalone demo has its own `demo/eslint.config.mjs` (its own tsconfigs
 * and module boundaries). This root config is scoped to `src/` only.
 *
 * Module-boundary scheme (eslint-plugin-boundaries), mirrored in
 * `.dependency-cruiser.cjs`:
 *   - `protocol` is a LEAF (types + registry; no react/dom runtime).
 *   - `iframe` and `host` each import `protocol` ONLY — never each other.
 *   - `style` lives under the iframe side (may import protocol + iframe).
 *   - `presence` is its own subpath (may import protocol + host geometry types
 *     via the public `./host` entry, expressed as the `host` element).
 *   - Public barrels (`src/*.ts`) may re-export from any element.
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
            "Deep relative import banned: import from a module's public entry, not across 2+ parent dirs.",
        },
      ],
    },
  ],
};

const BOUNDARY_ELEMENTS = [
  { type: "protocol", pattern: "src/protocol/**", mode: "file" },
  { type: "iframe", pattern: "src/iframe/**", mode: "file" },
  { type: "style", pattern: "src/style/**", mode: "file" },
  { type: "host", pattern: "src/host/**", mode: "file" },
  { type: "presence", pattern: "src/presence/**", mode: "file" },
  { type: "barrel", pattern: "src/*.ts", mode: "file" },
];

const BOUNDARY_POLICIES = [
  {
    from: { element: { type: "protocol" } },
    allow: { to: { element: { type: "protocol" } } },
  },
  {
    from: { element: { type: "iframe" } },
    allow: { to: { element: { types: { anyOf: ["protocol", "iframe"] } } } },
  },
  {
    from: { element: { type: "style" } },
    allow: {
      to: { element: { types: { anyOf: ["protocol", "iframe", "style"] } } },
    },
  },
  {
    from: { element: { type: "host" } },
    allow: { to: { element: { types: { anyOf: ["protocol", "host"] } } } },
  },
  {
    from: { element: { type: "presence" } },
    allow: {
      to: { element: { types: { anyOf: ["protocol", "host", "presence"] } } },
    },
  },
  {
    from: { element: { type: "barrel" } },
    allow: {
      to: {
        element: {
          types: {
            anyOf: ["protocol", "iframe", "style", "host", "presence"],
          },
        },
      },
    },
  },
];

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "demo/**",
      "orchestration/**",
      ".metis/**",
      ".playwright-mcp/**",
      "test-results/**",
      "**/*.config.*",
      "**/*.d.ts",
    ],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      boundaries,
      import: importPlugin,
      "@eslint-community/eslint-comments": eslintComments,
      "react-hooks": reactHooks,
    },
    settings: {
      "boundaries/elements": BOUNDARY_ELEMENTS,
      "boundaries/include": ["src/**/*"],
      // The `boundaries/elements` `mode` descriptor is deprecated in v7;
      // migrating it (e.g. to `mode: "folder"`) changes matching semantics and
      // is out of scope for this rule migration. Silence the residual descriptor
      // deprecation notice explicitly.
      "boundaries/legacy-warnings": false,
      "import/resolver": {
        typescript: { alwaysTryTypes: true, project: "./tsconfig.json" },
      },
    },
    rules: {
      ...SIZE_COMPLEXITY_RULES,
      ...ESCAPE_HATCH_RULES,
      ...IMPORT_RULES,
      ...reactHooks.configs.recommended.rules,
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          message:
            "Boundary violation: '${file.type}' may not import '${dependency.type}'. iframe and host must not import each other — go through ./protocol. Allowed edges are declared in eslint.config.mjs.",
          policies: BOUNDARY_POLICIES,
        },
      ],
      // `entry-point` keeps cross-element imports going through each module's
      // public entry. The library has mixed public entries (top-level `src/*.ts`
      // barrels plus a few in-folder index files), so a single entry-point glob
      // cannot cleanly cover every element; the authoritative enforcement here is
      // the `dependencies` EDGE policy above (which element may import which),
      // which is preserved 1:1 from the previous `element-types` rules.
      "boundaries/no-unknown-dependencies": "error",
    },
  },
  {
    files: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/__tests__/**",
      "src/**/testing/**",
      "src/**/fixtures.ts",
    ],
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "max-nested-callbacks": "off",
      // Integration tests exercise the assembled system through its public
      // barrels (e.g. `../../host.js`), so the production module-boundary and
      // deep-relative rules do not apply to them.
      "boundaries/dependencies": "off",
      "no-restricted-imports": "off",
    },
  },
);
