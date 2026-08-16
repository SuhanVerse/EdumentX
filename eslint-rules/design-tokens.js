/**
 * EdumentX — design-token lint rules
 *
 * Two rules that keep the codebase on the design system defined in
 * `tailwind.config.js` / `src/constants/colors.ts`:
 *
 *  1. `no-raw-hex-placeholder` — `placeholderTextColor` must come from
 *     a token (`colors.text.muted` etc.), never a raw hex string.
 *     (Raw hexes rot: the sweep that replaced `#6B7268` and friends
 *     caught 6 stragglers after the "final" pass, which is exactly
 *     why this rule exists.)
 *
 *  2. `no-non-token-radius` — `className` values may only use the
 *     radius tokens from `tailwind.config.js`:
 *     `xs|sm|md|card|lg|xl|hero|pill` (with `-t/-b/-l/-r/-tl/...`
 *     partials). Tailwind defaults like `rounded-2xl` (16px),
 *     `rounded-3xl` (24px), `rounded-full`, bare `rounded` (4px), and
 *     any arbitrary `rounded-[…]` value are NOT tokens — `theme.extend`
 *     leaves them at framework defaults, so they silently drift off
 *     the documented scale.
 *
 *  3. `no-raw-hex-color-prop` — a `color="#…"` JSX prop (Ionicons,
 *     ActivityIndicator, …) must use a `colors.*` token. The July
 *     2026 sweep found 101 such props; `theme.extend` keeps Tailwind
 *     defaults alive but the app's palette lives only in
 *     `src/constants/colors.ts`.
 *
 *  4. `no-raw-hex-inline-color` — inline `style` objects may not set
 *     `backgroundColor` / `border*Color` to a raw hex; use a
 *     `colors.*` token. Pure black (`#000` / `#000000`) is exempt —
 *     that's the backdrop-scrim / shadow convention and no token
 *     exists for it. `shadowColor` is out of scope for the same
 *     reason.
 *
 *  5. `no-non-token-color-class` — `className` may not use Tailwind's
 *     DEFAULT palette shades (`text-slate-300`, `bg-blue-500`, …).
 *     Those fall back to framework defaults and silently drift off
 *     the palette in `tailwind.config.js`. The Aug 2026 UX audit
 *     caught the last offenders (`text-slate-300/400` on TutorCard's
 *     dark tone); the sanctioned dark-surface tones are now
 *     `text-glass-secondary` / `text-glass-muted`.
 *
 * All rules are non-fixable on purpose: picking the right token
 * (e.g. `colors.brand.accent` vs `colors.semantic.warning` for a
 * color, `rounded-card` vs `rounded-lg` for a surface) is a design
 * judgment, and replacing the value needs a `colors` import that an
 * autofix can't safely add.
 */

const RADIUS_TOKENS = ["xs", "sm", "md", "card", "lg", "xl", "hero", "pill"];

// `rounded-t-xl`, `rounded-bl-card`, `rounded-r-sm`, … — the optional
// `-t/-b/-l/-r` (1 letter) or `-tl/-tr/-bl/-br` (2 letters) side
// prefix followed by a token suffix.
const TOKEN_RADIUS_RE = new RegExp(
  `^rounded(-[trbl]{1,2})?-(?:${RADIUS_TOKENS.join("|")})$`,
);

/** Return the list of non-token radius classes found in a class string. */
function findNonTokenRadii(className) {
  const bad = [];
  for (const cls of String(className).split(/\s+/)) {
    if (!cls || !cls.startsWith("rounded")) continue;
    // Incomplete class (`rounded-${x}` across a template expression) —
    // not a real class, can't judge it.
    if (cls.endsWith("-")) continue;
    if (cls.includes("[")) {
      bad.push(cls); // arbitrary value — never a design token
      continue;
    }
    if (cls === "rounded") {
      bad.push(cls); // 4px Tailwind default — not a token
      continue;
    }
    if (!TOKEN_RADIUS_RE.test(cls)) bad.push(cls);
  }
  return bad;
}

/**
 * Recursively visit every string LITERAL in an expression subtree
 * (ternaries, logical chains, …). The codebase's real offender
 * pattern is a class inside a nested conditional — e.g.
 * `` className={`… ${dark ? "text-slate-300" : "text-text-secondary"}`} ``
 * — which lives in the template's EXPRESSION, not its static quasis.
 * A rule that only read the quasis would let those slip straight
 * back in.
 */
