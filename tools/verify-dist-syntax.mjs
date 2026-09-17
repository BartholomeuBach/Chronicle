import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(repositoryRoot, "dist", "aidungeon");

/**
 * Parses each AI Dungeon artifact as standalone JavaScript, independently of
 * esbuild (which only proves esbuild's own emitter believes its output is
 * valid, not that a separate parser agrees). `node:vm`'s `Script` constructor
 * runs the same V8 parser Node itself uses; it is not `isolated-vm` (the
 * engine AI Dungeon's own sandbox reportedly uses), but it is the closest
 * independent, dependency-free V8 parse available locally, and a real bug in
 * our own emitted syntax -- as opposed to a platform-specific incompatibility
 * -- will surface as a parse failure here.
 *
 * Also parses Library.js concatenated with each modifier (with and without a
 * separating newline) -- this specific matrix was requested to test whether
 * something about the two scripts' actual boundary (rather than either file
 * in isolation) produces a syntax error under a JS parser, given AI Dungeon's
 * scripting model treats Library as shared code available to the other tabs.
 */
const scripts = ["Library", "Input", "Context", "Output"];

async function readScript(name) {
  return readFile(resolve(distDir, `${name}.js`), "utf8");
}

function parseOrThrow(label, code) {
  try {
    // eslint-disable-next-line no-new
    new Script(code, { filename: label });
  } catch (error) {
    throw new Error(`${label} failed to parse as standalone JavaScript: ${error.message}`);
  }
}

const sources = Object.fromEntries(
  await Promise.all(scripts.map(async (name) => [name, await readScript(name)]))
);

for (const name of scripts) {
  parseOrThrow(`${name}.js (standalone)`, sources[name]);
}

for (const modifier of ["Input", "Context", "Output"]) {
  parseOrThrow(`Library.js + ${modifier}.js (newline-joined)`, `${sources.Library}\n${sources[modifier]}`);
  parseOrThrow(`Library.js + ${modifier}.js (directly concatenated, no separator)`, `${sources.Library}${sources[modifier]}`);
}

console.log("AI Dungeon artifacts parse as standalone JavaScript, individually and concatenated with Library.");
