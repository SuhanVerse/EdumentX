/**
 * EdumentX — Inline Markdown Renderer
 *
 * A dependency-free mini markdown renderer for chat bubbles. We
 * deliberately do NOT pull in `react-native-markdown-display` because:
 *   - It requires a native rebuild on Expo SDK 54 (extra CI time).
 *   - The assistant now emits only a tiny markdown subset (Fix E removed
 *     tutor-listing markdown from the response, so what's left is the
 *     short warm-tone intro and FAQ answers).
 *
 * Supported syntax:
 *   - **bold**           → bold text
 *   - *italic*           → italic text
 *   - `inline code`      → monospaced inline code
 *   - "- item" / "* item" → bullet item (one per line)
 *   - "1. item"          → numbered list (one per line)
 *   - "## Heading"       → bold, larger text
 *   - "\n\n"             → paragraph break
 *
 * Returns an array of `Text` + `View` fragments ready to embed inside a
 * parent `<View>`. Designed to be the ONLY child of an assistant bubble.
 *
 * The renderer is intentionally small (~150 lines) — extending it
 * should happen only when the assistant emits a new markdown shape.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/colors";

const T = StyleSheet.create({
  para: { fontSize: 16, lineHeight: 22, color: colors.text.primary },
  bold: { fontWeight: "700" as const },
  italic: { fontStyle: "italic" as const },
  code: {
    fontFamily: "monospace",
    backgroundColor: colors.background.surfaceMuted,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  heading: { fontSize: 17, fontWeight: "700" as const, marginTop: 4 },
  bulletRow: { flexDirection: "row" as const, alignItems: "flex-start" as const, marginVertical: 2 },
  bulletDot: { width: 14, color: colors.text.primary },
  bulletText: { flex: 1, fontSize: 16, lineHeight: 22, color: colors.text.primary },
});

/**
 * Tokenize a single string into inline segments (bold / italic / code / text).
 * Tokens are objects {text, kind} where kind ∈ "text"|"bold"|"italic"|"code".
 */
function tokenizeInline(text: string): { text: string; kind: string }[] {
  const tokens: { text: string; kind: string }[] = [];
  let i = 0;

  while (i < text.length) {
    const remaining = text.slice(i);

    // Inline code: `...`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push({ text: codeMatch[1], kind: "code" });
      i += codeMatch[0].length;
      continue;
    }

    // Bold: **...**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      tokens.push({ text: boldMatch[1], kind: "bold" });
      i += boldMatch[0].length;
      continue;
    }

    // Italic: *...* (single asterisk; bold was already consumed)
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      tokens.push({ text: italicMatch[1], kind: "italic" });
      i += italicMatch[0].length;
      continue;
    }

    // Plain text — collect up to the next special character.
    const next = remaining.search(/[`*]/);
    const plainLen = next === -1 ? remaining.length : next;
    tokens.push({ text: remaining.slice(0, plainLen), kind: "text" });
    i += plainLen;
  }

  // Collapse consecutive text tokens for cleanliness.
  const out: { text: string; kind: string }[] = [];
  for (const tok of tokens) {
    const prev = out[out.length - 1];
    if (prev && prev.kind === "text" && tok.kind === "text") {
      prev.text += tok.text;
    } else {
      out.push({ text: tok.text, kind: tok.kind });
    }
  }
  return out;
}

function InlineText({ text }: { text: string }) {
  const tokens = tokenizeInline(text);
  return (
    <Text style={T.para}>
      {tokens.map((tok, idx) => {
        if (tok.kind === "bold") return <Text key={idx} style={T.bold}>{tok.text}</Text>;
        if (tok.kind === "italic") return <Text key={idx} style={T.italic}>{tok.text}</Text>;
        if (tok.kind === "code") return <Text key={idx} style={T.code}>{tok.text}</Text>;
        return <Text key={idx}>{tok.text}</Text>;
      })}
    </Text>
  );
}

/**
 * Render a markdown string as a tree of React Native primitives.
 * Returns the rendered content; empty lines produce paragraph breaks.
 */
export function MarkdownText({ source }: { source: string }): React.ReactElement {
  // Split on blank lines for paragraph breaks; otherwise process line-by-line.
  const lines = source.split(/\r?\n/);

  const blocks: React.ReactElement[] = [];
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line — paragraph break
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Heading: "## Foo"
    const headingMatch = line.match(/^#{1,6}\s+(.*)$/);
    if (headingMatch) {
      blocks.push(<Text key={key++} style={T.heading}>{headingMatch[1]}</Text>);
      i++;
      continue;
    }

    // Bullet item: "- foo" or "* foo"
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (bulletMatch) {
      // Consume consecutive bullets so we render a contiguous list.
      const bullets: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^\s*[-*]\s+(.*)$/);
        if (!m) break;
        bullets.push(m[1]);
        i++;
      }
      blocks.push(
        <View key={key++}>
          {bullets.map((b, idx) => (
            <View key={idx} style={T.bulletRow}>
              <Text style={T.bulletDot}>•</Text>
              <View style={{ flex: 1 }}>
                <InlineText text={b} />
              </View>
            </View>
          ))}
        </View>,
      );
      continue;
    }

    // Numbered list: "1. foo"
    const numMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const items: string[] = [];
      let n = 1;
      while (i < lines.length) {
        const m = lines[i].match(/^\s*\d+\.\s+(.*)$/);
        if (!m) break;
        items.push(`${n}. ${m[1]}`);
        n++;
        i++;
      }
      blocks.push(
        <View key={key++}>
          {items.map((item, idx) => (
            <View key={idx} style={T.bulletRow}>
              <View style={{ flex: 1 }}>
                <InlineText text={item} />
              </View>
            </View>
          ))}
        </View>,
      );
      continue;
    }

    // Default: a single-line paragraph (or fold consecutive non-blank
    // non-list lines into one paragraph).
    const paraLines: string[] = [];
    while (i < lines.length) {
      const cur = lines[i];
      if (cur.trim() === "") break;
      if (/^\s*[-*]\s+/.test(cur)) break;
      if (/^\s*\d+\.\s+/.test(cur)) break;
      if (/^#{1,6}\s+/.test(cur)) break;
      paraLines.push(cur);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push(<InlineText key={key++} text={paraLines.join(" ")} />);
    }
  }

  return <View>{blocks}</View>;
}
