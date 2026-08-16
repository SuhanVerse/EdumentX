/**
 * Unit tests for the design-token ESLint rules
 * (`eslint-rules/design-tokens.js`).
 *
 * Uses Node's built-in `node:test` runner — zero dependencies, no
 * jest/vitest install. Mirrors the `scripts/*.ts` build flow:
 *
 *   npm run test:lint-rules
 *
 * These tests matter: the `no-non-token-radius` rule initially missed
 * classes inside `` className={`…`} `` template literals (JSX wraps
 * them in a `JSXExpressionContainer`), and only a fixture like the
 * ones below catches that regression.
 */

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

// eslint.config.js is CommonJS and eslint ships no TS types, so the
// runtime loads are require()-based (the compiled output runs under
// node's CJS loader).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Linter } = require("eslint") as {
  Linter: new (opts?: { configType?: "flat" }) => {
    verify: (
      code: string,
      config: unknown[],
      filename: string,
    ) => { ruleId: string | null; message: string; severity: number }[];
  };
};
// The compiled test runs from `dist/scripts/`, so a source-relative
// `require("../eslint-rules/…")` would resolve to `dist/eslint-rules`.
// Anchor to the repo root instead — npm scripts always run with cwd =
// the package root (locally and in CI).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { rules } = require(
  path.join(process.cwd(), "eslint-rules/design-tokens"),
) as { rules: Record<string, unknown> };

function lint(code: string): string[] {
  const linter = new Linter({ configType: "flat" });
  const messages = linter.verify(
    code,
    [
      {
        files: ["**/*.tsx"],
        plugins: { "design-tokens": { rules } },
        languageOptions: {
          ecmaVersion: 2020,
          sourceType: "module",
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        rules: {
          "design-tokens/no-raw-hex-placeholder": "error",
          "design-tokens/no-raw-hex-color-prop": "error",
          "design-tokens/no-raw-hex-inline-color": "error",
          "design-tokens/no-non-token-radius": "error",
        },
      },
    ],
    "test.tsx",
  );
  return messages
    .filter((m) => m.severity === 2 && m.ruleId?.startsWith("design-tokens/"))
    .map((m) => m.message);
}

describe("design-tokens/no-raw-hex-placeholder", () => {
  it("flags a raw hex placeholderTextColor", () => {
    const msgs = lint(
      '<TextInput placeholderTextColor="#6B7280" />',
    );
    assert.ok(
      msgs.some((m) => m.includes("Raw hex") && m.includes("#6B7280")),
      "expected the raw-hex report",
    );
  });

  it("accepts a token placeholderTextColor", () => {
    const msgs = lint(
      '<TextInput placeholderTextColor={colors.text.muted} />',
    );
    assert.deepEqual(msgs, []);
  });
});

describe("design-tokens/no-raw-hex-color-prop", () => {
  it("flags a raw hex in a color prop", () => {
    const msgs = lint('<Ionicons name="star" color="#E5A03B" />');
    assert.ok(msgs.some((m) => m.includes("#E5A03B")));
  });

  it("flags the off-palette hex that used to slip through", () => {
    const msgs = lint('<ActivityIndicator color="#6B7268" />');
    assert.ok(msgs.some((m) => m.includes("#6B7268")));
  });

  it("accepts a token color prop", () => {
    const msgs = lint(
      '<Ionicons name="star" color={colors.brand.accent} />',
    );
    assert.deepEqual(msgs, []);
  });
});

describe("design-tokens/no-raw-hex-inline-color", () => {
  it("flags a raw hex backgroundColor in an inline style", () => {
    const msgs = lint(
      '<View style={{ backgroundColor: "#F1ECE0" }} />',
    );
    assert.ok(msgs.some((m) => m.includes("#F1ECE0")));
  });

  it("flags raw hex border colors incl. single-quoted", () => {
    const msgs = lint(
      "<View style={{ borderBottomColor: '#E5A03B' }} />",
    );
    assert.ok(msgs.some((m) => m.includes("#E5A03B")));
  });

  it("exempts pure-black backdrop scrims", () => {
    const msgs = lint(
      '<View style={{ backgroundColor: "#000000" }} />',
    );
    assert.deepEqual(msgs, []);
  });

  it("does not flag shadowColor (conventionally raw #000)", () => {
    const msgs = lint(
      '<View style={{ shadowColor: "#000", shadowOpacity: 0.1 }} />',
    );
    assert.deepEqual(msgs, []);
  });

  it("accepts a token backgroundColor", () => {
    const msgs = lint(
      "<View style={{ backgroundColor: colors.background.surface }} />",
    );
    assert.deepEqual(msgs, []);
  });
});

describe("design-tokens/no-non-token-radius", () => {
  it("flags Tailwind-default radii in a literal className", () => {
    const msgs = lint(
      '<View className="rounded-2xl rounded-full rounded-t-3xl" />',
    );
    for (const cls of ["rounded-2xl", "rounded-full", "rounded-t-3xl"]) {
      assert.ok(
        msgs.some((m) => m.includes(`"${cls}"`)),
        `expected "${cls}" to be flagged`,
      );
    }
  });

  it("flags arbitrary-radius values", () => {
    const msgs = lint('<View className="rounded-[20px]" />');
    assert.ok(msgs.some((m) => m.includes("rounded-[20px]")));
  });

  it("flags a bad radius inside a template literal with expressions", () => {
    // Regression test: JSX wraps template attribute values in a
    // JSXExpressionContainer — the rule must unwrap it.
    const msgs = lint(
      '<View className={`rounded-2xl px-3.5 ${active ? "a" : "b"}`} />',
    );
    assert.ok(msgs.some((m) => m.includes("rounded-2xl")));
  });

  it("does not flag incomplete classes split across expressions", () => {
    const msgs = lint('<View className={`rounded-${size}`} />');
    assert.deepEqual(msgs, []);
  });

  it("accepts every token radius incl. partial variants", () => {
    const msgs = lint(
      '<View className="rounded-card rounded-pill rounded-t-xl rounded-b-lg rounded-l-md rounded-r-sm rounded-tl-xs rounded-br-hero" />',
    );
    assert.deepEqual(msgs, []);
  });
});
