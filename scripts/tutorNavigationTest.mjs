import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const sourceUrl = new URL("../src/components/domain/TutorBottomBar.tsx", import.meta.url);
const compiled = ts.transpileModule(readFileSync(sourceUrl, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
  },
}).outputText;

// Invoke the actual tab handler with native rendering and routing substituted.
function pressTab(pathname, target, visuallyActive) {
  const replacements = [];
  const exports = {};
  const element = (type, props) => ({ type, props });
  const icon = () => null;
  const imports = {
    "expo-router": {
      usePathname: () => pathname,
      router: { replace: path => replacements.push(path), push: () => assert.fail("Tabs must replace, not push") },
    },
    "react": {},
    "react/jsx-runtime": { jsx: element, jsxs: element },
    "react-native": { View: "View", Text: "Text" },
    "react-native-reanimated": { __esModule: true, default: { createAnimatedComponent: type => type } },
    "react-native-safe-area-context": {},
    "lucide-react-native": { LayoutDashboard: icon, Inbox: icon, Users: icon, User: icon },
    "@/components/motion": { AnimatedPressable: "Pressable", usePressScale: () => ({}) },
    "@/lib/motion": { motion: {} },
    "@/constants/colors": { colors: { brand: { accent: "accent" }, semantic: { warningText: "warningText" }, text: { muted: "muted", inverse: "inverse" } } },
  };
  runInNewContext(`${compiled}\nexports.renderTab = TutorTab;`, {
    exports,
    require: name => {
      assert.ok(Object.hasOwn(imports, name), `Unexpected runtime dependency: ${name}`);
      return imports[name];
    },
  });
  const tab = exports.renderTab({ tab: { key: "dashboard", label: "Home", path: target, icon }, active: visuallyActive, inboxBadgeCount: 0 });
  tab.props.onPress();
  return replacements;
}

test("Home remains reachable from a nested screen visually grouped under Home", () => {
  assert.deepEqual(pressTab("/tutor-capacity", "/tutor-home", true), ["/tutor-home"]);
});

test("pressing the actual current tab does not add a route", () => {
  assert.deepEqual(pressTab("/tutor-home", "/tutor-home", true), []);
});

test("switching tabs replaces the current route", () => {
  assert.deepEqual(pressTab("/tutor-home", "/tutor-inbox", false), ["/tutor-inbox"]);
});