function visitStringLiterals(node, cb) {
  if (!node || typeof node !== "object") return;
  if (node.type === "Literal" && typeof node.value === "string") {
    cb(node.value);
    return;
  }
  for (const key of Object.keys(node)) {
    // Skip parser bookkeeping — parent pointers would loop forever.
    if (key === "parent" || key === "loc" || key === "range" || key === "start" || key === "end") continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) visitStringLiterals(item, cb);
    } else if (child && typeof child.type === "string") {
      visitStringLiterals(child, cb);
    }
  }
}

/**
 * Feed every class-bearing string in a className prop to `check`:
 * plain string literals, the static chunks of template literals, AND
 * the string literals nested inside template expressions. Shared by
 * the two className rules (radius + color-class) so they can't
 * diverge on template handling.
 */
function forEachClassNameString(node, cb) {
  const value = node.value;
  if (!value) return;
  // `` className={`…`} `` arrives wrapped in a
  // JSXExpressionContainer — unwrap before judging.
  const inner = value.type === "JSXExpressionContainer" ? value.expression : value;
  if (inner.type === "Literal" && typeof inner.value === "string") {
    cb(inner.value);
  } else if (inner.type === "TemplateLiteral") {
    for (const quasi of inner.quasis) {
      cb(quasi.value.cooked ?? "");
    }
    // Classes hidden inside ternaries/conditionals in the template
    // expressions — the audit's actual offender pattern.
    for (const expr of inner.expressions) {
      visitStringLiterals(expr, cb);
    }
  }
}

const noRawHexPlaceholder = {
  meta: {
    type: "problem",
    docs: {
      description:
        "placeholderTextColor must use a design token, not a raw hex value",
    },
    schema: [],
    messages: {
      rawHex:
        'Raw hex "{{hex}}" in placeholderTextColor — use a token from @/constants/colors (e.g. colors.text.muted).',
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.name !== "placeholderTextColor") return;
        const value = node.value;
        if (!value || value.type !== "Literal" || typeof value.value !== "string")
          return;
        if (/#[0-9a-fA-F]{3,8}\b/.test(value.value)) {
          context.report({
            node,
            messageId: "rawHex",
            data: { hex: value.value },
          });
        }
      },
    };
  },
};

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/;
const PURE_BLACK = new Set(["#000", "#000000"]);
// backgroundColor + every border*Color key (but NOT shadowColor —
// shadows are conventionally raw #000 and have no token).
const INLINE_COLOR_KEYS =
  /^(backgroundColor|border(Color|TopColor|BottomColor|LeftColor|RightColor))$/;

const noRawHexColorProp = {
  meta: {
    type: "problem",
    docs: {
      description:
        "color props (Ionicons, ActivityIndicator, …) must use a design token, not a raw hex value",
    },
    schema: [],
    messages: {
      rawHex:
        'Raw hex "{{hex}}" in a color prop — use a token from @/constants/colors (e.g. colors.brand.accent, colors.text.muted).',
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.name !== "color") return;
        const value = node.value;
        if (!value || value.type !== "Literal" || typeof value.value !== "string")
          return;
        if (HEX_RE.test(value.value)) {
          context.report({
            node,
            messageId: "rawHex",
            data: { hex: value.value },
          });
        }
      },
    };
  },
};

const noRawHexInlineColor = {
  meta: {
    type: "problem",
    docs: {
      description:
        "inline style backgroundColor / border*Color must use a design token, not a raw hex (pure black exempt)",
    },
    schema: [],
    messages: {
      rawHex:
        'Raw hex "{{hex}}" in inline style {{key}} — use a token from @/constants/colors (e.g. colors.background.surface, colors.brand.accent).',
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.name !== "style") return;
        const value = node.value;
        if (!value || value.type !== "JSXExpressionContainer") return;
        const expr = value.expression;
        if (!expr || expr.type !== "ObjectExpression") return;
        for (const prop of expr.properties) {
          if (prop.type !== "Property" || !prop.key || prop.computed) continue;
          const key =
            prop.key.type === "Identifier" ? prop.key.name : prop.key.value;
          if (typeof key !== "string" || !INLINE_COLOR_KEYS.test(key)) continue;
          const v = prop.value;
          if (!v || v.type !== "Literal" || typeof v.value !== "string") continue;
          if (PURE_BLACK.has(v.value.toLowerCase())) continue;
          if (HEX_RE.test(v.value)) {
            context.report({
              node: prop,
              messageId: "rawHex",
              data: { hex: v.value, key },
            });
          }
        }
      },
    };
  },
};

