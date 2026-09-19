import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const guideFiles = ["README.md", "INSTALL.md"];
const artifactNames = ["Library", "Input", "Context", "Output"];
const artifactBaseUrl = "https://github.com/BartholomeuBach/Chronicle/blob/main/dist/aidungeon";

/**
 * Installers copy the four committed dist artifacts directly from GitHub.
 * Keeping JavaScript snippets in rendered Markdown created a second,
 * copy-error-prone distribution channel: a stray Markdown fence could make
 * AI Dungeon report "Unexpected end of input", and a hand-edited snippet
 * could drift from the committed artifact. This check makes the direct-link
 * route explicit in both public guides and rejects the retired embed markers.
 *
 * Artifact freshness itself remains guarded separately by verify:dist:fresh.
 */
let invalidGuide = false;

for (const relativePath of guideFiles) {
  const content = await readFile(resolve(repositoryRoot, relativePath), "utf8");

  if (content.includes("chronicle:dist-embed:")) {
    console.error(`${relativePath}: retired chronicle:dist-embed marker found.`);
    invalidGuide = true;
  }

  for (const name of artifactNames) {
    const expectedUrl = `${artifactBaseUrl}/${name}.js`;
    if (!content.includes(expectedUrl)) {
      console.error(`${relativePath}: missing canonical ${name}.js install link.`);
      invalidGuide = true;
    }
  }
}

if (invalidGuide) {
  process.exit(1);
}

console.log("README.md and INSTALL.md link only to the four canonical AI Dungeon artifacts.");
