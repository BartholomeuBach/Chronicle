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
      banner: {
        js: `// Chronicle — paste this file into the AI Dungeon ${name} script tab.`
      }
    })
  )
);
