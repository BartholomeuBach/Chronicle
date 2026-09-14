import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const scripts = ["Library", "Input", "Context", "Output"];

await Promise.all(
  scripts.map(async (name) => {
    const output = await readFile(
      resolve(repositoryRoot, "dist", "aidungeon", `${name}.js`),
      "utf8"
    );
    if (output.includes("import ") || output.includes("require(")) {
      throw new Error(`${name}.js is not self-contained.`);
    }
    if (name !== "Library" && !output.includes("modifier(text);")) {
      throw new Error(`${name}.js does not invoke modifier(text).`);
    }
  })
);

console.log("AI Dungeon artifacts are self-contained and structurally valid.");
