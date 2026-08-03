/**
 * Fix Deno imports: Add .ts extensions to all relative imports.
 * Run: npx ts-node scripts/fix_imports.ts
 *
 * Deno requires explicit file extensions in imports.
 * This script adds .ts to all `from "../..."` imports that don't already have it.
 */

import * as fs from "fs";
import * as path from "path";

const targetDir = path.resolve(process.cwd(), "supabase/ai");

function walkDir(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else if (entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

// Regex: matches `from "../something"` or `from '../something'`
// but NOT `from "../something.ts"` or `from "../something.ts'`
const importRegex = /from\s+["'](\.\.[^"']*?)["']/g;

function fixImports(content: string): string {
  return content.replace(importRegex, (match, importPath) => {
    // Skip if already has .ts extension
    if (importPath.endsWith(".ts")) {
      return match;
    }
    // Add .ts extension
    const quote = match.includes('"') ? '"' : "'";
    return `from ${quote}${importPath}.ts${quote}`;
  });
}

const files = walkDir(targetDir);
let fixedCount = 0;

for (const file of files) {
  const content = fs.readFileSync(file, "utf-8");
  const fixed = fixImports(content);
  if (fixed !== content) {
    fs.writeFileSync(file, fixed, "utf-8");
    fixedCount++;
    console.log(`✓ Fixed: ${path.relative(targetDir, file)}`);
  }
}

console.log(`\n✅ Done! Fixed ${fixedCount} file(s) in ${targetDir}`);
