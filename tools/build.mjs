import { build } from "esbuild";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const scripts = [
  ["Library", "src/aidungeon/library.ts"],
  ["Input", "src/aidungeon/input.ts"],
  ["Context", "src/aidungeon/context.ts"],
  ["Output", "src/aidungeon/output.ts"]
];

await Promise.all(
  scripts.map(([name, entryPoint]) =>
    build({
      entryPoints: [resolve(repositoryRoot, entryPoint)],
      outfile: resolve(repositoryRoot, "dist", "aidungeon", `${name}.js`),
      bundle: true,
      // AI Dungeon requires the final line of every modifier tab to be the
      // direct `modifier(text)` invocation. An IIFE would add a closing
      // `})();` after that call, which the Script Test kernel rejects. The
      // Library has no modifier entry point and remains safely encapsulated.
      format: name === "Library" ? "iife" : "esm",
      target: "es2018",
      legalComments: "none",
      // Plain ASCII deliberately: this is the very first line of every pasted
      // artifact, and one non-ASCII character (previously an em dash) is one
      // more thing that could be mangled by a lossy copy/paste path. Purely a
      // defensive simplification -- see 05_known_limitations.md.
      banner: {
        js: `// Chronicle -- paste this file into the AI Dungeon ${name} script tab.${name === "Context" ? "\n// @cache-compatible" : ""}`
      }
    })
  )
);