// Tailwind's DEFAULT color palettes (22 scales). The project's
// palette lives in tailwind.config.js and never uses these — a
// `<util>-<palette>-<shade>` class (e.g. `text-slate-300`) resolves
// to a framework default and drifts off the design system. Numeric
// shades (50..950) and arbitrary values are both framework defaults;
// the project's tokens are bare names (`amber`, `verification`) or
// `-light` / `-dark` / `-soft` / `-border` suffixes only.
const DEFAULT_PALETTES = [
  "slate", "gray", "zinc", "neutral", "stone",
  "red", "orange", "amber", "yellow", "lime", "green", "emerald",
  "teal", "cyan", "sky", "blue", "indigo", "violet", "purple",
  "fuchsia", "pink", "rose",
];

// Matches the TRAILING `-<palette>-<shade>` (numeric step or
// arbitrary value) of a class. Anchoring at the end keeps side-
// specific utilities (`border-t-slate-300`, `divide-slate-400`,
// `ring-offset-slate-100`) caught too, while classes like
// `bg-amber/10` (opacity modifier) and `text-white/70` (single
// color, not in the list) pass untouched.
const OFF_PALETTE_SHADE_RE = new RegExp(
  `-(?:${DEFAULT_PALETTES.join("|")})-(?:\\d{2,3}|\\[[^\\]]+\\])$`,
);

/** Return the off-palette shade classes found in a class string. */
function findOffPaletteClasses(className) {
  const bad = [];
  for (const cls of String(className).split(/\s+/)) {
    if (!cls) continue;
    // `text-slate-${x}` split across an expression — can't judge it.
    if (cls.endsWith("-")) continue;
    if (OFF_PALETTE_SHADE_RE.test(cls)) bad.push(cls);
  }
  return bad;
}

const noNonTokenColorClass = {
  meta: {
    type: "problem",
    docs: {
      description:
        "className may not use Tailwind default palette shades (text-slate-300, bg-blue-500, …) — use design tokens",
    },
    schema: [],
    messages: {
      offPalette:
        '"{{cls}}" is a Tailwind default palette shade — not a design token. Use a token from tailwind.config.js (dark surfaces: text-glass-secondary / text-glass-muted; light surfaces: text-text-secondary / text-text-muted; amber accents: text-amber).',
    },
  },
  create(context) {
    function check(node, text) {
      for (const cls of findOffPaletteClasses(text)) {
        context.report({
          node,
          messageId: "offPalette",
          data: { cls },
        });
      }
    }
    return {
      JSXAttribute(node) {
        if (!/className$/.test(node.name.name)) return;
        forEachClassNameString(node, (text) => check(node, text));
      },
    };
  },
};

const noNonTokenRadius = {
  meta: {
    type: "problem",
    docs: {
      description:
        "className radius classes must use design tokens (xs|sm|md|card|lg|xl|hero|pill), not Tailwind defaults or arbitrary values",
    },
    schema: [],
    messages: {
      nonToken:
        '"{{cls}}" is not a design-token radius — use one of {{tokens}} (e.g. rounded-card for cards, rounded-pill for pills, rounded-xl for large sheets).',
    },
  },
  create(context) {
    function check(node, text) {
      const bad = findNonTokenRadii(text);
      for (const cls of bad) {
        context.report({
          node,
          messageId: "nonToken",
          data: { cls, tokens: RADIUS_TOKENS.map((t) => `rounded-${t}`).join(", ") },
        });
      }
    }
    return {
      JSXAttribute(node) {
        if (!/className$/.test(node.name.name)) return;
        forEachClassNameString(node, (text) => check(node, text));
      },
    };
  },
};

module.exports = {
  rules: {
    "no-raw-hex-placeholder": noRawHexPlaceholder,
    "no-raw-hex-color-prop": noRawHexColorProp,
    "no-raw-hex-inline-color": noRawHexInlineColor,
    "no-non-token-radius": noNonTokenRadius,
    "no-non-token-color-class": noNonTokenColorClass,
  },
};
