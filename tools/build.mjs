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
      format: "iife",
      target: "es2018",
      legalComments: "none",
      // Plain ASCII deliberately: this is the very first line of every pasted
      // artifact, and one non-ASCII character (previously an em dash) is one
      // more thing that could be mangled by a lossy copy/paste path. Purely a
      // defensive simplification -- see 05_known_limitations.md.
      banner: {
        js: `// Chronicle -- paste this file into the AI Dungeon ${name} script tab.`
      }
    })
  )
);
